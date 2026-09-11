import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { QuoteService } from "./quote.service";

@Controller("quotes")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class QuoteController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  @RequirePermissions("quote:request")
  create(@Ctx() ctx: RequestContext, @Body() body: unknown) {
    return this.quotes.create(ctx, body);
  }

  @Get()
  @RequirePermissions("quote:read")
  list(@Ctx() ctx: RequestContext) {
    return this.quotes.list(ctx);
  }

  @Get(":id")
  @RequirePermissions("quote:read")
  get(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.quotes.getById(ctx, id);
  }

  @Post(":id/bids")
  @RequirePermissions("quote:request")
  submitBid(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.quotes.submitBid(ctx, id, body);
  }

  @Post(":id/bids/:bidId/accept")
  @RequirePermissions("quote:accept")
  accept(
    @Ctx() ctx: RequestContext,
    @Param("id") id: string,
    @Param("bidId") bidId: string,
  ) {
    return this.quotes.acceptBid(ctx, id, bidId);
  }

  @Post(":id/bids/:bidId/reject")
  @RequirePermissions("quote:accept")
  reject(
    @Ctx() ctx: RequestContext,
    @Param("id") id: string,
    @Param("bidId") bidId: string,
  ) {
    return this.quotes.rejectBid(ctx, id, bidId);
  }
}

/**
 * Carrier-side marketplace. Same service, but these routes require carrier
 * permissions and run cross-tenant (open quotes only) — see QuoteService
 * marketplaceTx + the marketplace_* RLS policies.
 */
@Controller("marketplace")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class MarketplaceController {
  constructor(private readonly quotes: QuoteService) {}

  @Get("quotes")
  @RequirePermissions("marketplace:read")
  openQuotes(@Ctx() ctx: RequestContext) {
    return this.quotes.listOpenQuotes(ctx);
  }

  @Get("bids")
  @RequirePermissions("marketplace:read")
  myBids(@Ctx() ctx: RequestContext) {
    return this.quotes.listCarrierBids(ctx);
  }

  @Post("quotes/:id/bids")
  @RequirePermissions("carrier:bid")
  bid(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.quotes.submitCarrierBid(ctx, id, body);
  }

  @Patch("bids/:id")
  @RequirePermissions("carrier:bid")
  updateBid(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.quotes.updateCarrierBid(ctx, id, body);
  }

  @Delete("bids/:id")
  @RequirePermissions("carrier:bid")
  withdrawBid(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.quotes.withdrawCarrierBid(ctx, id);
  }
}
