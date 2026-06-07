import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { Carrier, CarrierSummary, type CreateCarrierInput } from "@epl/contracts";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

@Injectable()
export class CarrierService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  private rowToCarrier(r: Record<string, any>): Carrier {
    const count = Number(r.ratings_count);
    const rating = count > 0 ? Number(r.rating_sum) / count : 0;
    return Carrier.parse({
      id: r.id,
      tenantId: r.tenant_id ?? "00000000-0000-0000-0000-000000000000",
      name: r.name,
      scac: r.scac ?? undefined,
      modes: r.modes ?? [],
      rating: Math.round(rating * 10) / 10,
      reliability: Number(r.reliability),
      ratingsCount: count,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    });
  }

  async list(mode?: string): Promise<Carrier[]> {
    const params: unknown[] = [];
    let where = "WHERE status = 'active'";
    if (mode) {
      params.push(mode);
      where += ` AND $1 = ANY(modes)`;
    }
    const { rows } = await this.pool.query(
      `SELECT * FROM carrier.carriers ${where} ORDER BY (rating_sum / NULLIF(ratings_count,0)) DESC NULLS LAST`,
      params,
    );
    return rows.map((r) => this.rowToCarrier(r));
  }

  async get(id: string): Promise<Carrier> {
    const { rows } = await this.pool.query("SELECT * FROM carrier.carriers WHERE id = $1", [id]);
    if (!rows[0]) throw new NotFoundException("carrier not found");
    return this.rowToCarrier(rows[0]);
  }

  /** Compact summaries for a set of ids (used by quote-svc to enrich bids). */
  async summaries(ids: string[]): Promise<Record<string, CarrierSummary>> {
    if (ids.length === 0) return {};
    const { rows } = await this.pool.query(
      `SELECT * FROM carrier.carriers WHERE id = ANY($1)`,
      [ids],
    );
    const out: Record<string, CarrierSummary> = {};
    for (const r of rows) {
      const c = this.rowToCarrier(r);
      out[c.id] = { id: c.id, name: c.name, rating: c.rating, reliability: c.reliability };
    }
    return out;
  }

  async create(ctx: RequestContext, input: CreateCarrierInput): Promise<Carrier> {
    const { rows } = await this.pool.query(
      `INSERT INTO carrier.carriers (tenant_id, name, scac, modes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [ctx.tenantId, input.name, input.scac ?? null, input.modes],
    );
    return this.rowToCarrier(rows[0]);
  }

  async rate(ctx: RequestContext, carrierId: string, stars: number, comment?: string): Promise<Carrier> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO carrier.ratings (carrier_id, tenant_id, stars, comment) VALUES ($1,$2,$3,$4)`,
        [carrierId, ctx.tenantId, stars, comment ?? null],
      );
      const { rows } = await client.query(
        `UPDATE carrier.carriers
            SET rating_sum = rating_sum + $2, ratings_count = ratings_count + 1
          WHERE id = $1 RETURNING *`,
        [carrierId, stars],
      );
      await client.query("COMMIT");
      if (!rows[0]) throw new NotFoundException("carrier not found");
      return this.rowToCarrier(rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
