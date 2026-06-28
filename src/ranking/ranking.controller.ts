import { NextFunction, Request, Response } from "express";
import { BetService } from "#bet/bet.service.js";
import { EditionService } from "#edition/edition.service.js";
import { logger } from "#logger/logger.service.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { calculateRanking } from "./ranking.utils.js";
export class RankingController extends BaseController {
  constructor(
    private editionService: EditionService,
    private userService: UserService,
    private matchService: MatchService,
    private teamService: TeamService,
    private betService: BetService,
  ) {
    super();
  }

  getRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const cachedRanking = cachedInfo.get(CACHE_KEYS.GLOBAL_RANKING);
      if (cachedRanking) {
        logger.debug("Returning ranking from cache");
        return cachedRanking;
      }

      const ranking = await calculateRanking(
        this.editionService,
        this.userService,
        this.betService,
        this.teamService,
        this.matchService,
      );
      cachedInfo.set(CACHE_KEYS.GLOBAL_RANKING, ranking, 60 * 60 * 24 * 1); // Cache for 4h
      return ranking;
    });
  };
}
