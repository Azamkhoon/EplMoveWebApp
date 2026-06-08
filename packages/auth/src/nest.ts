import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
  type CallHandler,
  type NestInterceptor,
  type NestMiddleware,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import type { Permission } from "@epl/contracts";
import {
  RequestContext,
  getContext,
  hasPermissions,
  requireContext,
  runWithContext,
} from "./context";

export const REQUIRE_PERMISSIONS_KEY = "epl:requirePermissions";

/** Declare the permissions a route requires: `@RequirePermissions("load:create")`. */
export const RequirePermissions = (...perms: Permission[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, perms);

/** Inject the current RequestContext into a handler: `@Ctx() ctx: RequestContext`. */
export const Ctx = createParamDecorator((_data, _exec: ExecutionContext) => requireContext());

/** Builds a RequestContext from gateway-forwarded identity headers, or null. */
function contextFromHeaders(headers: Record<string, unknown>): RequestContext | null {
  const userId = headers["x-epl-user"];
  const tenantId = headers["x-epl-tenant"];
  if (!userId || !tenantId) return null;
  const role = headers["x-epl-role"];
  const permsRaw = headers["x-epl-perms"];
  const sessionId = headers["x-epl-session"] ?? "";
  const correlationId =
    headers["x-correlation-id"] ?? headers["x-request-id"] ?? crypto.randomUUID();
  return {
    userId: String(userId),
    tenantId: String(tenantId),
    role: String(role ?? ""),
    perms: permsRaw ? String(permsRaw).split(",").filter(Boolean) : [],
    sessionId: String(sessionId),
    correlationId: String(correlationId),
  };
}

/**
 * Establishes the RequestContext from gateway-forwarded identity headers and
 * runs the REST of the request inside the AsyncLocalStorage scope.
 *
 * This is middleware (not an interceptor) on purpose: NestJS runs middleware
 * before guards, so PermissionsGuard sees the context. The gateway verifies the
 * JWT and forwards identity as trusted internal headers (services have no public
 * ingress). See docs/architecture/04-security.md.
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: { headers: Record<string, unknown> }, _res: unknown, next: () => void): void {
    const ctx = contextFromHeaders(req.headers);
    // Public routes (health) won't have identity headers — let them through.
    if (!ctx) return next();
    runWithContext(ctx, () => next());
  }
}

/**
 * @deprecated Use ContextMiddleware. Kept so existing @UseInterceptors() wiring
 * keeps compiling; as an interceptor it runs AFTER guards, so it cannot satisfy
 * PermissionsGuard on its own.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(exec: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = exec.switchToHttp().getRequest();
    const ctx = contextFromHeaders(req.headers);
    if (!ctx) return next.handle();
    return runWithContext(ctx, () => next.handle());
  }
}

/** Enforces `@RequirePermissions(...)` against the current context. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(exec: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRE_PERMISSIONS_KEY, [
      exec.getHandler(),
      exec.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const ctx = getContext();
    if (!ctx) throw new UnauthorizedException("authentication required");
    if (!hasPermissions(ctx, required)) {
      throw new ForbiddenException(`missing permission(s): ${required.join(", ")}`);
    }
    return true;
  }
}
