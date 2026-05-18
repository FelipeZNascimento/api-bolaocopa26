import { NextFunction, Request, Response } from "express";

import { logger } from "#logger/logger.service.js";
import { ApiResponse } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const route: string = (req.route?.path as string | undefined) ?? req.path ?? "/unknown";

  // Log the error with appropriate level
  if (statusCode >= 500) {
    logger.error(
      {
        err: error,
        method: req.method,
        route,
        statusCode,
        url: req.url,
        userId: req.session?.user?.id,
      },
      `Server Error: ${error.message}`,
    );
  } else if (statusCode >= 400) {
    logger.warn(
      {
        message: error.message,
        method: req.method,
        route,
        statusCode,
        url: req.url,
        userId: req.session?.user?.id,
      },
      `Client Error: ${error.message}`,
    );
  }

  if (error instanceof AppError) {
    ApiResponse.error(res, error.message, error.statusCode, error.code);
    return;
  }

  ApiResponse.error(res, "Internal server error", 500);
};
