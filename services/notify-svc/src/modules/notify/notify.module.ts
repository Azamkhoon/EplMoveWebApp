import { Module } from "@nestjs/common";
import { NotifyController } from "./notify.controller";
import { NotifyService } from "./notify.service";
import { EventsConsumer } from "./events.consumer";

@Module({
  controllers: [NotifyController],
  providers: [NotifyService, EventsConsumer],
})
export class NotifyModule {}
