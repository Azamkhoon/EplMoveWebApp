import { Body, Controller, Get, Param, Post, Query, NotFoundException } from "@nestjs/common";
import { LoadStatus } from "@epl/contracts";
import { LoadService } from "./load.service";

/**
 * Internal (gateway-private) load lookup. Used by shipment-svc when it consumes
 * bid.accepted and needs the load's route/cargo to build the shipment.
 * Tenant is passed explicitly (no JWT on the internal hop).
 */
@Controller("internal/loads")
export class LoadInternalController {
  constructor(private readonly loads: LoadService) {}

  @Get(":id")
  async get(@Param("id") id: string, @Query("tenantId") tenantId: string) {
    if (!tenantId) throw new NotFoundException("tenantId required");
    return this.loads.getById(
      { userId: "system", tenantId, role: "system", correlationId: "internal" },
      id,
    );
  }

  @Post(":id/transition")
  async transition(
    @Param("id") id: string,
    @Body() body: { tenantId?: string; to?: string },
  ) {
    if (!body.tenantId) throw new NotFoundException("tenantId required");
    return this.loads.transition(
      {
        userId: "00000000-0000-0000-0000-000000000000",
        tenantId: body.tenantId,
        role: "system",
        correlationId: crypto.randomUUID(),
      },
      id,
      LoadStatus.parse(body.to),
    );
  }
}
