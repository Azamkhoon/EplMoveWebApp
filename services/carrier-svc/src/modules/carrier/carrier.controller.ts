import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { CreateCarrierInput } from "@epl/contracts";
import { z } from "zod";
import { CarrierService } from "./carrier.service";

const RateInput = z.object({ stars: z.number().int().min(1).max(5), comment: z.string().optional() });

@Controller("carriers")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class CarrierController {
  constructor(private readonly carriers: CarrierService) {}

  @Get()
  @RequirePermissions("quote:read")
  list(@Query("mode") mode?: string) {
    return this.carriers.list(mode);
  }

  @Get(":id")
  @RequirePermissions("quote:read")
  get(@Param("id") id: string) {
    return this.carriers.get(id);
  }

  @Post()
  @RequirePermissions("tenant:manage")
  create(@Ctx() ctx: RequestContext, @Body() body: unknown) {
    return this.carriers.create(ctx, CreateCarrierInput.parse(body));
  }

  @Post(":id/rate")
  @RequirePermissions("quote:read")
  rate(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    const input = RateInput.parse(body);
    return this.carriers.rate(ctx, id, input.stars, input.comment);
  }
}

const ProvisionCarrierInput = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
});

/** Internal (gateway-private): quote-svc enriches bids with carrier summaries. */
@Controller("internal/carriers")
export class CarrierInternalController {
  constructor(private readonly carriers: CarrierService) {}

  @Get("summaries")
  summaries(@Query("ids") ids: string) {
    return this.carriers.summaries(ids ? ids.split(",").filter(Boolean) : []);
  }

  @Get()
  listAll(@Query("mode") mode?: string) {
    return this.carriers.list(mode);
  }

  /** tenant-svc calls this when a tenant registers with kind=carrier. */
  @Post("provision")
  provision(@Body() body: unknown) {
    const input = ProvisionCarrierInput.parse(body);
    return this.carriers.provision(input.tenantId, input.name);
  }
}
