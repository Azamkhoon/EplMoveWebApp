import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import {
  Ctx,
  ContextInterceptor,
  PermissionsGuard,
  RequirePermissions,
  type RequestContext,
} from "@epl/auth";
import { DocumentService } from "./document.service";

@Controller("documents")
@UseInterceptors(ContextInterceptor)
@UseGuards(PermissionsGuard)
export class DocumentController {
  constructor(private readonly docs: DocumentService) {}

  @Get()
  @RequirePermissions("doc:read")
  list(
    @Ctx() ctx: RequestContext,
    @Query("shipmentId") shipmentId?: string,
    @Query("type") type?: string,
  ) {
    return this.docs.list(ctx, { shipmentId, type });
  }

  @Get(":id")
  @RequirePermissions("doc:read")
  get(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.docs.get(ctx, id);
  }

  @Get(":id/download")
  @RequirePermissions("doc:read")
  async download(@Ctx() ctx: RequestContext, @Param("id") id: string, @Res() res: Response) {
    const { doc, data } = await this.docs.download(ctx, id);
    res.setHeader("Content-Type", doc.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.name}"`);
    res.send(data);
  }

  @Post()
  @RequirePermissions("doc:upload")
  upload(@Ctx() ctx: RequestContext, @Body() body: unknown) {
    return this.docs.upload(ctx, body);
  }

  @Post(":id/verify")
  @RequirePermissions("doc:upload")
  verify(@Ctx() ctx: RequestContext, @Param("id") id: string) {
    return this.docs.verify(ctx, id);
  }

  @Post("shipments/:shipmentId/pod")
  @RequirePermissions("doc:upload")
  confirmDelivery(@Ctx() ctx: RequestContext, @Param("shipmentId") shipmentId: string) {
    return this.docs.confirmDelivery(ctx, shipmentId);
  }
}
