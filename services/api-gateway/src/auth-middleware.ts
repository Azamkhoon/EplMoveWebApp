import type { Request, Response, NextFunction } from "express";
import { TokenService } from "@epl/auth";
import { config } from "./config";

/**
 * Verifies the access JWT and attaches trusted internal identity headers
 * (x-epl-*) that downstream services read via ContextInterceptor. Strips any
 * client-supplied x-epl-* headers first (header-injection defense).
 * See docs/architecture/04-security.md.
 */
let tokens: TokenService | null = null;
async function getTokens(): Promise<TokenService> {
  if (!tokens) {
    tokens = await TokenService.create({ publicKeyPem: config.JWT_PUBLIC_KEY });
  }
  return tokens;
}

const EPL_HEADERS = ["x-epl-user", "x-epl-tenant", "x-epl-role", "x-epl-perms", "x-epl-session"];

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Defense: never trust inbound identity headers from clients.
    for (const h of EPL_HEADERS) delete req.headers[h];

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "missing bearer token" } });
    }
    try {
      const claims = await (await getTokens()).verify(header.slice(7));
      req.headers["x-epl-user"] = claims.sub;
      req.headers["x-epl-tenant"] = claims.tid;
      req.headers["x-epl-role"] = claims.role;
      req.headers["x-epl-perms"] = claims.perms.join(",");
      req.headers["x-epl-session"] = claims.sid;
      if (!req.headers["x-correlation-id"]) {
        req.headers["x-correlation-id"] = crypto.randomUUID();
      }
      next();
    } catch {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "invalid token" } });
    }
  };
}
