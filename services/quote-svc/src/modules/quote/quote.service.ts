import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import {
  Quote,
  Bid,
  CreateQuoteInput,
  SubmitBidInput,
  CarrierBidInput,
  Events,
  type Carrier,
  type MarketplaceQuote,
  type CarrierBid,
} from "@epl/contracts";

type CarrierBidRow = CarrierBid;
import { enqueueOutbox, makeEvent } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";
import { CarrierClient } from "./carrier.client";

type Ctx = Pick<RequestContext, "userId" | "tenantId" | "role" | "correlationId">;

@Injectable()
export class QuoteService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  constructor(private readonly carriers: CarrierClient) {}

  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query("SET LOCAL search_path TO quote, public");
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

  private rowToBid(r: Record<string, any>): Bid {
    return Bid.parse({
      id: r.id,
      tenantId: r.tenant_id,
      quoteId: r.quote_id,
      carrierId: r.carrier_id,
      mode: r.mode,
      price: { amount: Number(r.price_amount), currency: r.price_currency },
      transitDays: Number(r.transit_days),
      co2Kg: r.co2_kg != null ? Number(r.co2_kg) : undefined,
      validUntil: r.valid_until ? new Date(r.valid_until).toISOString() : undefined,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  private rowToQuote(r: Record<string, any>, bids?: Bid[]): Quote {
    return Quote.parse({
      id: r.id,
      tenantId: r.tenant_id,
      loadId: r.load_id,
      reference: r.reference,
      status: r.status,
      mode: r.mode,
      createdBy: r.created_by,
      createdAt: new Date(r.created_at).toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
      bids,
    });
  }

  // ── Create a quote request for a load ──
  async create(ctx: Ctx, body: unknown): Promise<Quote> {
    const input = CreateQuoteInput.parse(body);
    const quote = await this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO quote.quotes (tenant_id, load_id, reference, mode, created_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, load_id) DO UPDATE SET status='open'
         RETURNING *`,
        [ctx.tenantId, input.loadId, input.reference, input.mode, ctx.userId, input.expiresAt ?? null],
      );
      const q = this.rowToQuote(rows[0]);
      await this.emit(c, ctx, Events.QuoteEventType.Requested, q.id, {
        quoteId: q.id,
        loadId: q.loadId,
        reference: q.reference,
      });
      return q;
    });

    if (config.AUTO_BID) await this.generateDemoBids(ctx, quote);
    return this.getById(ctx, quote.id);
  }

  // ── List quotes / get one with bids (enriched with carrier summaries) ──
  async list(ctx: Ctx): Promise<Quote[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM quote.quotes ORDER BY created_at DESC LIMIT 100`);
      return rows.map((r) => this.rowToQuote(r));
    });
  }

  async getById(ctx: Ctx, id: string): Promise<Quote> {
    const { quote, bids } = await this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM quote.quotes WHERE id = $1`, [id]);
      if (!rows[0]) throw new NotFoundException("quote not found");
      const { rows: bidRows } = await c.query(
        `SELECT * FROM quote.bids WHERE quote_id = $1 ORDER BY price_amount ASC`,
        [id],
      );
      return { quote: rows[0], bids: bidRows.map((b) => this.rowToBid(b)) };
    });

    const summaries = await this.carriers.summaries(bids.map((b) => b.carrierId));
    const enriched = bids.map((b) => ({ ...b, carrier: summaries[b.carrierId] }));
    return this.rowToQuote(quote, enriched);
  }

  // ── Submit a bid (carrier action; also used by demo generator) ──
  async submitBid(ctx: Ctx, quoteId: string, body: unknown): Promise<Bid> {
    const input = SubmitBidInput.parse(body);
    return this.tx(ctx.tenantId, async (c) => {
      const { rows: q } = await c.query(`SELECT * FROM quote.quotes WHERE id = $1`, [quoteId]);
      if (!q[0]) throw new NotFoundException("quote not found");
      if (q[0].status !== "open") throw new ConflictException("quote is not open");
      const { rows } = await c.query(
        `INSERT INTO quote.bids
           (tenant_id, quote_id, carrier_id, mode, price_amount, price_currency, transit_days, co2_kg, valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          ctx.tenantId, quoteId, input.carrierId, input.mode, input.price.amount,
          input.price.currency, input.transitDays, input.co2Kg ?? null, input.validUntil ?? null,
        ],
      );
      const bid = this.rowToBid(rows[0]);
      await this.emit(c, ctx, Events.QuoteEventType.BidSubmitted, quoteId, { bid });
      return bid;
    });
  }

  // ── Accept a bid → award quote, emit bid.accepted (shipment-svc consumes) ──
  async acceptBid(ctx: Ctx, quoteId: string, bidId: string): Promise<Quote> {
    await this.tx(ctx.tenantId, async (c) => {
      const { rows: q } = await c.query(`SELECT * FROM quote.quotes WHERE id = $1`, [quoteId]);
      if (!q[0]) throw new NotFoundException("quote not found");
      if (q[0].status === "awarded") throw new ConflictException("quote already awarded");

      const { rows: b } = await c.query(
        `SELECT * FROM quote.bids WHERE id = $1 AND quote_id = $2`,
        [bidId, quoteId],
      );
      if (!b[0]) throw new NotFoundException("bid not found");

      await c.query(`UPDATE quote.bids SET status='accepted' WHERE id=$1`, [bidId]);
      await c.query(`UPDATE quote.bids SET status='rejected' WHERE quote_id=$1 AND id<>$2`, [quoteId, bidId]);
      await c.query(`UPDATE quote.quotes SET status='awarded' WHERE id=$1`, [quoteId]);

      const acceptedBid = this.rowToBid(b[0]);
      // Enrich with the carrier summary so downstream consumers (shipment-svc,
      // billing-svc, notify-svc) get the real carrier name, not a fallback.
      const summaries = await this.carriers.summaries([acceptedBid.carrierId]);
      const enrichedBid = { ...acceptedBid, carrier: summaries[acceptedBid.carrierId] };
      await this.emit(c, ctx, Events.QuoteEventType.BidAccepted, quoteId, {
        quoteId,
        loadId: q[0].load_id,
        reference: q[0].reference,
        bid: enrichedBid,
      });
    });
    return this.getById(ctx, quoteId);
  }

  // ════════════════════ Carrier marketplace (two-sided) ════════════════════
  //
  // Carrier requests run with app.marketplace='on' (NOT pinned to the carrier's
  // own tenant), which the permissive marketplace_* RLS policies key off. This
  // lets carriers read OPEN quotes across all shipper tenants and insert a bid,
  // while every shipper-side path stays tenant-isolated.

  private async marketplaceTx<T>(callerTenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.marketplace', 'on', true)");
      // Pin app.tenant_id to a VALID uuid (the carrier's own tenant). A pooled
      // connection that previously ran tx() has session app.tenant_id = ''
      // (Postgres resets an undefined custom GUC to empty, not NULL), and the
      // tenant_isolation policy would otherwise evaluate ''::uuid and throw.
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [callerTenantId]);
      await c.query("SET LOCAL search_path TO quote, public");
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

  /** Open quotes across all shippers (carrier marketplace), with bid stats. */
  async listOpenQuotes(ctx: Ctx): Promise<MarketplaceQuote[]> {
    return this.marketplaceTx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT q.id, q.reference, q.mode, q.created_at, q.expires_at,
                count(b.id)::int                                 AS bid_count,
                count(b.id) FILTER (WHERE b.carrier_id = $1)::int AS my_bid_count,
                min(b.price_amount)                              AS best_price
           FROM quote.quotes q
           LEFT JOIN quote.bids b ON b.quote_id = q.id
          WHERE q.status = 'open'
          GROUP BY q.id
          ORDER BY q.created_at DESC
          LIMIT 100`,
        [ctx.tenantId],
      );
      return rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        mode: r.mode,
        createdAt: new Date(r.created_at).toISOString(),
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
        bidCount: r.bid_count,
        myBidCount: r.my_bid_count,
        bestPrice: r.best_price != null ? Number(r.best_price) : undefined,
      }));
    });
  }

  /** Carrier submits a bid on an open quote. carrier_id = carrier's tenantId. */
  async submitCarrierBid(ctx: Ctx, quoteId: string, body: unknown): Promise<Bid> {
    const input = CarrierBidInput.parse(body);
    return this.marketplaceTx(ctx.tenantId, async (c) => {
      const { rows: q } = await c.query(
        `SELECT id, tenant_id, status, mode FROM quote.quotes WHERE id = $1`,
        [quoteId],
      );
      if (!q[0]) throw new NotFoundException("quote not found");
      if (q[0].status !== "open") throw new ConflictException("quote is not open");

      // One active bid per carrier per quote: replace a prior submission.
      await c.query(
        `DELETE FROM quote.bids WHERE quote_id = $1 AND carrier_id = $2 AND status = 'submitted'`,
        [quoteId, ctx.tenantId],
      );
      const { rows } = await c.query(
        `INSERT INTO quote.bids
           (tenant_id, quote_id, carrier_id, mode, price_amount, price_currency, transit_days, co2_kg, valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          q[0].tenant_id,          // bid belongs to the shipper tenant (RLS owner)
          quoteId,
          ctx.tenantId,            // carrier_id = the carrier's tenant
          input.mode ?? q[0].mode,
          input.price.amount,
          input.price.currency,
          input.transitDays,
          input.co2Kg ?? null,
          input.validUntil ?? null,
        ],
      );
      const bid = this.rowToBid(rows[0]);
      await this.emit(c, ctx, Events.QuoteEventType.BidSubmitted, quoteId, { bid });
      return bid;
    });
  }

  /** A carrier's own bids across the marketplace, newest first. */
  async listCarrierBids(ctx: Ctx): Promise<CarrierBidRow[]> {
    return this.marketplaceTx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT b.*, q.reference, q.status AS quote_status
           FROM quote.bids b
           JOIN quote.quotes q ON q.id = b.quote_id
          WHERE b.carrier_id = $1
          ORDER BY b.created_at DESC
          LIMIT 200`,
        [ctx.tenantId],
      );
      return rows.map((r) => ({
        ...this.rowToBid(r),
        reference: r.reference as string,
        quoteStatus: r.quote_status as CarrierBidRow["quoteStatus"],
      }));
    });
  }

  // ── Demo: synthesize a spread of bids from real seeded carriers ──
  private async generateDemoBids(ctx: Ctx, quote: Quote): Promise<void> {
    const mode = quote.mode === "Any" ? undefined : quote.mode;
    const carriers = (await this.carriers.list(mode)).slice(0, 4);
    if (carriers.length === 0) return;
    const baseDays = mode === "Air" ? 4 : mode === "Road" ? 6 : mode === "Rail" ? 16 : 30;
    const basePrice = mode === "Air" ? 14000 : mode === "Road" ? 2400 : mode === "Rail" ? 4300 : 8600;

    for (const carrier of carriers) {
      const jitter = 0.85 + Math.random() * 0.4;
      const carrierMode = mode ?? (carrier as Carrier).modes[0] ?? "Ocean";
      await this.submitBid(ctx, quote.id, {
        carrierId: carrier.id,
        mode: carrierMode,
        price: { amount: Math.round(basePrice * jitter), currency: "USD" },
        transitDays: Math.max(1, Math.round(baseDays * (0.9 + Math.random() * 0.3))),
        co2Kg: Math.round(basePrice * jitter * (mode === "Air" ? 4 : 0.4)),
      }).catch(() => undefined);
    }
  }

  private async emit(c: PoolClient, ctx: Ctx, type: string, key: string, payload: unknown) {
    const event = makeEvent({
      type,
      tenantId: ctx.tenantId,
      payload,
      actor: { userId: ctx.userId, role: ctx.role },
      correlationId: ctx.correlationId,
    });
    await enqueueOutbox(c, config.DB_SCHEMA, { topic: Events.Topics.quote, orderingKey: key, event });
  }
}
