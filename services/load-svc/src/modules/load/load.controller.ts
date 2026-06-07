import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { LoadStatus } from "@epl/contracts";
import { LoadService } from "./load.service";

@Controller("loads")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class LoadController {
  constructor(private readonly loads: LoadService) {}

  @Post()
  @RequirePermissions("load:create")
  create(@Ctx() ctx: RequestContext, @Body() body: unknown) {
    return this.loads.create(ctx, body);
  }

  @Get()
  @RequirePermissions("load:read")
  list(
    @Ctx() ctx: RequestContext,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = status ? LoadStatus.parse(status) : undefined;
    return this.loads.list(ctx, { status: parsed, limit: limit ? Number(limit) : undefined });
  }

  @Get(":id")
  @RequirePermissions("load:read")
  get(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.loads.getById(ctx, id);
  }

  @Patch(":id")
  @RequirePermissions("load:update")
  update(@Ctx() ctx: RequestContext, @Param("id") id: string, @Body() body: unknown) {
    return this.loads.update(ctx, id, body);
  }

  @Post(":id/cancel")
  @RequirePermissions("load:cancel")
  cancel(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.loads.cancel(ctx, id);
  }

  @Post(":id/duplicate")
  @RequirePermissions("load:duplicate")
  duplicate(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.loads.duplicate(ctx, id);
  }

  @Post(":id/transition")
  @RequirePermissions("load:update")
  transition(
    @Ctx() ctx: RequestContext,
    @Param("id") id: string,
    @Body() body: { to: string },
  ) {
    return this.loads.transition(ctx, id, LoadStatus.parse(body.to));
  }
}
