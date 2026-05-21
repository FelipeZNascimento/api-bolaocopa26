import { RequestHandler } from "express";
import { NextFunction, Request, Response } from "express";

import { UserService } from "#user/user.service.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

interface CacheOptions {
  duration?: number;
  private?: boolean;
}

export const cache = (options: CacheOptions = {}) => {
  const duration = options.duration ?? 300; // 5 minutes default

  return (req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", `${options.private ? "private" : "public"}, max-age=${duration.toString()}`);
    next();
  };
};

export const updateUserActivity = (userService: UserService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session.user?.id) {
      void userService.updateLastOnlineTime(req.session.user.id);
    }
    next();
  };
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session.user) {
    next(new AppError("Não autenticado", 401, ErrorCode.UNAUTHORIZED));
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session.user?.admin) {
    next(new AppError("Acesso negado", 403, ErrorCode.FORBIDDEN));
    return;
  }
  next();
};

export const middleware: RequestHandler = (req, res) => {
  res.send("Hello World!");
};
