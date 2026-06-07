import {
  Body,
  Controller,
  Get,
  Param,
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
}
