import type { IUser } from "#user/user.types.js";

import { NextFunction, Request, Response } from "express";

import { connection, getPoolStats } from "#database/db.js";
import { BaseController } from "#shared/base.controller.js";
import { cachedInfo } from "#utils/dataCache.js";

// Extend express-session types to include 'user' property
declare module "express-session" {
  interface SessionData {
    user: IUser | null;
  }
}

export class AppController extends BaseController {
  constructor() {
    super();
  }

  getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const pool = getPoolStats();
      const cacheStats = cachedInfo.getStats();
      try {
        await connection.query("SELECT 1");
        return { cacheStats, db: "ok", pool, status: "ok" };
      } catch {
        return { cacheStats, db: "unreachable", pool, status: "error" };
      }
    });
  };
}
