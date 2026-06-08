import { Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { BillingService } from "./billing.service";

@Controller("invoices")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @RequirePermissions("billing:read")
  list(@Ctx() ctx: RequestContext) {
    return this.billing.list(ctx);
  }

  @Get(":id")
  @RequirePermissions("billing:read")
  get(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.billing.get(ctx, id);
  }

  @Post(":id/pay")
  @RequirePermissions("billing:pay")
  pay(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.billing.pay(ctx, id);
  }
}
