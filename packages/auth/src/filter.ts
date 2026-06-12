import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";

/**
 * Maps thrown errors to the platform's standard error contract:
 *   { error: { code, message, details?, traceId? } }
 * (see docs/architecture/04-security.md). Use as a global filter in every service.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest();
    const traceId =
      req?.headers?.["x-correlation-id"] ?? req?.headers?.["x-request-id"] ?? undefined;

    if (exception instanceof ZodError) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: exception.flatten(),
          traceId,
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string" ? body : ((body as { message?: string }).message ?? exception.message);
      return res.status(status).json({
        error: { code: codeFromStatus(status), message, traceId },
      });
    }

    // Unexpected (non-HTTP) error: log it — otherwise 500s are undiagnosable.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        msg: "unhandled exception",
        traceId,
        path: req?.url,
        err:
          exception instanceof Error
            ? { name: exception.name, message: exception.message, stack: exception.stack }
            : String(exception),
      }),
    );
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: "INTERNAL", message: "Internal server error", traceId },
    });
  }
}

function codeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "ERROR";
  }
}
