import { Injectable } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Notification, type NotificationKind } from "@epl/contracts";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

interface NewNotification {
  tenantId: string;
  userId?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string | null;
  shipmentId?: string | null;
  referenceId?: string | null;
}

type Broadcaster = (notification: Notification) => void;

@Injectable()
export class NotifyService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  private broadcaster?: Broadcaster;

  setBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query("SET LOCAL search_path TO notify, public");
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

  private rowTo(r: Record<string, any>): Notification {
    return Notification.parse({
      id: r.id,
      tenantId: r.tenant_id,
      userId: r.user_id ?? null,
      companyId: r.company_id ?? r.tenant_id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      shipmentId: r.shipment_id ?? null,
      referenceId: r.reference_id ?? null,
      link: r.link,
      read: r.read,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  /**
   * Idempotently create a notification from a domain event. Returns null if the
   * event was already processed (dedupe on event id).
   */
  async createFromEvent(
    eventId: string,
    n: NewNotification,
    recipientKey = n.userId ?? "company",
  ): Promise<Notification | null> {
    const notification = await this.tx(n.tenantId, async (c) => {
      const dedupe = await c.query(
        `INSERT INTO notify.processed_deliveries (event_id, tenant_id, recipient_key)
         VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING RETURNING event_id`,
        [eventId, n.tenantId, recipientKey],
      );
      if (dedupe.rowCount === 0) return null;

      const { rows } = await c.query(
        `INSERT INTO notify.notifications
          (tenant_id, company_id, user_id, kind, title, body, link, shipment_id, reference_id)
         VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          n.tenantId,
          n.userId ?? null,
          n.kind,
          n.title,
          n.body,
          n.link ?? null,
          n.shipmentId ?? null,
          n.referenceId ?? null,
        ],
      );
      return this.rowTo(rows[0]);
    });
    if (notification) this.broadcaster?.(notification);
    return notification;
  }

  async list(ctx: Pick<RequestContext, "tenantId" | "userId">): Promise<Notification[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT * FROM notify.notifications
          WHERE user_id IS NULL OR user_id=$1
          ORDER BY created_at DESC LIMIT 100`,
        [ctx.userId],
      );
      return rows.map((r) => this.rowTo(r));
    });
  }

  async markRead(
    ctx: Pick<RequestContext, "tenantId" | "userId">,
    ids?: string[],
  ): Promise<{ updated: number }> {
    return this.tx(ctx.tenantId, async (c) => {
      const res =
        ids && ids.length > 0
          ? await c.query(
              `UPDATE notify.notifications SET read=true
                WHERE id = ANY($1::uuid[]) AND (user_id IS NULL OR user_id=$2)`,
              [ids, ctx.userId],
            )
          : await c.query(
              `UPDATE notify.notifications SET read=true
                WHERE read=false AND (user_id IS NULL OR user_id=$1)`,
              [ctx.userId],
            );
      return { updated: res.rowCount ?? 0 };
    });
  }
}
