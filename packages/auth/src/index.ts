/**
 * Shared auth primitives: RS256 tokens, request/tenant context (AsyncLocalStorage),
 * and the NestJS RBAC guard/decorators used by every service.
 * See docs/architecture/04-security.md.
 */
export * from "./tokens";
export * from "./context";
export * from "./nest";
export * from "./filter";

import type { AccessTokenClaims } from "@epl/contracts";
export interface TokenVerifier {
  verify(token: string): Promise<AccessTokenClaims>;
}
