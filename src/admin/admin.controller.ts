import type { IUser } from "#user/user.types.js";

import { NextFunction, Request, Response } from "express";

import { deleteFromEditionSchema, updateActiveStatusSchema } from "#admin/admin.schemas.js";
import { MailerService } from "#mailer/mailer.service.js";
import { BaseController } from "#shared/base.controller.js";
import { UserService } from "#user/user.service.js";
import { AppError } from "#utils/appError.js";
import { cachedInfo } from "#utils/dataCache.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { parseBody } from "#utils/parseBody.js";

// Extend express-session types to include 'user' property
declare module "express-session" {
  interface SessionData {
    user: IUser | null;
  }
}

export class AdminController extends BaseController {
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

      const { userId } = parseBody(deleteFromEditionSchema, req.body);

      await this.userService.deleteFromEdition(userId, editionId);
      const response: IUser[] = await this.userService.getAllByEdition(editionId);
      return response;
    });
  };

  flushAll = (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return this.handleRequest(req, res, next, () => cachedInfo.flushAll());
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
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
  updateActiveStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      if (!edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);

      const { newStatus, userId } = parseBody(updateActiveStatusSchema, req.body);

      await this.userService.updateActiveStatus(userId, editionId, newStatus);
      if (newStatus === true) {
        const activatedUser = await this.userService.getById(userId, editionId);
        if (!activatedUser) {
          throw new AppError("Usuário não encontrado", 404, ErrorCode.NOT_FOUND);
        }
        await this.mailerService.sendActivationEmail(activatedUser.email, activatedUser.nickname);
      }
      const response: IUser[] = await this.userService.getAllByEdition(editionId);
      return response;
    });
  };
}
