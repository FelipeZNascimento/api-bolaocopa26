import type { IUser } from "#user/user.types.js";

import { MailerService } from "#mailer/mailer.service.js";
import { clearRankingCache } from "#ranking/ranking.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { UserService } from "#user/user.service.js";
import { checkExistingEntries } from "#user/user.utils.js";
// import { generateVerificationToken, validateEmail } from "#user/user.utils.js";
import { AppError } from "#utils/appError.js";
import { cachedInfo } from "#utils/dataCache.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NextFunction, Request, Response } from "express";
import { promisify } from "util";

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

  deleteFromEdition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const user = req.session.user;

      if (!user || !user.admin) {
        return [];
      }

      const reqBody = req.body as { userId: number };
      const { userId } = reqBody;

      if (!userId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      await this.userService.deleteFromEdition(userId, editionId);
      const response: IUser[] = await this.userService.getAllByEdition(editionId);
      return response;
    });
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const reqBody = req.body as { email: string };
      const { email } = reqBody;

      if (!email) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const resetToken = generateVerificationToken();
      cachedInfo.set(`PASSWORD_RESET_${email}`, resetToken, 60 * 60); // 60 minutes expiration

      await this.mailerService.sendPasswordResetEmail(email, resetToken);
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

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      if (!user || !user.admin) {
        return [];
      }

      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const response: IUser[] = await this.userService.getAllByEdition(editionId);
      return response;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.params.userId;
      const edition = req.params.edition || process.env.EDITION;

      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      if (editionId === 0) {
        throw new AppError("Parâmetro inválido", 400, ErrorCode.INVALID_INPUT);
      }

      if (!userId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      } else {
        const response = await this.userService.getById(parseInt(userId), editionId);
        return response;
      }
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
      const reqBody = req.body as { email: string; password: string };
      const { email, password } = reqBody;

      if (!email || !password) {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }

      const userResponse = await this.userService.login(email, password);
      if (userResponse.length === 0) {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }

      let user = userResponse.find((u) => u.editionId === editionId);
      // If the user exists but is not associated with the current edition, create the association
      if (user === undefined) {
        await this.userService.setOnCurrentSeason(editionId, userResponse[0].id);
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
      const sessionSave = promisify(req.session.save.bind(req.session));
      await sessionSave();

      // regenerate the session, which is good practice to help
      // guard against forms of session fixation
      const sessionRegenerate = promisify(req.session.regenerate.bind(req.session));
      await sessionRegenerate();
    });
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      const reqBody = req.body as { email: string; name: string; nickname: string; password: string };
      const { email, name, nickname, password } = reqBody;

      if (!email || !password || !name || !nickname) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const isValid = await checkExistingEntries(this.userService, email, nickname);
      if (!isValid) {
        throw new AppError("Email ou apelido já registrado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const registerResponse = await this.userService.register(email, name, nickname, password);
      if (registerResponse.affectedRows === 0) {
        throw new AppError("Registro falhou", 500, ErrorCode.DB_ERROR);
      }

      const { insertId } = registerResponse;
      const setOnCurrentSeasonResponse = await this.userService.setOnCurrentSeason(parseInt(edition), insertId);

      if (setOnCurrentSeasonResponse.affectedRows === 0) {
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

      await this.mailerService.sendSignupEmail(email, nickname);
      return { ...user, favorites: parsedFavorites };
    });
  };

  updateActiveStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const user = req.session.user;

      if (!user || !user.admin) {
        return [];
      }

      const reqBody = req.body as { newStatus: boolean; userId: number };
      const { newStatus, userId } = reqBody;

      if (newStatus === undefined || !userId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      await this.userService.updateActiveStatus(userId, editionId, newStatus);
      if (newStatus === true) {
        await this.mailerService.sendActivationEmail(user.email, user.nickname);
      }
      const response: IUser[] = await this.userService.getAllByEdition(editionId);
      return response;
    });
  };

  updateFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (!user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      const reqBody = req.body as { favorites: number[] };
      const { favorites } = reqBody;

      if (!favorites) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const favoritesString = JSON.stringify(favorites);
      const updateResponse = await this.userService.updateFavorites(user.id, editionId, favoritesString);
      if (updateResponse.affectedRows > 0) {
        // update session data
        user.favorites = favoritesString;
        req.session.user = user;

        return req.session.user;
      }
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const reqBody = req.body as { currentPassword: string; email: string; newPassword: string; token: string };
      const { currentPassword, email, newPassword, token } = reqBody;

      if (token) {
        // If token is provided, it's a password reset request
        if (!email || !newPassword) {
          throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
        }

        const cachedToken = cachedInfo.get(`PASSWORD_RESET_${email}`);
        if (cachedToken !== token) {
          throw new AppError("Token inválido ou expirado", 409, ErrorCode.VALIDATION_ERROR);
        }

        const user = await this.userService.getByEmail(email);
        if (user) {
          cachedInfo.del(`PASSWORD_RESET_${email}`);
          void this.userService.updateLastOnlineTime(user.id);
          return await this.userService.updatePasswordFromToken(newPassword, user.id);
        }

        return null;
      } else if (currentPassword) {
        // If currentPassword is provided, it's a regular password update request
        if (!req.session.user) {
          throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
        }
        if (!newPassword) {
          throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
        }
        const user = req.session.user;

        const updatePasswordResponse = await this.userService.updatePassword(currentPassword, newPassword, user.id);
        if (updatePasswordResponse.affectedRows === 0) {
          throw new AppError("Senha incorreta", 409, ErrorCode.INVALID_PASSWORD);
        }

        return;
      } else {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }
    });
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (!user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      const reqBody = req.body as { name: string; nickname: string };
      const { name, nickname } = reqBody;

      if (!name || !nickname) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const isValid = await checkExistingEntries(this.userService, user.email, nickname, user.id);
      if (!isValid) {
        throw new AppError("Email ou apelido já registrado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const updateProfileResponse = await this.userService.updateProfile(user.id, name, nickname);
      if (updateProfileResponse.affectedRows > 0) {
        // update session data
        user.name = name;
        user.nickname = nickname;
        req.session.user = user;

        // clear cached rankings to reflect name change
        clearRankingCache();
        const favoritesResponse: string = await this.userService.getFavoritesById(user.id, editionId);
        const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];

        return { ...user, favorites: parsedFavorites };
      }

      const favoritesResponse: string = await this.userService.getFavoritesById(user.id, editionId);
      const parsedFavorites: number[] = favoritesResponse ? (JSON.parse(favoritesResponse) as number[]) : [];
      const userResponse = await this.userService.getById(user.id, editionId);
      if (!userResponse) {
        return null;
      }
      return { ...userResponse, favorites: parsedFavorites };
    });
  };
}
