import type { PoolOptions } from "mysql2/promise";

import mysql from "mysql2/promise";

import config from "#database/config.js";
import { logger } from "#logger/logger.service.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

const poolOptions = config.db as unknown as PoolOptions;
export const connection = mysql.createPool(poolOptions);

// Log new connections at debug level
connection.on("connection", function (connection) {
  logger.debug({ threadId: connection.threadId }, "Database connection established");
});

// Warn when connection pool is exhausted
connection.on("enqueue", function () {
  logger.warn(
    { connectionLimit: poolOptions.connectionLimit },
    "Connection pool exhausted - request queued. Consider increasing SQL_CONNECTION_LIMIT.",
  );
});

// Log acquire/release at trace level (very verbose, usually disabled)
connection.on("acquire", function (connection) {
  logger.trace({ threadId: connection.threadId }, "Connection acquired from pool");
});

connection.on("release", function (connection) {
  logger.trace({ threadId: connection.threadId }, "Connection released to pool");
});

interface MySqlLikeError {
  code?: string;
  errno?: number;
  message?: string;
  sqlMessage?: string;
  sqlState?: string;
}

type QueryParams = Record<string, unknown> | unknown[];

const isMySqlLikeError = (error: unknown): error is MySqlLikeError => {
  return typeof error === "object" && error !== null && ("code" in error || "sqlMessage" in error);
};

const toDbAppError = (error: unknown): AppError => {
  if (isMySqlLikeError(error)) {
    const code = error.code;
    const connectErrorCodes = new Set([
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
      "PROTOCOL_CONNECTION_LOST",
    ]);

    if (code && connectErrorCodes.has(code)) {
      return new AppError(
        "Database connection error",
        503,
        ErrorCode.DB_CONNECTION_ERROR,
        true,
        process.env.NODE_ENV !== "production"
          ? {
              message: error.message,
              mysqlCode: code,
            }
          : undefined,
      );
    }

    return new AppError(
      "Database query error",
      500,
      ErrorCode.DB_QUERY_ERROR,
      true,
      process.env.NODE_ENV !== "production"
        ? {
            errno: error.errno,
            message: error.message,
            mysqlCode: code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState,
          }
        : undefined,
    );
  }

  return new AppError("Database error", 500, ErrorCode.DB_ERROR);
};

async function query<T = unknown>(sql: string, params: QueryParams = []): Promise<T> {
  try {
    const [results] = await connection.query(sql, params as unknown[]);
    return results as T;
  } catch (error) {
    throw toDbAppError(error);
  }
}

export default {
  query,
};
