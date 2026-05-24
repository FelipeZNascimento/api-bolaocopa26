// import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { NextFunction, Request, Response } from "express";

import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { BaseController } from "#shared/base.controller.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NewsService } from "./news.service.js";

export class NewsController extends BaseController {
  constructor(
    private newsService: NewsService,
    private editionService: EditionService,
  ) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      return this.newsService.fetch(currentEdition);
    });
  };
}
