import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { DocumentModule } from "./modules/document/document.module";

@Module({
  imports: [HealthModule, DocumentModule],
})
export class AppModule {}
