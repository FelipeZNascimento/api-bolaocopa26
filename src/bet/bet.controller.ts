import type { IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";
import type { ITeam } from "#team/team.types.js";

import { BetService } from "#bet/bet.service.js";
import { groupExtraBetsByType, parseExtraBetResult, parseExtraBets } from "#bet/bet.utils.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { checkEdition } from "#utils/checkEdition.js";
import { NextFunction, Request, Response } from "express";

export class BetController extends BaseController {
  constructor(
    private betService: BetService,
    private matchService: MatchService,
    private userService: UserService,
    private teamService: TeamService,
  ) {
    super();
  }

  getExtras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (req.session.user) {
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }
      const { edition, editionStart } = checkEdition(req.params.season);

      // Check to prevent fetching extras if season hasn't started yet
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (nowTimestamp < editionStart) {
        return {
          bets: [],
        };
      }

      const extraBets: IExtraBetRaw[] = await this.betService.getExtras(edition, editionStart);
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);

      return groupExtraBetsByType(extraBets, parseExtraBets, teams, "bets");
    });
  };

  getExtrasResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (req.session.user) {
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }

      const { edition, editionStart } = checkEdition(req.params.season);

      const extraBetsResults: IExtraBetResultRaw[] = await this.betService.getExtrasResults(edition, editionStart);
      console.log("Extras results fetched:", extraBetsResults);

      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);

      return groupExtraBetsByType(extraBetsResults, parseExtraBetResult, teams, "results");
    });
  };

  //   update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //     await this.handleRequest(req, res, next, async () => {
  //       if (!req.session.user) {
  //         throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
  //       }

  //       const user = req.session.user;

  //       void this.userService.updateLastOnlineTime(user.id);

  //       const reqBody = req.body as { betValue: number; matchId: number };
  //       const { betValue, matchId } = reqBody;

  //       const matchResponse = await this.matchService.getTimestampByMatchId(matchId);
  //       const nowTimestamp = Math.floor(new Date().getTime() / 1000);
  //       if (matchResponse && matchResponse.timestamp < nowTimestamp) {
  //         throw new AppError("Não autorizado a fazer apostas nesta partida", 401, ErrorCode.UNAUTHORIZED);
  //       }

  //       if (matchResponse) {
  //         await this.betService.update(betValue, matchId, user.id);
  //         return {}; // to satisfy void response
  //       }
  //     });
  //   };

  //   updateExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //     await this.handleRequest(req, res, next, async () => {
  //       if (!req.session.user) {
  //         throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
  //       }

  //       const user = req.session.user;
  //       const nowTimestamp = Math.floor(new Date().getTime() / 1000);
  //       const seasonStart = process.env.SEASON_START;
  //       const season = process.env.SEASON;

  //       void this.userService.updateLastOnlineTime(user.id);

  //       const reqBody = req.body as Record<string, null | number | number[]>;
  //       const newExtraBets = reqBody;

  //       if (!seasonStart || !season) {
  //         throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
  //       }

  //       if (nowTimestamp >= parseInt(seasonStart)) {
  //         throw new AppError("Não autorizado! A temporada já começou.", 401, ErrorCode.UNAUTHORIZED);
  //       }

  //       await this.betService.updateExtras(JSON.stringify(newExtraBets), user.id, season);
  //     });
  //   };
}
