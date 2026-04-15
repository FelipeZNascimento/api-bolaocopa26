import type { PoolOptions } from "mysql2/promise";

import config from "#database/config.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import mysql from "mysql2/promise";

const poolOptions = config.db as unknown as PoolOptions;
export const connection = mysql.createPool(poolOptions);

connection.on("connection", function (connection) {
  // handy for testing
  console.log("Pool id %d connected", connection.threadId);
});

connection.on("enqueue", function () {
  // handy for testing
  console.log("Waiting for available connection slot");
});

connection.on("acquire", function (connection) {
  // handy for testing
  console.log("Connection %d acquired", connection.threadId);
});

connection.on("release", function (connection) {
  // handy for testing
  console.log("Connection %d released", connection.threadId);
});

interface MySqlLikeError {
  code?: string;
  errno?: number;
  message?: string;
  sqlMessage?: string;
  sqlState?: string;
}

type QueryParams = readonly unknown[] | Record<string, unknown>;

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
        process.env.NODE_ENV === "development"
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
      process.env.NODE_ENV === "development"
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
    const [results] = await connection.query(sql, params);
    return results as T;
  } catch (error) {
    throw toDbAppError(error);
  }
}

export default {
  query,
};
