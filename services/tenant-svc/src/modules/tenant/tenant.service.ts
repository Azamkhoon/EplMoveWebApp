import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Pool } from "pg";
import { config } from "../../config";
import { DEFAULT_ADMIN_ROLE } from "../../db/seed";

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
  async provisionTenant(userId: string, tenantName: string): Promise<ResolvedMembership> {
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
        "INSERT INTO tenant.tenants (name, slug) VALUES ($1, $2) RETURNING id",
        [tenantName, slug],
      );
      const tenantId = tRows[0]!.id;

      const { rows: rRows } = await client.query<{ id: string }>(
        "SELECT id FROM tenant.roles WHERE tenant_id IS NULL AND key = $1",
        [DEFAULT_ADMIN_ROLE],
      );
      if (!rRows[0]) throw new Error("default admin role not seeded — run migrate");
      const roleId = rRows[0].id;

      await client.query(
        "INSERT INTO tenant.memberships (tenant_id, user_id, role_id) VALUES ($1, $2, $3)",
        [tenantId, userId, roleId],
      );

      await client.query("COMMIT");
      const perms = await this.permsForRole(roleId);
      return { tenantId, tenantSlug: slug, role: DEFAULT_ADMIN_ROLE, perms };
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
