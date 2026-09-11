import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import {
  AssignBrokerInput,
  Events,
  Milestone,
  Shipment,
  ShipmentActivity,
  ShipmentMessage,
  SendShipmentMessageInput,
  UpdateShipmentStatusInput,
  type Location,
  type ShipmentStatus,
} from "@epl/contracts";
import { enqueueOutbox, makeEvent, type EventBus } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";
import { LoadClient } from "./load.client";

type Ctx = Pick<RequestContext, "userId" | "tenantId" | "role" | "correlationId">;

interface CreateFromBid {
  tenantId: string;
  loadId: string;
  quoteId: string;
  bidId: string;
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

const STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  carrier_selected: ["booked", "cancelled"],
  booked: ["pickup_scheduled", "picked_up", "in_transit", "cancelled"],
  pickup_scheduled: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "customs", "cancelled"],
  in_transit: ["customs", "delayed", "delivered"],
  customs: ["in_transit", "delayed", "delivered"],
  delayed: ["in_transit", "customs", "delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

@Injectable()
export class ShipmentService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  constructor(private readonly loads: LoadClient) {}

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

  private rowToActivity(r: Record<string, any>): ShipmentActivity {
    return ShipmentActivity.parse({
      id: r.id,
      shipmentId: r.shipment_id,
      type: r.type,
      title: r.title,
      description: r.description ?? undefined,
      actorUserId: r.actor_user_id ?? null,
      actorRole: r.actor_role ?? null,
      referenceId: r.reference_id ?? null,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  private rowToShipment(
    r: Record<string, any>,
    milestones?: Milestone[],
    activity?: ShipmentActivity[],
  ): Shipment {
    return Shipment.parse({
      id: r.id,
      tenantId: r.tenant_id,
      shipperTenantId: r.tenant_id,
      reference: r.reference,
      loadId: r.load_id,
      quoteId: r.quote_id,
      carrierId: r.carrier_id,
      carrierTenantId: r.carrier_id,
      carrierName: r.carrier_name,
      brokerTenantId: r.broker_tenant_id ?? null,
      brokerName: r.broker_name ?? null,
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
      activity,
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

      await c.query(
        `INSERT INTO shipment.bookings
          (shipment_id, tenant_id, load_id, quote_id, bid_id, carrier_tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (shipment_id) DO NOTHING`,
        [shipment.id, input.tenantId, input.loadId, input.quoteId, input.bidId, input.carrierId],
      );

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
      await this.addActivity(c, {
        shipmentId: full.id,
        tenantId: input.tenantId,
        type: "shipment.booked",
        title: `Carrier ${input.carrierName} selected and shipment booked`,
        actorUserId: null,
        actorRole: "system",
        referenceId: input.quoteId,
      });
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
    const { shipment, milestones, activity } = await this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM shipment.shipments WHERE id = $1`, [id]);
      if (!rows[0]) throw new NotFoundException("shipment not found");
      const { rows: ms } = await c.query(
        `SELECT * FROM shipment.milestones WHERE shipment_id = $1 ORDER BY seq`,
        [id],
      );
      const { rows: events } = await c.query(
        `SELECT * FROM shipment.activities WHERE shipment_id = $1 ORDER BY created_at`,
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
        activity: events.map((event) => this.rowToActivity(event)),
      };
    });
    return this.rowToShipment(shipment, milestones, activity);
  }

  async assignBroker(ctx: Ctx, id: string, body: unknown): Promise<Shipment> {
    const input = AssignBrokerInput.parse(body);
    return this.tx(ctx.tenantId, async (c) => {
      const current = await c.query(`SELECT * FROM shipment.shipments WHERE id=$1`, [id]);
      if (!current.rows[0]) throw new NotFoundException("shipment not found");
      if (current.rows[0].tenant_id !== ctx.tenantId && !ctx.role.startsWith("platform_")) {
        throw new ForbiddenException("only the shipper can assign a broker");
      }
      const { rows } = await c.query(
        `UPDATE shipment.shipments
            SET broker_tenant_id=$2, broker_name=$3
          WHERE id=$1 RETURNING *`,
        [id, input.brokerTenantId, input.brokerName],
      );
      await c.query(
        `UPDATE shipment.broker_assignments
            SET active=false, updated_at=now()
          WHERE shipment_id=$1 AND active`,
        [id],
      );
      await c.query(
        `INSERT INTO shipment.broker_assignments
          (shipment_id, shipper_tenant_id, broker_tenant_id, broker_name, assigned_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, rows[0].tenant_id, input.brokerTenantId, input.brokerName, ctx.userId],
      );
      await this.addActivity(c, {
        shipmentId: id,
        tenantId: rows[0].tenant_id,
        type: "broker.assigned",
        title: `${input.brokerName} assigned as customs broker`,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        referenceId: input.brokerTenantId,
      });
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.shipment,
        orderingKey: id,
        event: makeEvent({
          type: Events.ShipmentEventType.BrokerAssigned,
          tenantId: rows[0].tenant_id,
          actor: { userId: ctx.userId, role: ctx.role },
          correlationId: ctx.correlationId,
          payload: {
            shipmentId: id,
            shipperTenantId: rows[0].tenant_id,
            carrierTenantId: rows[0].carrier_id,
            brokerTenantId: input.brokerTenantId,
            brokerName: input.brokerName,
          },
        }),
      });
      return this.rowToShipment(rows[0]);
    });
  }

  async updateStatus(ctx: Ctx, id: string, body: unknown): Promise<Shipment> {
    const input = UpdateShipmentStatusInput.parse(body);
    const updated = await this.tx(ctx.tenantId, async (c) => {
      const current = await c.query(`SELECT * FROM shipment.shipments WHERE id=$1`, [id]);
      if (!current.rows[0]) throw new NotFoundException("shipment not found");
      const existing = this.rowToShipment(current.rows[0]);
      if (!STATUS_TRANSITIONS[existing.status].includes(input.status)) {
        throw new ConflictException(`illegal transition ${existing.status} → ${input.status}`);
      }
      const carrierAction = ["carrier_admin", "carrier_member", "dispatcher", "driver"].includes(ctx.role);
      const brokerAction = ["broker_admin", "broker_agent"].includes(ctx.role);
      if (carrierAction && !["pickup_scheduled", "picked_up", "in_transit", "delayed", "delivered"].includes(input.status)) {
        throw new ForbiddenException("carrier cannot set this shipment status");
      }
      if (brokerAction && input.status !== "customs") {
        throw new ForbiddenException("broker can only move a shipment into customs");
      }
      const { rows } = await c.query(
        `UPDATE shipment.shipments
            SET status=$2, progress=CASE
              WHEN $2='picked_up' THEN GREATEST(progress, 10)
              WHEN $2='in_transit' THEN GREATEST(progress, 25)
              WHEN $2='customs' THEN GREATEST(progress, 75)
              WHEN $2='delivered' THEN 100
              WHEN $2='completed' THEN 100
              ELSE progress END
          WHERE id=$1 RETURNING *`,
        [id, input.status],
      );
      await this.addActivity(c, {
        shipmentId: id,
        tenantId: rows[0].tenant_id,
        type: "shipment.status_changed",
        title: `Shipment status changed to ${input.status.replace(/_/g, " ")}`,
        description: input.comment,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        referenceId: null,
      });
      const shipment = this.rowToShipment(rows[0]);
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.shipment,
        orderingKey: shipment.id,
        event: makeEvent({
          type:
            input.status === "delivered"
              ? Events.ShipmentEventType.Delivered
              : Events.ShipmentEventType.Milestone,
          tenantId: shipment.tenantId,
          actor: { userId: ctx.userId, role: ctx.role },
          correlationId: ctx.correlationId,
          payload: { shipment, from: existing.status, to: input.status },
        }),
      });
      return shipment;
    });
    await this.loads.transition(updated.loadId, updated.shipperTenantId, input.status).catch(() => undefined);
    return updated;
  }

  async accessFor(id: string, tenantId: string, role: string) {
    const systemCtx: Ctx = {
      userId: "00000000-0000-0000-0000-000000000000",
      tenantId,
      role,
      correlationId: crypto.randomUUID(),
    };
    const shipment = await this.getById(systemCtx, id);
    return {
      shipmentId: shipment.id,
      reference: shipment.reference,
      shipperTenantId: shipment.shipperTenantId,
      carrierTenantId: shipment.carrierTenantId,
      brokerTenantId: shipment.brokerTenantId,
      brokerName: shipment.brokerName,
    };
  }

  async listMessages(ctx: Ctx, shipmentId: string): Promise<ShipmentMessage[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const visible = await c.query(`SELECT id FROM shipment.shipments WHERE id=$1`, [shipmentId]);
      if (!visible.rows[0]) throw new NotFoundException("shipment not found");
      const { rows } = await c.query(
        `SELECT * FROM shipment.messages WHERE shipment_id=$1 ORDER BY created_at`,
        [shipmentId],
      );
      return rows.map((row) =>
        ShipmentMessage.parse({
          id: row.id,
          shipmentId: row.shipment_id,
          senderUserId: row.sender_user_id,
          senderTenantId: row.sender_tenant_id,
          senderRole: row.sender_role,
          senderName: row.sender_name,
          body: row.body,
          createdAt: new Date(row.created_at).toISOString(),
        }),
      );
    });
  }

  async sendMessage(ctx: Ctx, shipmentId: string, body: unknown): Promise<ShipmentMessage> {
    const input = SendShipmentMessageInput.parse(body);
    return this.tx(ctx.tenantId, async (c) => {
      const visible = await c.query(`SELECT * FROM shipment.shipments WHERE id=$1`, [shipmentId]);
      if (!visible.rows[0]) throw new NotFoundException("shipment not found");
      const shipment = visible.rows[0];
      const { rows } = await c.query(
        `INSERT INTO shipment.messages
          (shipment_id, tenant_id, sender_user_id, sender_tenant_id, sender_role, sender_name, body)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          shipmentId,
          shipment.tenant_id,
          ctx.userId,
          ctx.tenantId,
          ctx.role,
          ctx.role.replace(/_/g, " "),
          input.body,
        ],
      );
      const message = ShipmentMessage.parse({
        id: rows[0].id,
        shipmentId: rows[0].shipment_id,
        senderUserId: rows[0].sender_user_id,
        senderTenantId: rows[0].sender_tenant_id,
        senderRole: rows[0].sender_role,
        senderName: rows[0].sender_name,
        body: rows[0].body,
        createdAt: new Date(rows[0].created_at).toISOString(),
      });
      await this.addActivity(c, {
        shipmentId,
        tenantId: shipment.tenant_id,
        type: "message.sent",
        title: `Message sent by ${message.senderName}`,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        referenceId: message.id,
      });
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.shipment,
        orderingKey: shipmentId,
        event: makeEvent({
          type: Events.ShipmentEventType.MessageSent,
          tenantId: shipment.tenant_id,
          actor: { userId: ctx.userId, role: ctx.role },
          correlationId: ctx.correlationId,
          payload: {
            message,
            reference: shipment.reference,
            participantTenantIds: [
              shipment.tenant_id,
              shipment.carrier_id,
              shipment.broker_tenant_id,
            ].filter(Boolean),
          },
        }),
      });
      return message;
    });
  }

  async recordExternalActivity(
    eventId: string,
    tenantId: string,
    input: {
      shipmentId: string;
      type: string;
      title: string;
      description?: string;
      actorUserId: string | null;
      actorRole: string | null;
      referenceId: string | null;
    },
  ): Promise<void> {
    await this.tx(tenantId, async (c) => {
      const dedupe = await c.query(
        `INSERT INTO shipment.processed_events (event_id) VALUES ($1)
         ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [eventId],
      );
      if (dedupe.rowCount === 0) return;
      const visible = await c.query(`SELECT id FROM shipment.shipments WHERE id=$1`, [input.shipmentId]);
      if (!visible.rows[0]) return;
      await this.addActivity(c, { ...input, tenantId });
    });
  }

  private async addActivity(
    c: PoolClient,
    input: {
      shipmentId: string;
      tenantId: string;
      type: string;
      title: string;
      description?: string;
      actorUserId: string | null;
      actorRole: string | null;
      referenceId: string | null;
    },
  ): Promise<void> {
    await c.query(
      `INSERT INTO shipment.activities
        (shipment_id, tenant_id, type, title, description, actor_user_id, actor_role, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.shipmentId,
        input.tenantId,
        input.type,
        input.title,
        input.description ?? null,
        input.actorUserId,
        input.actorRole,
        input.referenceId,
      ],
    );
  }
}
