// import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { NextFunction, Request, Response } from "express";

import { STAGE_ID } from "#bet/bet.constants.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { checkEdition } from "#utils/checkEdition.js";
import { SeasonService } from "./season.service.js";

export class SeasonController extends BaseController {
  constructor(
    private matchService: MatchService,
    private seasonService: SeasonService,
  ) {
    super();
  }

  getCurrentSeasonAndRound = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const edition = process.env.EDITION;
      const editionStart = process.env.EDITION_START;
      const editionId = edition ? parseInt(edition) : null;

      return {
        currentEdition: editionId,
        currentRound: editionId ? await this.seasonService.getCurrentRound(editionId) : null,
        editionStart: editionStart ? parseInt(editionStart) : null,
      };
    });
  };

  getStagesTimestamps = async (req: Request, res: Response, next: NextFunction) => {
    await this.handleRequest(req, res, next, async () => {
      const { edition, editionStart } = checkEdition(req.params.season);
      const response = await this.matchService.getEarliestMatchesForRounds(edition);
      const returnObj = [
        { stageId: STAGE_ID.BEFORE_START, timestamp: editionStart.toString() },
        { stageId: STAGE_ID.PLAYOFFS, timestamp: response.find((r) => r.round === 4)?.timestamp ?? null },
        { stageId: STAGE_ID.QUARTERFINALS, timestamp: response.find((r) => r.round === 5)?.timestamp ?? null },
      ];

      // const returnObj = {
      //   currentEdition: edition,
      //   editionStart: editionStart,
      // };

      return returnObj;
    });
  };
}
