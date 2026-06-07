import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CarrierController, CarrierInternalController } from "./carrier.controller";
import { CarrierService } from "./carrier.service";

@Module({
  controllers: [CarrierController, CarrierInternalController],
  providers: [CarrierService, Reflector],
})
export class CarrierModule {}
