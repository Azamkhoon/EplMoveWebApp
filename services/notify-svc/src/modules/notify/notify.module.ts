import { Module } from "@nestjs/common";
import { NotifyController } from "./notify.controller";
import { NotifyService } from "./notify.service";
import { EventsConsumer } from "./events.consumer";
import { TenantClient } from "./tenant.client";
import { NotificationWsGateway } from "./ws.gateway";

@Module({
  controllers: [NotifyController],
  providers: [NotifyService, EventsConsumer, TenantClient, NotificationWsGateway],
})
export class NotifyModule {}
