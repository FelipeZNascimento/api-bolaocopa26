import { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";

import { logger } from "./logger.service.js";

const environment = process.env.NODE_ENV ?? "development";
const isDevelopment = environment === "development" || environment === "pprod";

/**
 * HTTP request/response logging middleware using pino-http
 * Automatically logs all incoming requests and outgoing responses
 */
export const httpLogger = pinoHttp({
  // Don't log these paths (health checks, metrics, etc.)
  autoLogging: {
    ignore: (req) => {
      const ignoredPaths = ["/health", "/metrics", "/favicon.ico"];
      return ignoredPaths.some((path) => req.url?.startsWith(path));
    },
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },

  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    if (res.statusCode >= 300) {
      return "info";
    }
    return "info";
  },

  // Add custom properties to each log
  customProps: (req) => {
    // Cast to Express Request to access session and route
    const expressReq = req as unknown as Request;
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      route: (expressReq.route?.path as string | undefined) ?? expressReq.path ?? undefined,
      userEmail: expressReq.session?.user?.email,
      userId: expressReq.session?.user?.id,
    };
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  logger,

  // Serialize request and response
  // These serializers work with pino-http's internal types which are loosely typed
  // eslint-disable-next-line max-len
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
  serializers: {
    req: (req: any) => ({
      body: isDevelopment ? req.raw?.body : undefined,
      headers: {
        "content-type": req.headers?.["content-type"],
        host: req.headers?.host,
        "user-agent": req.headers?.["user-agent"],
      },
      id: req.id,
      method: req.method,
      params: req.params,
      query: req.query,
      url: req.url,
    }),
    res: (res: any) => ({
      headers: {
        "content-length": res.headers?.["content-length"],
        "content-type": res.headers?.["content-type"],
      },
      statusCode: res.statusCode,
    }),
  },
  // eslint-disable-next-line max-len
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
});

/**
 * Custom request logger middleware for specific use cases
 * Use this for logging at specific points in your request handling
 */
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  req.log = logger.child({
    requestId: Math.random().toString(36).substring(7),
    userId: req.session?.user?.id,
  });
  next();
};
