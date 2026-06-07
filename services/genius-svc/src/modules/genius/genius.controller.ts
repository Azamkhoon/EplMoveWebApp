import { Body, Controller, Post } from "@nestjs/common";
import { GeniusService } from "./genius.service";

/**
 * EPL Genius endpoints. No tenant data is touched, so these don't need the
 * RLS/tenant context — the gateway still requires a valid JWT for the tool
 * routes. /ask matches the SPA's askGenius() seam ({ question } → { answer, sources }).
 */
@Controller("genius")
export class GeniusController {
  constructor(private readonly genius: GeniusService) {}

  @Post("ask")
  ask(@Body() body: unknown) {
    return this.genius.ask(body);
  }

  @Post("rate-estimate")
  rate(@Body() body: unknown) {
    return this.genius.estimateRate(body);
  }

  @Post("route-optimize")
  route(@Body() body: unknown) {
    return this.genius.optimizeRoute(body);
  }

  @Post("doc-assist")
  docAssist(@Body() body: unknown) {
    return this.genius.docAssist(body);
  }
}
