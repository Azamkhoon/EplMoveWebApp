import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Shipment, Milestone, Events, type Location } from "@epl/contracts";
import { enqueueOutbox, makeEvent, type EventBus } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

type Ctx = Pick<RequestContext, "tenantId" | "correlationId">;

interface CreateFromBid {
  tenantId: string;
  loadId: string;
  quoteId: string;
  reference: string;
  carrierId: string;
  carrierName: string;
  mode: string;
  origin: Location;
  destination: Location;
  priceAmount: number;
  priceCurrency: string;
  transitDays: number;
  correlationId: string;
}

const MILESTONE_TEMPLATE = [
  { status: "Booking confirmed", description: "Shipment booked and confirmed with carrier", at: "origin" },
  { status: "Picked up", description: "Cargo collected from shipper facility", at: "origin" },
  { status: "Departed origin", description: "Departed origin terminal", at: "origin" },
  { status: "In transit", description: "Shipment moving toward destination", at: "transit" },
  { status: "Customs clearance", description: "Undergoing customs inspection", at: "destination" },
  { status: "Arrived destination", description: "Arrived at destination terminal", at: "destination" },
  { status: "Out for delivery", description: "Out for final-mile delivery", at: "destination" },
  { status: "Delivered", description: "Delivered and signed for", at: "destination" },
];

@Injectable()
export class ShipmentService {
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
      await c.query("SET LOCAL search_path TO shipment, public");
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

  private rowToShipment(r: Record<string, any>, milestones?: Milestone[]): Shipment {
    return Shipment.parse({
      id: r.id,
      tenantId: r.tenant_id,
      reference: r.reference,
      loadId: r.load_id,
      quoteId: r.quote_id,
      carrierId: r.carrier_id,
      carrierName: r.carrier_name,
      status: r.status,
      mode: r.mode,
      origin: r.origin,
      destination: r.destination,
      price: { amount: Number(r.price_amount), currency: r.price_currency },
      transitDays: Number(r.transit_days),
      bookedAt: new Date(r.booked_at).toISOString(),
      etaDate: r.eta_date ? new Date(r.eta_date).toISOString() : undefined,
      progress: Number(r.progress),
      milestones,
    });
  }

  /**
   * Idempotently create a shipment from an accepted bid (called by the consumer).
   * Returns null if this event was already processed (dedupe) or the quote
   * already has a shipment.
   */
  async createFromBid(eventId: string, input: CreateFromBid, bus: EventBus): Promise<Shipment | null> {
    const created = await this.tx(input.tenantId, async (c) => {
      // Idempotency: skip if we've seen this event id.
      const dedupe = await c.query(
        `INSERT INTO shipment.processed_events (event_id) VALUES ($1)
         ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [eventId],
      );
      if (dedupe.rowCount === 0) return null;

      const eta = new Date(Date.now() + input.transitDays * 86400_000).toISOString();
      const { rows } = await c.query(
        `INSERT INTO shipment.shipments
          (tenant_id, reference, load_id, quote_id, carrier_id, carrier_name, status, mode,
           origin, destination, price_amount, price_currency, transit_days, eta_date, progress)
         VALUES ($1,$2,$3,$4,$5,$6,'booked',$7,$8,$9,$10,$11,$12,$13,0)
         ON CONFLICT (quote_id) DO NOTHING
         RETURNING *`,
        [
          input.tenantId, input.reference, input.loadId, input.quoteId, input.carrierId,
          input.carrierName, input.mode, JSON.stringify(input.origin), JSON.stringify(input.destination),
          input.priceAmount, input.priceCurrency, input.transitDays, eta,
        ],
      );
      if (rows.length === 0) return null; // quote already had a shipment
      const shipment = rows[0];

      // Seed milestones (first one completed = booking confirmed).
      for (let i = 0; i < MILESTONE_TEMPLATE.length; i++) {
        const m = MILESTONE_TEMPLATE[i]!;
        const loc =
          m.at === "origin" ? input.origin.city : m.at === "destination" ? input.destination.city : "In transit";
        await c.query(
          `INSERT INTO shipment.milestones
            (shipment_id, tenant_id, status, description, location, occurred_at, completed, seq)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [shipment.id, input.tenantId, m.status, m.description, loc, i === 0 ? new Date() : null, i === 0, i],
        );
      }

      const full = this.rowToShipment(shipment);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.shipment,
        orderingKey: full.id,
        event: makeEvent({
          type: Events.ShipmentEventType.Created,
          tenantId: input.tenantId,
          correlationId: input.correlationId,
          payload: { shipment: full },
        }),
      });
      return full;
    });

    return created;
  }

  async list(ctx: Ctx): Promise<Shipment[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM shipment.shipments ORDER BY booked_at DESC LIMIT 100`);
      return rows.map((r) => this.rowToShipment(r));
    });
  }

  async getById(ctx: Ctx, id: string): Promise<Shipment> {
    const { shipment, milestones } = await this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM shipment.shipments WHERE id = $1`, [id]);
      if (!rows[0]) throw new NotFoundException("shipment not found");
      const { rows: ms } = await c.query(
        `SELECT * FROM shipment.milestones WHERE shipment_id = $1 ORDER BY seq`,
        [id],
      );
      return {
        shipment: rows[0],
        milestones: ms.map((m) =>
          Milestone.parse({
            id: m.id,
            status: m.status,
            description: m.description,
            location: m.location,
            occurredAt: m.occurred_at ? new Date(m.occurred_at).toISOString() : undefined,
            completed: m.completed,
          }),
        ),
      };
    });
    return this.rowToShipment(shipment, milestones);
  }
}
