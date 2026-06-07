import { AsyncLocalStorage } from "node:async_hooks";
import type { Permission } from "@epl/contracts";

/** Per-request identity & tenant context, propagated via AsyncLocalStorage. */
export interface RequestContext {
  userId: string;
  tenantId: string;
  role: string;
  perms: Permission[];
  sessionId: string;
  correlationId: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Current request context, or undefined outside a request. */
export function getContext(): RequestContext | undefined {
  return als.getStore();
}

/** Current context or throw — use where a context is required. */
export function requireContext(): RequestContext {
  const ctx = als.getStore();
  if (!ctx) throw new Error("No request context available");
  return ctx;
}

export function hasPermissions(
  ctx: Pick<RequestContext, "perms">,
  required: Permission[],
): boolean {
  return required.every((p) => ctx.perms.includes(p));
}
