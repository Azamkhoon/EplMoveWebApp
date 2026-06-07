import { Module } from "@nestjs/common";
import { GeniusController } from "./genius.controller";
import { GeniusService } from "./genius.service";

@Module({
  controllers: [GeniusController],
  providers: [GeniusService],
})
export class GeniusModule {}
