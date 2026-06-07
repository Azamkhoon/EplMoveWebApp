import { Controller, Get, Param, Query, NotFoundException } from "@nestjs/common";
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
}
