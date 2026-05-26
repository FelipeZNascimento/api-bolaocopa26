import type { IUser } from "#user/user.types.js";

import { NextFunction, Request, Response } from "express";

import { MailerService } from "#mailer/mailer.service.js";
import { clearRankingCache } from "#ranking/ranking.utils.js";
import { BaseController } from "#shared/base.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  subscribePushNotificationSchema,
  updateFavoritesSchema,
  updatePasswordFromTokenSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "#user/user.schemas.js";
import { UserService } from "#user/user.service.js";
import { checkExistingEntries } from "#user/user.utils.js";
import { AppError } from "#utils/appError.js";
import { cachedInfo } from "#utils/dataCache.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { parseBody } from "#utils/parseBody.js";

import { generateVerificationToken } from "./user.utils.js";

// Extend express-session types to include 'user' property
declare module "express-session" {
  interface SessionData {
    user: IUser | null;
  }
}

export class UserController extends BaseController {
  constructor(
    private userService: UserService,
    private mailerService: MailerService,
  ) {
    super();
  }

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { email } = parseBody(forgotPasswordSchema, req.body);

      const isEmailRegistered = await this.userService.isEmailRegistered(email);
      if (!isEmailRegistered) {
        return;
      }

      const resetToken = generateVerificationToken();
      cachedInfo.set(`PASSWORD_RESET_${email}`, resetToken, 60 * 60); // 60 minutes expiration

      const locale = req.get("accept-language");
      await this.mailerService.sendPasswordResetEmail(email, resetToken, locale);
    });
  };

  getActiveProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      if (!user) {
        return null;
      }

      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const userResponse = await this.userService.getById(user.id, editionId);
      if (!userResponse) {
        return null;
      }
      const favoritesResponse: string = await this.userService.getFavoritesById(user.id, editionId);
      const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];
      return { ...userResponse, favorites: parsedFavorites };
    });
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      if (req.session.user) {
        return req.session.user;
      }
      const { email, password } = parseBody(loginSchema, req.body);

      const userResponse = await this.userService.login(email, password);
      if (userResponse.length === 0) {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }

      let user = userResponse.find((u) => u.editionId === editionId);
      // If the user exists but is not associated with the current edition, create the association
      if (user === undefined) {
        await this.userService.setOnCurrentEdition(editionId, userResponse[0].id);
        userResponse[0].isActive = false; // Set new edition users as inactive by default
      }
      user = userResponse[0];

      user.timestamp = Date.now();
      req.session.user = user;

      const favoritesResponse: string = await this.userService.getFavoritesById(user.id, editionId);
      const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];
      return { ...user, favorites: parsedFavorites };
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      req.session.user = null;
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) return reject(err instanceof Error ? err : new Error(String(err)));
          resolve();
        });
      });
      const isCrossOriginEnv = ["pprod", "production"].includes(process.env.NODE_ENV ?? "development");
      res.clearCookie("connect.sid", {
        sameSite: isCrossOriginEnv ? "none" : "strict",
        secure: isCrossOriginEnv,
      });
    });
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      const { email, name, nickname, password } = parseBody(registerSchema, req.body);

      const isValid = await checkExistingEntries(this.userService, email, nickname);
      if (!isValid) {
        throw new AppError("Email ou apelido já registrado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const registerResponse = await this.userService.register(email, name, nickname, password);
      if (registerResponse.affectedRows === 0) {
        throw new AppError("Registro falhou", 500, ErrorCode.DB_ERROR);
      }

      const { insertId } = registerResponse;
      const setOnCurrentEditionResponse = await this.userService.setOnCurrentEdition(parseInt(edition), insertId);

      if (setOnCurrentEditionResponse.affectedRows === 0) {
        throw new AppError("Registro falhou (edição)", 204, ErrorCode.DB_ERROR);
      }

      const userResponse = await this.userService.login(email, password);
      if (userResponse.length === 0) {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }
      const user = userResponse[0];
      user.timestamp = Date.now();
      req.session.user = user;

      const favoritesResponse: string = await this.userService.getFavoritesById(user.id, editionId);
      const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];
      const locale = req.get("accept-language");

      await this.mailerService.sendSignupEmail(email, nickname, locale);
      return { ...user, favorites: parsedFavorites };
    });
  };

  subscribePushNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      const { endpoint, keys } = parseBody(subscribePushNotificationSchema, req.body);

      await this.userService.updatePushSubscription(user!.id, endpoint, keys);
    });
  };

  updateFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const { favorites } = parseBody(updateFavoritesSchema, req.body);

      const favoritesString = JSON.stringify(favorites);
      const updateResponse = await this.userService.updateFavorites(user!.id, editionId, favoritesString);
      if (updateResponse.affectedRows > 0) {
        // update session data
        user!.favorites = favoritesString;
        req.session.user = user;

        return req.session.user;
      }
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentPassword, newPassword } = parseBody(updatePasswordSchema, req.body);
      const user = req.session.user;
      const updatePasswordResponse = await this.userService.updatePassword(currentPassword, newPassword, user!.id);
      if (updatePasswordResponse.affectedRows === 0) {
        throw new AppError("Senha incorreta", 409, ErrorCode.INVALID_PASSWORD);
      }
      return;
    });
  };

  updatePasswordFromToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { email, newPassword, token } = parseBody(updatePasswordFromTokenSchema, req.body);

      const cachedToken = cachedInfo.get(`PASSWORD_RESET_${email}`);
      if (cachedToken !== token) {
        throw new AppError("Token inválido ou expirado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const user = await this.userService.getByEmail(email);
      cachedInfo.del(`PASSWORD_RESET_${email}`);
      void this.userService.updateLastOnlineTime(user!.id);
      return await this.userService.updatePasswordFromToken(newPassword, user!.id);
    });
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      const { name, nickname } = parseBody(updateProfileSchema, req.body);

      const isValid = await checkExistingEntries(this.userService, user!.email, nickname, user!.id);
      if (!isValid) {
        throw new AppError("Email ou apelido já registrado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const updateProfileResponse = await this.userService.updateProfile(user!.id, name, nickname);
      if (updateProfileResponse.affectedRows > 0) {
        // update session data
        user!.name = name;
        user!.nickname = nickname;
        req.session.user = user;

        // clear cached rankings to reflect name change
        clearRankingCache();
        const favoritesResponse: string = await this.userService.getFavoritesById(user!.id, editionId);
        const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];

        return { ...user, favorites: parsedFavorites };
      }

      const favoritesResponse: string = await this.userService.getFavoritesById(user!.id, editionId);
      const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];
      const userResponse = await this.userService.getById(user!.id, editionId);
      if (!userResponse) {
        return null;
      }
      return { ...userResponse, favorites: parsedFavorites };
    });
  };
}
