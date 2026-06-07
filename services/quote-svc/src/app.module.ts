import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { QuoteModule } from "./modules/quote/quote.module";

@Module({
  imports: [HealthModule, QuoteModule],
})
export class AppModule {}
