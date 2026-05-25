// import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { NextFunction, Request, Response } from "express";

import { STAGE_ID } from "#bet/bet.constants.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { EditionService } from "./edition.service.js";
import {
  getEditionInfoFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
} from "./edition.util.js";

export class EditionController extends BaseController {
  constructor(
    private matchService: MatchService,
    private editionService: EditionService,
  ) {
    super();
  }

  getCurrentEditionAndRound = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      return getEditionInfoFromCacheOrFetch(this.editionService);
    });
  };

  getReferees = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition, editionStart } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition || !editionStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      return getRefereesFromCacheOrFetch(this.editionService, currentEdition, currentEdition);
    });
  };

  getStadiums = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition, editionStart } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition || !editionStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      return getStadiumsFromCacheOrFetch(this.editionService, currentEdition, currentEdition);
    });
  };

  getStagesTimestamps = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition, editionStart } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition || !editionStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const response = await this.matchService.getEarliestMatchesForRounds(currentEdition);
      const returnObj = [
        { stageId: STAGE_ID.BEFORE_START, timestamp: editionStart.toString() },
        { stageId: STAGE_ID.PLAYOFFS, timestamp: response.find((r) => r.round === 4)?.timestamp ?? null },
        { stageId: STAGE_ID.QUARTERFINALS, timestamp: response.find((r) => r.round === 5)?.timestamp ?? null },
      ];

      return returnObj;
    });
  };
}
