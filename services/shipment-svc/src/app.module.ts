import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ShipmentModule } from "./modules/shipment/shipment.module";

@Module({
  imports: [HealthModule, ShipmentModule],
})
export class AppModule {}
