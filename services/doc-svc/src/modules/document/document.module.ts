import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { OutboxRelay } from "./outbox.relay";

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, OutboxRelay, Reflector],
})
export class DocumentModule {}
