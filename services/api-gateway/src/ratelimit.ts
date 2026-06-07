import type { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { config } from "./config";

/**
 * Token-bucket-ish fixed-window rate limiter. Uses Redis (Memorystore in prod)
 * when REDIS_URL is set; falls back to an in-memory map for local dev.
 * Keyed per-IP (and per-tenant once identity is known).
 */
const redis = config.REDIS_URL ? new Redis(config.REDIS_URL, { lazyConnect: true }) : null;
if (redis) redis.connect().catch(() => undefined);

const memory = new Map<string, { count: number; resetAt: number }>();

export function rateLimit() {
  const windowMs = config.RATE_LIMIT_WINDOW_MS;
  const max = config.RATE_LIMIT_MAX;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${req.ip}`;
    try {
      let count: number;
      if (redis && redis.status === "ready") {
        count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, windowMs);
      } else {
        const now = Date.now();
        const entry = memory.get(key);
        if (!entry || entry.resetAt < now) {
          memory.set(key, { count: 1, resetAt: now + windowMs });
          count = 1;
        } else {
          entry.count += 1;
          count = entry.count;
        }
      }
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)));
      if (count > max) {
        return res.status(429).json({
          error: { code: "RATE_LIMITED", message: "Too many requests" },
        });
      }
      next();
    } catch {
      next(); // fail-open on limiter errors
    }
  };
}
