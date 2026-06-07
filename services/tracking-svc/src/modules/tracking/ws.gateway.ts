import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { TokenService } from "@epl/auth";
import { TrackingState } from "@epl/contracts";
import { createLogger } from "@epl/observability";
import { TrackingService } from "./tracking.service";

const logger = createLogger("tracking-svc:ws");

/**
 * Real-time position stream over WebSocket. Clients connect to
 *   /ws/tracking?token=<access JWT>
 * (browsers can't set Authorization on WS, so the token rides as a query param;
 * in prod the gateway terminates TLS and can also mint a short-lived WS ticket).
 * Each socket is bound to its tenant; only that tenant's updates are pushed.
 */
@Injectable()
export class TrackingWsGateway implements OnModuleDestroy {
  private wss?: WebSocketServer;
  private tokens?: TokenService;
  private readonly clients = new Map<WebSocket, string>(); // socket → tenantId

  constructor(private readonly tracking: TrackingService) {
    this.tracking.setBroadcaster((tenantId, state) => this.broadcast(tenantId, state));
  }

  async attach(server: Server, publicKeyPem: string) {
    this.tokens = await TokenService.create({ publicKeyPem });
    this.wss = new WebSocketServer({ server, path: "/ws/tracking" });

    this.wss.on("connection", async (ws, req) => {
      try {
        const url = new URL(req.url ?? "", "http://localhost");
        const token = url.searchParams.get("token") ?? "";
        const claims = await this.tokens!.verify(token);
        this.clients.set(ws, claims.tid);
        ws.send(JSON.stringify({ type: "connected", tenantId: claims.tid }));
        ws.on("close", () => this.clients.delete(ws));
        ws.on("error", () => this.clients.delete(ws));
      } catch {
        ws.close(1008, "unauthorized");
      }
    });
    logger.info("ws server attached at /ws/tracking");
  }

  private broadcast(tenantId: string, state: TrackingState) {
    const msg = JSON.stringify({ type: "position", state });
    for (const [ws, tid] of this.clients) {
      if (tid === tenantId && ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  onModuleDestroy() {
    this.wss?.close();
  }
}
