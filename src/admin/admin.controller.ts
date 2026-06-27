import type { IUser } from "#user/user.types.js";

import { NextFunction, Request, Response } from "express";

import { deleteFromEditionSchema, updateActiveStatusSchema } from "#admin/admin.schemas.js";
import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { MailerService } from "#mailer/mailer.service.js";
import { BaseController } from "#shared/base.controller.js";
import { UserService } from "#user/user.service.js";
import { AppError } from "#utils/appError.js";
import { cachedInfo, warmUpCache } from "#utils/dataCache.js";
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
    private editionService: EditionService,
  ) {
    super();
  }

  deleteFromEdition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const { userId } = parseBody(deleteFromEditionSchema, req.body);

      await this.userService.deleteFromEdition(userId, currentEdition);
      const response: IUser[] = await this.userService.getAllByEdition(currentEdition);
      return response;
    });
  };

  flushAll = (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return this.handleRequest(req, res, next, () => {
      cachedInfo.flushAll();
      return warmUpCache();
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const response: IUser[] = await this.userService.getAllByEdition(currentEdition);
      return response;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.params.userId as string;
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (!userId) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      } else {
        const response = await this.userService.getById(parseInt(userId), currentEdition);
        return response;
      }
    });
  };

  updateActiveStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const { newStatus, userId } = parseBody(updateActiveStatusSchema, req.body);

      await this.userService.updateActiveStatus(userId, currentEdition, newStatus);
      if (newStatus === true) {
        const activatedUser = await this.userService.getById(userId, currentEdition);
        if (!activatedUser) {
          throw new AppError("Usuário não encontrado", 404, ErrorCode.NOT_FOUND);
        }
        await this.mailerService.sendActivationEmail(activatedUser.email, activatedUser.nickname);
      }
      const response: IUser[] = await this.userService.getAllByEdition(currentEdition);
      return response;
    });
  };
}
