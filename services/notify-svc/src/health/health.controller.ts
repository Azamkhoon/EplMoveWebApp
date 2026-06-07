import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("/health")
  liveness() {
    return { status: "ok", service: "notify-svc", ts: new Date().toISOString() };
  }

  @Get("/ready")
  readiness() {
    // Phase 1: check DB / broker connectivity here.
    return { status: "ready", service: "notify-svc" };
  }
}
