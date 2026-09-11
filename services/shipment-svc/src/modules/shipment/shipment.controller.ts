import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { ShipmentService } from "./shipment.service";

@Controller("shipments")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class ShipmentController {
  constructor(private readonly shipments: ShipmentService) {}

  @Get()
  @RequirePermissions("shipment:read")
  list(@Ctx() ctx: RequestContext) {
    return this.shipments.list(ctx);
  }

  @Get(":id")
  @RequirePermissions("shipment:read")
  get(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.shipments.getById(ctx, id);
  }

  @Post(":id/broker-assignment")
  @RequirePermissions("broker:assign")
  assignBroker(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.shipments.assignBroker(ctx, id, body);
  }

  @Patch(":id/status")
  @RequirePermissions("shipment:update")
  updateStatus(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.shipments.updateStatus(ctx, id, body);
  }

  @Get(":id/messages")
  @RequirePermissions("shipment:read")
  messages(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.shipments.listMessages(ctx, id);
  }

  @Post(":id/messages")
  @RequirePermissions("shipment:read")
  sendMessage(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.shipments.sendMessage(ctx, id, body);
  }
}

/** Private service-to-service authorization lookup; not routed by the gateway. */
@Controller("internal/shipments")
export class ShipmentInternalController {
  constructor(private readonly shipments: ShipmentService) {}

  @Get(":id/access")
  access(
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Query("role") role = "system",
  ) {
    return this.shipments.accessFor(id, tenantId, role);
  }
}
