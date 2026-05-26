import { ZodError, ZodType } from "zod";

import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((issue) => issue.message).join(", ");
      throw new AppError(message, 400, ErrorCode.INVALID_INPUT, true, err.issues);
    }
    throw err;
  }
}
