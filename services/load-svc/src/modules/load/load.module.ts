import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LoadController } from "./load.controller";
import { LoadService } from "./load.service";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [LoadController],
  providers: [LoadService, OutboxRelay, Reflector],
})
export class LoadModule {}
