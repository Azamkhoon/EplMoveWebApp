import "reflect-metadata";
import express from "express";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createLogger } from "@epl/observability";
import { config } from "./config";
import { rateLimit } from "./ratelimit";
import { requireAuth } from "./auth-middleware";

const logger = createLogger(config.SERVICE_NAME);

const IDENTITY_HEADERS = [
  "x-epl-user",
  "x-epl-tenant",
  "x-epl-role",
  "x-epl-perms",
  "x-epl-session",
  "x-correlation-id",
];

/**
 * API gateway (BFF). The ONLY public ingress. Verifies JWTs, rate-limits, and
 * proxies to internal services. tenant-svc /internal/* is never exposed.
 * See docs/architecture/06-gcp-topology.md.
 */
async function bootstrap() {
  const app = express();
  app.set("trust proxy", true);
  app.use(cookieParser());

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", config.CORS_ORIGIN);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "authorization,content-type,x-correlation-id");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", service: config.SERVICE_NAME }));

  app.use(rateLimit());

  const proxy = (target: string) =>
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      // Express's app.use("/prefix", …) strips the mount path before the
      // middleware runs, so req.url arrives without it. Re-prepend req.baseUrl
      // so the upstream service receives the full original path (e.g. the
      // gateway's /auth/register reaches auth-svc as /auth/register, not /register).
      pathRewrite: (path, req) => {
        const base = (req as express.Request).baseUrl || "";
        return base + path;
      },
      on: {
        proxyReq: (proxyReq, req) => {
          const r = req as express.Request;
          for (const h of IDENTITY_HEADERS) {
            const v = r.headers[h];
            if (v) proxyReq.setHeader(h, String(v));
          }
        },
      },
    });

  // Public: auth routes pass through to auth-svc (login/register/refresh/otp/jwks).
  app.use("/auth", proxy(config.AUTH_SVC_URL));

  // Protected: verify JWT → attach identity → proxy to the domain services.
  app.use("/loads", requireAuth(), proxy(config.LOAD_SVC_URL));
  app.use("/quotes", requireAuth(), proxy(config.QUOTE_SVC_URL));
  app.use("/shipments", requireAuth(), proxy(config.SHIPMENT_SVC_URL));
  app.use("/carriers", requireAuth(), proxy(config.CARRIER_SVC_URL));
  app.use("/tracking", requireAuth(), proxy(config.TRACKING_SVC_URL));
  app.use("/documents", requireAuth(), proxy(config.DOC_SVC_URL));
  app.use("/genius", requireAuth(), proxy(config.GENIUS_SVC_URL));
  app.use("/invoices", requireAuth(), proxy(config.BILLING_SVC_URL));
  app.use("/notifications", requireAuth(), proxy(config.NOTIFY_SVC_URL));

  // WebSocket passthrough for live tracking. The browser authenticates via a
  // ?token= query param (verified by tracking-svc), so the gateway just proxies
  // the upgrade; identity headers aren't used on the WS hop.
  const wsProxy = createProxyMiddleware({
    target: config.TRACKING_SVC_URL,
    changeOrigin: true,
    ws: true,
    pathFilter: "/ws/tracking",
  });
  app.use(wsProxy);

  app.use((_req, res) =>
    res.status(404).json({ error: { code: "NOT_FOUND", message: "no route" } }),
  );

  const server = app.listen(config.PORT, () =>
    logger.info({ port: config.PORT }, `${config.SERVICE_NAME} listening`),
  );
  // Forward WebSocket upgrades to tracking-svc.
  server.on("upgrade", wsProxy.upgrade);
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to bootstrap");
  process.exit(1);
});
