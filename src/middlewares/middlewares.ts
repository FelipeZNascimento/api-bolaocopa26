import { RequestHandler } from "express";
import { NextFunction, Request, Response } from "express";

import { UserService } from "#user/user.service.js";

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

export const middleware: RequestHandler = (req, res) => {
  res.send("Hello World!");
};
