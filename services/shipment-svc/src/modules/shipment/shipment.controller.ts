import { Controller, Get, Param, UseGuards, UseInterceptors } from "@nestjs/common";
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
}
