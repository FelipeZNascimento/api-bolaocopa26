import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
// import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { NextFunction, Request, Response } from "express";

export class SeasonController extends BaseController {
  constructor(private matchService: MatchService) {
    super();
  }

  getCurrentSeasonAndWeek = (req: Request, res: Response, next: NextFunction) => {
    const edition = process.env.EDITION;
    const editionStart = process.env.SEASON_START;

    const returnObj = {
      currentEdition: edition ? parseInt(edition) : null,
      editionStart: editionStart ? parseInt(editionStart) : null,
    };

    this.handleRequestFromCache(req, res, next, returnObj);
  };
}
