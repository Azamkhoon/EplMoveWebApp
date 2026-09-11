import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { config } from "../../config";

type CompanyRecord = {
  name?: string;
  companyName?: string;
  fullName?: string;
  tin?: string;
  inn?: string;
  vatNumber?: string;
  status?: string;
  data?: CompanyRecord;
};

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleUpperCase("uz")
    .replace(/[“”"'`ʻʼ]/g, "")
    .replace(/\b(MCHJ|ООО|LLC|AJ|АО|JSC)\b/g, "")
    .replace(/[^A-ZА-ЯЁЎҚҒҲ0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

@Injectable()
export class IHamkorService {
  async verifyCompany(input: { vatNumber: string; companyName: string }) {
    if (!config.IHAMKOR_API_URL || !config.IHAMKOR_API_TOKEN) {
      if (config.COMPANY_VERIFICATION_MODE === "optional" && config.NODE_ENV !== "production") {
        return {
          verified: false,
          registeredName: input.companyName,
          status: "development_unverified",
        };
      }
      throw new ServiceUnavailableException(
        "Company verification is not configured. Add IHAMKOR_API_URL and IHAMKOR_API_TOKEN.",
      );
    }

    const url = new URL(config.IHAMKOR_API_URL);
    url.searchParams.set("tin", input.vatNumber);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${config.IHAMKOR_API_TOKEN}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException("iHamkor verification is temporarily unavailable");
    }
    if (!response.ok) {
      throw new BadGatewayException(`iHamkor verification failed (${response.status})`);
    }

    const payload = (await response.json()) as CompanyRecord;
    const company = payload.data ?? payload;
    const registeredName = company.companyName ?? company.fullName ?? company.name;
    const registeredTin = company.tin ?? company.inn ?? company.vatNumber;

    if (!registeredName || String(registeredTin) !== input.vatNumber) {
      throw new UnprocessableEntityException("Company was not found for this VAT/TIN");
    }
    if (normalizeName(registeredName) !== normalizeName(input.companyName)) {
      throw new UnprocessableEntityException(
        "Company name does not match the name registered for this VAT/TIN",
      );
    }

    return { verified: true, registeredName, status: company.status };
  }
}
