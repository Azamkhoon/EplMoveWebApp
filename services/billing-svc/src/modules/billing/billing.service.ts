import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Invoice, Events } from "@epl/contracts";
import { enqueueOutbox, makeEvent, type EventBus } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

interface CreateFromBid {
  tenantId: string;
  loadId: string;
  quoteId: string;
  reference: string;
  carrierName: string;
  amount: number;
  currency: string;
  correlationId: string;
}

@Injectable()
export class BillingService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query("SET LOCAL search_path TO billing, public");
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

  private rowToInvoice(r: Record<string, any>): Invoice {
    return Invoice.parse({
      id: r.id,
      tenantId: r.tenant_id,
      number: r.number,
      status: r.status,
      loadId: r.load_id,
      quoteId: r.quote_id,
      shipmentId: r.shipment_id,
      reference: r.reference,
      carrierName: r.carrier_name,
      amount: { amount: Number(r.amount), currency: r.currency },
      issuedAt: r.issued_at ? new Date(r.issued_at).toISOString() : null,
      dueAt: r.due_at ? new Date(r.due_at).toISOString() : null,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  /** Next per-tenant invoice number, e.g. INV-2026-0001. */
  private async nextNumber(c: PoolClient, tenantId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const { rows } = await c.query(
      `INSERT INTO billing.counters (tenant_id, year, seq) VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET seq = billing.counters.seq + 1
       RETURNING seq`,
      [tenantId, year],
    );
    const seq = Number(rows[0].seq);
    return `INV-${year}-${String(seq).padStart(4, "0")}`;
  }

  /**
   * Idempotently raise an invoice from an accepted bid (called by the consumer).
   * Returns null if the event was already processed or the quote already billed.
   */
  async createFromBid(eventId: string, input: CreateFromBid, bus: EventBus): Promise<Invoice | null> {
    return this.tx(input.tenantId, async (c) => {
      const dedupe = await c.query(
        `INSERT INTO billing.processed_events (event_id) VALUES ($1)
         ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [eventId],
      );
      if (dedupe.rowCount === 0) return null;

      const number = await this.nextNumber(c, input.tenantId);
      const now = new Date();
      const due = new Date(now.getTime() + config.PAYMENT_TERMS_DAYS * 86400_000);
      const { rows } = await c.query(
        `INSERT INTO billing.invoices
          (tenant_id, number, status, load_id, quote_id, reference, carrier_name, amount, currency, issued_at, due_at)
         VALUES ($1,$2,'issued',$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (quote_id) DO NOTHING
         RETURNING *`,
        [
          input.tenantId, number, input.loadId, input.quoteId, input.reference,
          input.carrierName, input.amount, input.currency, now, due,
        ],
      );
      if (rows.length === 0) return null; // already billed
      const invoice = this.rowToInvoice(rows[0]);

      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.billing,
        orderingKey: invoice.id,
        event: makeEvent({
          type: Events.BillingEventType.InvoiceIssued,
          tenantId: input.tenantId,
          actor: { userId: null, role: "system" },
          correlationId: input.correlationId,
          payload: { invoice } satisfies Events.InvoiceIssuedPayload,
        }),
      });
      return invoice;
    });
  }

  async list(ctx: Pick<RequestContext, "tenantId">): Promise<Invoice[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM billing.invoices ORDER BY created_at DESC`);
      return rows.map((r) => this.rowToInvoice(r));
    });
  }

  async get(ctx: Pick<RequestContext, "tenantId">, id: string): Promise<Invoice> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM billing.invoices WHERE id = $1`, [id]);
      if (rows.length === 0) throw new NotFoundException("invoice not found");
      return this.rowToInvoice(rows[0]);
    });
  }

  async pay(ctx: Pick<RequestContext, "tenantId">, id: string): Promise<Invoice> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `UPDATE billing.invoices SET status='paid', paid_at=now()
         WHERE id=$1 AND status <> 'void' RETURNING *`,
        [id],
      );
      if (rows.length === 0) throw new NotFoundException("invoice not found");
      return this.rowToInvoice(rows[0]);
    });
  }
}
