import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import {
  CreateDocumentRequestInput,
  DocumentRequest,
  Events,
  ReviewDocumentRequestInput,
  ShipmentDocument,
  UploadDocumentInput,
} from "@epl/contracts";
import { enqueueOutbox, makeEvent } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";
import { createStorage } from "./storage";
import { ShipmentClient } from "./shipment.client";

type Ctx = Pick<RequestContext, "userId" | "tenantId" | "role" | "correlationId">;

@Injectable()
export class DocumentService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  private readonly storage = createStorage();

  constructor(private readonly shipments: ShipmentClient) {}

  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query("SET LOCAL search_path TO doc, public");
      const out = await fn(c);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }

  private rowToDoc(r: Record<string, any>): ShipmentDocument {
    return ShipmentDocument.parse({
      id: r.id,
      tenantId: r.tenant_id,
      shipmentId: r.shipment_id ?? undefined,
      documentRequestId: r.document_request_id ?? undefined,
      brokerTenantId: r.broker_tenant_id ?? null,
      carrierTenantId: r.carrier_tenant_id ?? null,
      loadId: r.load_id ?? undefined,
      type: r.type,
      name: r.name,
      sizeBytes: Number(r.size_bytes),
      contentType: r.content_type,
      status: r.status,
      storageKey: r.storage_key,
      uploadedBy: r.uploaded_by,
      uploadedAt: new Date(r.uploaded_at).toISOString(),
      amount: r.amount != null ? Number(r.amount) : undefined,
      currency: r.currency ?? undefined,
    });
  }

  private rowToRequest(r: Record<string, any>): DocumentRequest {
    return DocumentRequest.parse({
      id: r.id,
      shipmentId: r.shipment_id,
      shipmentReference: r.shipment_reference,
      brokerId: r.broker_tenant_id,
      brokerName: r.broker_name,
      shipperId: r.tenant_id,
      documentType: r.document_type,
      title: r.title,
      description: r.description ?? undefined,
      status: r.status,
      required: r.required,
      dueDate: r.due_date ? new Date(r.due_date).toISOString() : undefined,
      comment: r.comment ?? undefined,
      documentId: r.document_id ?? undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    });
  }

  async upload(ctx: Ctx, body: unknown): Promise<ShipmentDocument> {
    const input = UploadDocumentInput.parse(body);
    const request = input.documentRequestId
      ? await this.getRequest(ctx, input.documentRequestId)
      : null;
    const shipmentAccess = !request && input.shipmentId
      ? await this.shipments.access(input.shipmentId, ctx.tenantId, ctx.role)
      : null;
    if (input.shipmentId && !request && !shipmentAccess) {
      throw new ForbiddenException("shipment is not accessible to this company");
    }
    if (request && request.shipperId !== ctx.tenantId) {
      throw new ForbiddenException("only the shipper can fulfill this request");
    }
    if (request && !["REQUESTED", "VIEWED", "REVISION_REQUIRED"].includes(request.status)) {
      throw new ConflictException(`request cannot be uploaded in status ${request.status}`);
    }
    const contentType = input.contentType ?? "application/pdf";
    const data = input.contentBase64
      ? Buffer.from(input.contentBase64, "base64")
      : Buffer.alloc(0);
    const sizeBytes = input.contentBase64 ? data.length : (input.sizeBytes ?? 0);
    const ownerTenantId = request?.shipperId ?? shipmentAccess?.shipperTenantId ?? ctx.tenantId;
    const brokerTenantId = request?.brokerId ?? shipmentAccess?.brokerTenantId ?? null;
    const carrierTenantId = shipmentAccess?.carrierTenantId ?? null;
    const storageKey = `${ownerTenantId}/${crypto.randomUUID()}-${input.name}`;

    await this.storage.put(storageKey, data, contentType);

    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO doc.documents
          (tenant_id, shipment_id, document_request_id, broker_tenant_id, carrier_tenant_id, load_id, type,
           name, size_bytes, content_type, status, storage_key, amount, currency, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13,$14) RETURNING *`,
        [
          ownerTenantId,
          request?.shipmentId ?? input.shipmentId ?? null,
          request?.id ?? null,
          brokerTenantId,
          carrierTenantId,
          input.loadId ?? null,
          request?.documentType ?? input.type,
          input.name,
          sizeBytes,
          contentType,
          storageKey,
          input.amount ?? null,
          input.currency ?? null,
          ctx.userId,
        ],
      );
      const doc = this.rowToDoc(rows[0]);
      if (request) {
        await c.query(
          `UPDATE doc.document_requests
              SET status='UPLOADED', document_id=$2, updated_at=now()
            WHERE id=$1`,
          [request.id, doc.id],
        );
      }
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.doc,
        orderingKey: doc.shipmentId ?? doc.id,
        event: makeEvent({
          type: Events.DocEventType.Uploaded,
          tenantId: ownerTenantId,
          correlationId: ctx.correlationId,
          payload: {
            document: doc,
            requestId: request?.id,
            targetTenantId: request?.brokerId,
          },
        }),
      });
      return doc;
    });
  }

  async createRequest(ctx: Ctx, body: unknown): Promise<DocumentRequest> {
    if (!ctx.role.startsWith("broker_")) {
      throw new ForbiddenException("only an assigned broker can request documents");
    }
    const input = CreateDocumentRequestInput.parse(body);
    const access = await this.shipments.access(input.shipmentId, ctx.tenantId, ctx.role);
    if (!access || access.brokerTenantId !== ctx.tenantId) {
      throw new ForbiddenException("broker is not assigned to this shipment");
    }
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO doc.document_requests
          (shipment_id, shipment_reference, tenant_id, broker_tenant_id, broker_user_id,
           broker_name, document_type, title, description, required, due_date, comment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          input.shipmentId,
          access.reference,
          access.shipperTenantId,
          ctx.tenantId,
          ctx.userId,
          access.brokerName ?? "Customs Broker",
          input.documentType,
          input.title,
          input.description ?? null,
          input.required,
          input.dueDate ?? null,
          input.comment ?? null,
        ],
      );
      const request = this.rowToRequest(rows[0]);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.doc,
        orderingKey: request.shipmentId,
        event: makeEvent({
          type: Events.DocEventType.Requested,
          tenantId: request.shipperId,
          actor: { userId: ctx.userId, role: ctx.role },
          correlationId: ctx.correlationId,
          payload: { request, targetTenantId: request.shipperId },
        }),
      });
      return request;
    });
  }

  async listRequests(ctx: Ctx, shipmentId?: string): Promise<DocumentRequest[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const params: unknown[] = [];
      const where = shipmentId ? (params.push(shipmentId), "WHERE shipment_id=$1") : "";
      if (ctx.role.startsWith("shipper_")) {
        await c.query(
          `UPDATE doc.document_requests SET status='VIEWED', updated_at=now()
            WHERE status='REQUESTED' ${shipmentId ? "AND shipment_id=$1" : ""}`,
          params,
        );
      } else if (ctx.role.startsWith("broker_")) {
        await c.query(
          `UPDATE doc.document_requests SET status='UNDER_REVIEW', updated_at=now()
            WHERE status='UPLOADED' ${shipmentId ? "AND shipment_id=$1" : ""}`,
          params,
        );
      }
      const { rows } = await c.query(
        `SELECT * FROM doc.document_requests ${where} ORDER BY created_at DESC LIMIT 200`,
        params,
      );
      return rows.map((row) => this.rowToRequest(row));
    });
  }

  async getRequest(ctx: Ctx, id: string): Promise<DocumentRequest> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM doc.document_requests WHERE id=$1`, [id]);
      if (!rows[0]) throw new NotFoundException("document request not found");
      return this.rowToRequest(rows[0]);
    });
  }

  async reviewRequest(ctx: Ctx, id: string, body: unknown): Promise<DocumentRequest> {
    if (!ctx.role.startsWith("broker_")) {
      throw new ForbiddenException("only the assigned broker can review documents");
    }
    const input = ReviewDocumentRequestInput.parse(body);
    return this.tx(ctx.tenantId, async (c) => {
      const current = await c.query(`SELECT * FROM doc.document_requests WHERE id=$1`, [id]);
      if (!current.rows[0]) throw new NotFoundException("document request not found");
      const existing = this.rowToRequest(current.rows[0]);
      if (existing.brokerId !== ctx.tenantId) {
        throw new ForbiddenException("broker is not assigned to this request");
      }
      if (!existing.documentId) throw new ConflictException("no uploaded document to review");
      const { rows } = await c.query(
        `UPDATE doc.document_requests
            SET status=$2, comment=COALESCE($3, comment), updated_at=now()
          WHERE id=$1 RETURNING *`,
        [id, input.status, input.comment ?? null],
      );
      await c.query(
        `UPDATE doc.documents SET status=$2 WHERE id=$1`,
        [
          existing.documentId,
          input.status === "APPROVED"
            ? "verified"
            : input.status === "REJECTED"
              ? "rejected"
              : "pending",
        ],
      );
      const request = this.rowToRequest(rows[0]);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.doc,
        orderingKey: request.shipmentId,
        event: makeEvent({
          type: Events.DocEventType.RequestReviewed,
          tenantId: request.shipperId,
          actor: { userId: ctx.userId, role: ctx.role },
          correlationId: ctx.correlationId,
          payload: { request, targetTenantId: request.shipperId },
        }),
      });
      return request;
    });
  }

  async list(ctx: Ctx, opts: { shipmentId?: string; type?: string }): Promise<ShipmentDocument[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const params: unknown[] = [];
      const where: string[] = [];
      if (opts.shipmentId) {
        params.push(opts.shipmentId);
        where.push(`shipment_id = $${params.length}`);
      }
      if (opts.type) {
        params.push(opts.type);
        where.push(`type = $${params.length}`);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const { rows } = await c.query(
        `SELECT * FROM doc.documents ${clause} ORDER BY uploaded_at DESC LIMIT 200`,
        params,
      );
      return rows.map((r) => this.rowToDoc(r));
    });
  }

  async get(ctx: Ctx, id: string): Promise<ShipmentDocument> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM doc.documents WHERE id = $1`, [id]);
      if (!rows[0]) throw new NotFoundException("document not found");
      return this.rowToDoc(rows[0]);
    });
  }

  /** Download: returns the binary + metadata (RLS already scoped the row). */
  async download(ctx: Ctx, id: string): Promise<{ doc: ShipmentDocument; data: Buffer }> {
    const doc = await this.get(ctx, id);
    const data = await this.storage.get(doc.storageKey);
    return { doc, data };
  }

  async verify(ctx: Ctx, id: string): Promise<ShipmentDocument> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `UPDATE doc.documents SET status='verified' WHERE id=$1 RETURNING *`,
        [id],
      );
      if (!rows[0]) throw new NotFoundException("document not found");
      const doc = this.rowToDoc(rows[0]);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.doc,
        orderingKey: doc.shipmentId ?? doc.id,
        event: makeEvent({
          type: Events.DocEventType.Verified,
          tenantId: ctx.tenantId,
          correlationId: ctx.correlationId,
          payload: { document: doc },
        }),
      });
      return doc;
    });
  }

  /** Delivery confirmation = upload a Proof of Delivery document. */
  confirmDelivery(ctx: Ctx, shipmentId: string, name = "POD.pdf"): Promise<ShipmentDocument> {
    return this.upload(ctx, {
      shipmentId,
      type: "Proof of Delivery",
      name,
      contentType: "application/pdf",
      sizeBytes: 0,
    });
  }
}
