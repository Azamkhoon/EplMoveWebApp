import pino, { type Logger } from "pino";

/**
 * Structured logging (pino) + tracing/metrics hooks (OpenTelemetry wiring
 * lands in Phase 1). Every service uses this so logs are consistent and
 * correlation-id aware. See docs/architecture/06-gcp-topology.md.
 */

export type { Logger };

export function createLogger(serviceName: string, level = process.env.LOG_LEVEL ?? "info"): Logger {
  return pino({
    level,
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

/** Child logger bound to a correlation id for a single request/event. */
export function withCorrelation(logger: Logger, correlationId: string): Logger {
  return logger.child({ correlationId });
}
