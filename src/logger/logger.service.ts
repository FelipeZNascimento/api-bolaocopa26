import pino from "pino";

const environment = process.env.NODE_ENV ?? "development";
const isDevelopment = environment === "development" || environment === "pprod";

// Create the base logger configuration
const logger = pino({
  // Base configuration for all logs
  base: {
    env: environment,
    pid: process.pid,
  },

  level: process.env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info"),

  // Redact sensitive information from logs
  redact: {
    censor: "[REDACTED]",
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.newPassword",
      "req.body.oldPassword",
      "res.headers['set-cookie']",
    ],
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Format timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Development: pretty print, Production: JSON
  transport: isDevelopment
    ? {
        options: {
          colorize: process.stdout.isTTY,
          ignore: "pid,hostname",
          singleLine: false,
          translateTime: "SYS:standard",
        },
        target: "pino-pretty",
      }
    : undefined,
});

/**
 * Create a child logger with additional context
 * Useful for adding context like userId, requestId, etc.
 */
export const createChildLogger = (bindings: Record<string, unknown>) => {
  return logger.child(bindings);
};

/**
 * Log levels available:
 * - trace: Very detailed, usually disabled in production
 * - debug: Detailed information for debugging
 * - info: General informational messages
 * - warn: Warning messages for potentially harmful situations
 * - error: Error messages for error events
 * - fatal: Critical errors that cause application to exit
 */
export { logger };
