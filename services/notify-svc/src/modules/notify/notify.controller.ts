import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { MarkReadInput } from "@epl/contracts";
import { NotifyService } from "./notify.service";

@Controller("notifications")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class NotifyController {
  constructor(private readonly notify: NotifyService) {}

  @Get()
  @RequirePermissions("notify:read")
  list(@Ctx() ctx: RequestContext) {
    return this.notify.list(ctx);
  }

  @Post("read")
  @RequirePermissions("notify:read")
  markRead(@Ctx() ctx: RequestContext, @Body() body: unknown) {
    const input = MarkReadInput.parse(body ?? {});
    return this.notify.markRead(ctx, input.ids);
  }
}
