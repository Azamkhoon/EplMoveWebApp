import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { PositionReport } from "@epl/contracts";
import { TrackingService } from "./tracking.service";

@Controller("tracking")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get(":shipmentId")
  @RequirePermissions("shipment:read")
  state(@Ctx() ctx: RequestContext, @Param("shipmentId") id: string) {
    return this.tracking.getState(ctx, id);
  }

  @Get(":shipmentId/history")
  @RequirePermissions("shipment:read")
  history(@Ctx() ctx: RequestContext, @Param("shipmentId") id: string) {
    return this.tracking.history(ctx, id);
  }

  /** Ingest a GPS report (driver app / telematics; carrier/driver role in prod). */
  @Post(":shipmentId/positions")
  @RequirePermissions("shipment:read")
  ingest(@Ctx() ctx: RequestContext, @Param("shipmentId") id: string, @Body() body: unknown) {
    const report = PositionReport.parse({ ...(body as object), shipmentId: id });
    return this.tracking.ingest(ctx, report);
  }
}
