import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { TokenService } from "@epl/auth";
import type { Notification } from "@epl/contracts";
import { NotifyService } from "./notify.service";

@Injectable()
export class NotificationWsGateway implements OnModuleDestroy {
  private wss?: WebSocketServer;
  private tokens?: TokenService;
  private readonly clients = new Map<WebSocket, { tenantId: string; userId: string }>();

  constructor(notify: NotifyService) {
    notify.setBroadcaster((notification) => this.broadcast(notification));
  }

  async attach(server: Server, publicKeyPem: string) {
    this.tokens = await TokenService.create({ publicKeyPem });
    this.wss = new WebSocketServer({ server, path: "/ws/notifications" });
    this.wss.on("connection", async (ws, req) => {
      try {
        const url = new URL(req.url ?? "", "http://localhost");
        const claims = await this.tokens!.verify(url.searchParams.get("token") ?? "");
        this.clients.set(ws, { tenantId: claims.tid, userId: claims.sub });
        ws.send(JSON.stringify({ type: "connected" }));
        ws.on("close", () => this.clients.delete(ws));
        ws.on("error", () => this.clients.delete(ws));
      } catch {
        ws.close(1008, "unauthorized");
      }
    });
  }

  private broadcast(notification: Notification) {
    const message = JSON.stringify({ type: "notification", notification });
    for (const [ws, identity] of this.clients) {
      if (
        identity.tenantId === notification.companyId &&
        (!notification.userId || notification.userId === identity.userId) &&
        ws.readyState === ws.OPEN
      ) {
        ws.send(message);
      }
    }
  }

  onModuleDestroy() {
    this.wss?.close();
  }
}
