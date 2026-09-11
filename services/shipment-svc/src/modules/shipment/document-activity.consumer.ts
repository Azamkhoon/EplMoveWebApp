import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Events, type DocumentRequest, type ShipmentDocument } from "@epl/contracts";
import { PubSubEventBus } from "@epl/events";
import { createLogger } from "@epl/observability";
import { config } from "../../config";
import { ShipmentService } from "./shipment.service";

const logger = createLogger("shipment-svc:doc-activity");

@Injectable()
export class DocumentActivityConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new PubSubEventBus(config.PUBSUB_PROJECT_ID);

  constructor(private readonly shipments: ShipmentService) {}

  async onModuleInit() {
    await this.bus.subscribe(Events.Topics.doc, "shipment-svc.doc-activity", async (event) => {
      const payload = event.payload as {
        request?: DocumentRequest;
        document?: ShipmentDocument;
        requestId?: string;
      };
      const shipmentId = payload.request?.shipmentId ?? payload.document?.shipmentId;
      if (!shipmentId) return;

      let title: string | undefined;
      let description: string | undefined;
      let referenceId: string | null = null;
      if (event.type === Events.DocEventType.Requested && payload.request) {
        title = `${payload.request.brokerName} requested ${payload.request.documentType}`;
        description = payload.request.comment ?? payload.request.description;
        referenceId = payload.request.id;
      } else if (event.type === Events.DocEventType.Uploaded && payload.document) {
        title = `${payload.document.type} uploaded`;
        referenceId = payload.requestId ?? payload.document.id;
      } else if (event.type === Events.DocEventType.RequestReviewed && payload.request) {
        title = `${payload.request.documentType} ${payload.request.status.toLowerCase().replace(/_/g, " ")}`;
        description = payload.request.comment;
        referenceId = payload.request.id;
      }
      if (!title) return;

      await this.shipments.recordExternalActivity(event.id, event.tenantId, {
        shipmentId,
        type: event.type,
        title,
        description,
        actorUserId: event.actor.userId,
        actorRole: event.actor.role,
        referenceId,
      });
    });
    logger.info("subscribed to document activity events");
  }

  async onModuleDestroy() {
    await this.bus.close().catch(() => undefined);
  }
}
