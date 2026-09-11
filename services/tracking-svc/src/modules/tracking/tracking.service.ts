import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { TrackingState, PositionReport, Events, type Location } from "@epl/contracts";
import { enqueueOutbox, makeEvent, type EventBus } from "@epl/events";
import { config } from "../../config";
import { haversineKm } from "./geo";

type Ctx = { tenantId: string; correlationId?: string };

/** Average speeds (km/h) for a rough ETA by transport mode. */
const SPEED_KPH: Record<string, number> = { Air: 800, Road: 65, Rail: 50, Ocean: 35, Multimodal: 45 };

export type Broadcaster = (tenantIds: string[], state: TrackingState) => void;

@Injectable()
export class TrackingService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  private broadcaster?: Broadcaster;

  setBroadcaster(b: Broadcaster) {
    this.broadcaster = b;
  }

  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query("SET LOCAL search_path TO tracking, public");
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

  /** Initialize tracking state when a shipment is created (event-driven). */
  async initFromShipment(
    eventId: string,
    input: {
      shipmentId: string;
      tenantId: string;
      origin: Location;
      destination: Location;
      mode: string;
      carrierTenantId: string;
      correlationId: string;
    },
  ): Promise<boolean> {
    return this.tx(input.tenantId, async (c) => {
      const dedupe = await c.query(
        `INSERT INTO tracking.processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id`,
        [eventId],
      );
      if (dedupe.rowCount === 0) return false;

      const totalKm = haversineKm(input.origin, input.destination);
      const speed = SPEED_KPH[input.mode] ?? 50;
      const eta = new Date(Date.now() + (totalKm / speed) * 3600_000).toISOString();
      await c.query(
        `INSERT INTO tracking.states
          (shipment_id, tenant_id, participant_tenant_ids, origin, destination, total_km,
           lat, lng, progress, remaining_km, eta_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$6,$9)
         ON CONFLICT (shipment_id) DO NOTHING`,
        [
          input.shipmentId,
          input.tenantId,
          [input.tenantId, input.carrierTenantId],
          JSON.stringify(input.origin),
          JSON.stringify(input.destination),
          totalKm,
          input.origin.lat,
          input.origin.lng,
          eta,
        ],
      );
      return true;
    });
  }

  /** Ingest a GPS position → recompute progress/ETA/geofence → emit + broadcast. */
  async ingest(ctx: Ctx, report: PositionReport): Promise<TrackingState> {
    const { state, geofenceHit, participantTenantIds } = await this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM tracking.states WHERE shipment_id = $1`, [report.shipmentId]);
      if (!rows[0]) throw new NotFoundException("shipment not tracked");
      const s = rows[0];
      const origin = s.origin as Location;
      const destination = s.destination as Location;
      const totalKm = Number(s.total_km);

      const here = { lat: report.lat, lng: report.lng };
      const remainingKm = haversineKm(here, destination);
      const progress = Math.max(0, Math.min(100, Math.round((1 - remainingKm / Math.max(totalKm, 0.01)) * 100)));
      const speed = report.speedKph ?? Number(s.speed_kph) ?? 50;
      const eta = new Date(Date.now() + (remainingKm / Math.max(speed, 1)) * 3600_000).toISOString();

      // Geofence detection.
      const r = config.GEOFENCE_RADIUS_KM;
      const nearOrigin = haversineKm(here, origin) <= r;
      const nearDest = remainingKm <= r;
      let geofenceHit: "origin" | "destination" | null = null;
      if (nearOrigin && !s.origin_entered) geofenceHit = "origin";
      else if (nearDest && !s.dest_entered) geofenceHit = "destination";

      await c.query(
        `INSERT INTO tracking.positions
          (shipment_id, tenant_id, participant_tenant_ids, lat, lng, speed_kph, heading_deg, reported_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          report.shipmentId,
          s.tenant_id,
          s.participant_tenant_ids,
          report.lat,
          report.lng,
          report.speedKph ?? null,
          report.headingDeg ?? null,
          report.reportedAt ?? new Date(),
        ],
      );

      const upd = await c.query(
        `UPDATE tracking.states SET
           lat=$2, lng=$3, speed_kph=$4, heading_deg=$5, progress=$6, remaining_km=$7, eta_date=$8,
           origin_entered = origin_entered OR $9, dest_entered = dest_entered OR $10, updated_at=now()
         WHERE shipment_id=$1 RETURNING *`,
        [report.shipmentId, report.lat, report.lng, report.speedKph ?? null, report.headingDeg ?? null,
         progress, remainingKm, eta, nearOrigin, nearDest],
      );
      const state = this.rowToState(upd.rows[0]);

      // Emit position.updated (+ geofence.entered) via outbox.
      await enqueueOutbox(c, config.DB_SCHEMA, {
        topic: Events.Topics.tracking,
        orderingKey: report.shipmentId,
        event: makeEvent({
          type: Events.TrackingEventType.PositionUpdated,
          tenantId: ctx.tenantId,
          correlationId: ctx.correlationId,
          payload: { state },
        }),
      });
      if (geofenceHit) {
        await enqueueOutbox(c, config.DB_SCHEMA, {
          topic: Events.Topics.tracking,
          orderingKey: report.shipmentId,
          event: makeEvent({
            type: Events.TrackingEventType.GeofenceEntered,
            tenantId: ctx.tenantId,
            correlationId: ctx.correlationId,
            payload: { shipmentId: report.shipmentId, kind: geofenceHit },
          }),
        });
      }
      return {
        state,
        geofenceHit,
        participantTenantIds: (s.participant_tenant_ids as string[]) ?? [s.tenant_id],
      };
    });

    this.broadcaster?.(participantTenantIds, state);
    return state;
  }

  async getState(ctx: Ctx, shipmentId: string): Promise<TrackingState> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM tracking.states WHERE shipment_id = $1`, [shipmentId]);
      if (!rows[0]) throw new NotFoundException("shipment not tracked");
      return this.rowToState(rows[0]);
    });
  }

  async addParticipant(shipmentId: string, ownerTenantId: string, participantTenantId: string) {
    return this.tx(ownerTenantId, async (c) => {
      await c.query(
        `UPDATE tracking.states
            SET participant_tenant_ids = ARRAY(
              SELECT DISTINCT unnest(participant_tenant_ids || $2::uuid)
            )
          WHERE shipment_id=$1`,
        [shipmentId, participantTenantId],
      );
      await c.query(
        `UPDATE tracking.positions
            SET participant_tenant_ids = ARRAY(
              SELECT DISTINCT unnest(participant_tenant_ids || $2::uuid)
            )
          WHERE shipment_id=$1`,
        [shipmentId, participantTenantId],
      );
    });
  }

  async history(ctx: Ctx, shipmentId: string, limit = 200) {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT lat, lng, speed_kph, heading_deg, reported_at FROM tracking.positions
          WHERE shipment_id=$1 ORDER BY reported_at DESC LIMIT $2`,
        [shipmentId, Math.min(limit, 1000)],
      );
      return rows.map((r) => ({
        lat: Number(r.lat),
        lng: Number(r.lng),
        speedKph: r.speed_kph != null ? Number(r.speed_kph) : undefined,
        headingDeg: r.heading_deg != null ? Number(r.heading_deg) : undefined,
        reportedAt: new Date(r.reported_at).toISOString(),
      }));
    });
  }

  private rowToState(r: Record<string, any>): TrackingState {
    return TrackingState.parse({
      shipmentId: r.shipment_id,
      tenantId: r.tenant_id,
      lat: Number(r.lat),
      lng: Number(r.lng),
      speedKph: r.speed_kph != null ? Number(r.speed_kph) : undefined,
      headingDeg: r.heading_deg != null ? Number(r.heading_deg) : undefined,
      progress: Number(r.progress),
      remainingKm: Math.round(Number(r.remaining_km)),
      etaDate: r.eta_date ? new Date(r.eta_date).toISOString() : undefined,
      updatedAt: new Date(r.updated_at).toISOString(),
    });
  }
}
