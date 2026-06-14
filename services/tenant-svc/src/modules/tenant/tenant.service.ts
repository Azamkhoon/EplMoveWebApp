import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Pool } from "pg";
import { config } from "../../config";
import { DEFAULT_ADMIN_ROLE, CARRIER_ADMIN_ROLE } from "../../db/seed";

export type TenantKind = "shipper" | "carrier";

export interface ResolvedMembership {
  tenantId: string;
  tenantSlug: string;
  role: string;
  perms: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

@Injectable()
export class TenantService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  /** Create a tenant and make `userId` its admin. Called by auth-svc on register. */
  async provisionTenant(
    userId: string,
    tenantName: string,
    kind: TenantKind = "shipper",
  ): Promise<ResolvedMembership> {
    const adminRole = kind === "carrier" ? CARRIER_ADMIN_ROLE : DEFAULT_ADMIN_ROLE;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Unique slug (append -2, -3, … on collision).
      const base = slugify(tenantName) || "tenant";
      let slug = base;
      for (let i = 2; ; i++) {
        const { rowCount } = await client.query(
          "SELECT 1 FROM tenant.tenants WHERE slug = $1",
          [slug],
        );
        if (!rowCount) break;
        slug = `${base}-${i}`;
      }

      const { rows: tRows } = await client.query<{ id: string }>(
        "INSERT INTO tenant.tenants (name, slug, kind) VALUES ($1, $2, $3) RETURNING id",
        [tenantName, slug, kind],
      );
      const tenantId = tRows[0]!.id;

      const { rows: rRows } = await client.query<{ id: string }>(
        "SELECT id FROM tenant.roles WHERE tenant_id IS NULL AND key = $1",
        [adminRole],
      );
      if (!rRows[0]) throw new Error(`admin role ${adminRole} not seeded — run migrate`);
      const roleId = rRows[0].id;

      await client.query(
        "INSERT INTO tenant.memberships (tenant_id, user_id, role_id) VALUES ($1, $2, $3)",
        [tenantId, userId, roleId],
      );

      await client.query("COMMIT");

      // Carrier tenants get a marketplace profile in carrier-svc (id = tenant id)
      // so their bids resolve to a real carrier name. Best-effort: registration
      // must not fail if carrier-svc is briefly unavailable.
      if (kind === "carrier") {
        try {
          await fetch(`${config.CARRIER_SVC_URL.replace(/\/$/, "")}/internal/carriers/provision`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tenantId, name: tenantName }),
          });
        } catch {
          /* profile can be backfilled later */
        }
      }

      const perms = await this.permsForRole(roleId);
      return { tenantId, tenantSlug: slug, role: adminRole, perms };
    } catch (err) {
      await client.query("ROLLBACK");
      if ((err as { code?: string }).code === "23505") {
        throw new ConflictException("tenant already exists");
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /** Resolve a user's active membership (by slug, or first membership). */
  async resolveMembership(userId: string, tenantSlug?: string): Promise<ResolvedMembership> {
    const params: unknown[] = [userId];
    let where = "m.user_id = $1 AND m.status = 'active'";
    if (tenantSlug) {
      params.push(tenantSlug);
      where += " AND t.slug = $2";
    }
    const { rows } = await this.pool.query<{
      tenant_id: string;
      slug: string;
      role_key: string;
      role_id: string;
    }>(
      `SELECT m.tenant_id, t.slug, r.key AS role_key, r.id AS role_id
         FROM tenant.memberships m
         JOIN tenant.tenants t ON t.id = m.tenant_id
         JOIN tenant.roles r   ON r.id = m.role_id
        WHERE ${where}
        ORDER BY m.created_at
        LIMIT 1`,
      params,
    );
    if (!rows[0]) throw new NotFoundException("no membership");
    const perms = await this.permsForRole(rows[0].role_id);
    return {
      tenantId: rows[0].tenant_id,
      tenantSlug: rows[0].slug,
      role: rows[0].role_key,
      perms,
    };
  }

  async listAllTenants() {
    const { rows } = await this.pool.query<{
      id: string; name: string; slug: string; kind: string; created_at: string; member_count: string;
    }>(
      `SELECT t.id, t.name, t.slug, t.kind, t.created_at,
              COUNT(m.id)::text AS member_count
         FROM tenant.tenants t
         LEFT JOIN tenant.memberships m ON m.tenant_id = t.id AND m.status = 'active'
        GROUP BY t.id
        ORDER BY t.created_at DESC`,
    );
    return rows.map((r) => ({ ...r, memberCount: Number(r.member_count) }));
  }

  async listMemberships(tenantId?: string) {
    const params: unknown[] = [];
    let where = "m.status = 'active'";
    if (tenantId) { params.push(tenantId); where += ` AND m.tenant_id = $1`; }
    const { rows } = await this.pool.query<{
      id: string; tenant_id: string; tenant_name: string;
      user_id: string; role_key: string; created_at: string;
    }>(
      `SELECT m.id, m.tenant_id, t.name AS tenant_name, m.user_id, r.key AS role_key, m.created_at
         FROM tenant.memberships m
         JOIN tenant.tenants t ON t.id = m.tenant_id
         JOIN tenant.roles r   ON r.id = m.role_id
        WHERE ${where}
        ORDER BY m.created_at DESC
        LIMIT 500`,
      params,
    );
    return rows;
  }

  private async permsForRole(roleId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ key: string }>(
      `SELECT p.key
         FROM tenant.role_permissions rp
         JOIN tenant.permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1`,
      [roleId],
    );
    return rows.map((r) => r.key);
  }
}
