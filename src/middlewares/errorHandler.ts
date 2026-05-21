import { NextFunction, Request, Response } from "express";

import { ApiResponse } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  // Pass the real error to pino-http so it logs the actual message/stack instead
  // of generating a synthetic "failed with status code 500" error on response finish.
  (res as Response & { err?: Error }).err = error;

  if (error instanceof AppError) {
    ApiResponse.error(res, error.message, error.statusCode, error.code);
    return;
  }

  ApiResponse.error(res, "Internal server error", 500);
};
