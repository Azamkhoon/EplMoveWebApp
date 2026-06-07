import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { ShipmentDocument, UploadDocumentInput, Events } from "@epl/contracts";
import { enqueueOutbox, makeEvent } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";
import { createStorage } from "./storage";

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

  async upload(ctx: Ctx, body: unknown): Promise<ShipmentDocument> {
    const input = UploadDocumentInput.parse(body);
    const contentType = input.contentType ?? "application/pdf";
    const data = input.contentBase64
      ? Buffer.from(input.contentBase64, "base64")
      : Buffer.alloc(0);
    const sizeBytes = input.contentBase64 ? data.length : (input.sizeBytes ?? 0);
    const storageKey = `${ctx.tenantId}/${crypto.randomUUID()}-${input.name}`;

    await this.storage.put(storageKey, data, contentType);

    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO doc.documents
          (tenant_id, shipment_id, load_id, type, name, size_bytes, content_type, status,
           storage_key, amount, currency, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11) RETURNING *`,
        [
          ctx.tenantId, input.shipmentId ?? null, input.loadId ?? null, input.type, input.name,
          sizeBytes, contentType, storageKey, input.amount ?? null, input.currency ?? null, ctx.userId,
        ],
      );
      const doc = this.rowToDoc(rows[0]);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.doc,
        orderingKey: doc.shipmentId ?? doc.id,
        event: makeEvent({
          type: Events.DocEventType.Uploaded,
          tenantId: ctx.tenantId,
          correlationId: ctx.correlationId,
          payload: { document: doc },
        }),
      });
      return doc;
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
