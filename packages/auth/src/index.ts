import type { AccessTokenClaims, Permission } from "@epl/contracts";

/**
 * Shared auth primitives: JWT verification, tenant context, and the RBAC
 * guard/decorator surface used by every NestJS service.
 * Phase-0: types + tenant-context contract. RS256 verify + Nest guards
 * (using AsyncLocalStorage) land in Phase 1. See docs/architecture/04-security.md.
 */

/** Per-request identity & tenant context, carried via AsyncLocalStorage. */
export interface RequestContext {
  userId: string;
  tenantId: string;
  role: string;
  perms: Permission[];
  sessionId: string;
  correlationId: string;
}

export interface TokenVerifier {
  /** Verify an access token (RS256, JWKS-cached) → claims, or throw. */
  verify(token: string): Promise<AccessTokenClaims>;
}

/** True if the context holds every required permission. */
export function hasPermissions(
  ctx: Pick<RequestContext, "perms">,
  required: Permission[],
): boolean {
  return required.every((p) => ctx.perms.includes(p));
}

/**
 * Decorator marker (Phase 1 will back this with a Nest guard that reads
 * the AsyncLocalStorage context and calls hasPermissions).
 */
export const REQUIRE_PERMISSIONS_KEY = "epl:requirePermissions";
