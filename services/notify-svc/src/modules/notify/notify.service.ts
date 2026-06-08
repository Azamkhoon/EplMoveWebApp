import { Injectable } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Notification, type NotificationKind } from "@epl/contracts";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

interface NewNotification {
  tenantId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string | null;
}

@Injectable()
export class NotifyService {
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
      kind: r.kind,
      title: r.title,
      body: r.body,
      link: r.link,
      read: r.read,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  /**
   * Idempotently create a notification from a domain event. Returns null if the
   * event was already processed (dedupe on event id).
   */
  async createFromEvent(eventId: string, n: NewNotification): Promise<Notification | null> {
    return this.tx(n.tenantId, async (c) => {
      const dedupe = await c.query(
        `INSERT INTO notify.processed_events (event_id) VALUES ($1)
         ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [eventId],
      );
      if (dedupe.rowCount === 0) return null;

      const { rows } = await c.query(
        `INSERT INTO notify.notifications (tenant_id, kind, title, body, link)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [n.tenantId, n.kind, n.title, n.body, n.link ?? null],
      );
      return this.rowTo(rows[0]);
    });
  }

  async list(ctx: Pick<RequestContext, "tenantId">): Promise<Notification[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT * FROM notify.notifications ORDER BY created_at DESC LIMIT 100`,
      );
      return rows.map((r) => this.rowTo(r));
    });
  }

  async markRead(ctx: Pick<RequestContext, "tenantId">, ids?: string[]): Promise<{ updated: number }> {
    return this.tx(ctx.tenantId, async (c) => {
      const res =
        ids && ids.length > 0
          ? await c.query(`UPDATE notify.notifications SET read=true WHERE id = ANY($1::uuid[])`, [ids])
          : await c.query(`UPDATE notify.notifications SET read=true WHERE read=false`);
      return { updated: res.rowCount ?? 0 };
    });
  }
}
