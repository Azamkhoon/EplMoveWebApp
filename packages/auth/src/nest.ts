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

/**
 * Establishes the RequestContext from gateway-forwarded identity headers and
 * runs the rest of the request inside the AsyncLocalStorage scope.
 *
 * The gateway verifies the JWT and forwards identity as trusted internal
 * headers (services have no public ingress). See docs/architecture/04-security.md.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(exec: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = exec.switchToHttp().getRequest();
    const userId = req.headers["x-epl-user"];
    const tenantId = req.headers["x-epl-tenant"];
    const role = req.headers["x-epl-role"];
    const permsRaw = req.headers["x-epl-perms"];
    const sessionId = req.headers["x-epl-session"] ?? "";
    const correlationId =
      req.headers["x-correlation-id"] ?? req.headers["x-request-id"] ?? crypto.randomUUID();

    if (!userId || !tenantId) {
      // Public routes (health) won't have a context; let them through.
      return next.handle();
    }

    const ctx: RequestContext = {
      userId: String(userId),
      tenantId: String(tenantId),
      role: String(role ?? ""),
      perms: permsRaw ? String(permsRaw).split(",").filter(Boolean) : [],
      sessionId: String(sessionId),
      correlationId: String(correlationId),
    };
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
