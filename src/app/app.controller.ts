import type { IUser } from "#user/user.types.js";

import { NextFunction, Request, Response } from "express";

import { connection, getPoolStats } from "#database/db.js";
import { BaseController } from "#shared/base.controller.js";

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
      try {
        await connection.query("SELECT 1");
        return { db: "ok", pool, status: "ok" };
      } catch {
        return { db: "unreachable", pool, status: "error" };
      }
    });
  };
}
