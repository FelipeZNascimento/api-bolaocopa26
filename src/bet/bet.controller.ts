import type { IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";
import type { IPlayer, ITeam } from "#team/team.types.js";

import { BetService } from "#bet/bet.service.js";
import { groupExtraBetsByType, parseExtraBetResult, parseExtraBets } from "#bet/bet.utils.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { AppError } from "#utils/appError.js";
import { checkEdition } from "#utils/checkEdition.js";
import { ErrorCode } from "#utils/errorCodes.js";
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
      const user = req.session.user;
      const { edition, editionStart } = checkEdition(req.params.season);
      let activeProfileExtraBets: IExtraBetRaw[] = [];
      if (user) {
        void this.userService.updateLastOnlineTime(user.id);
        activeProfileExtraBets = await this.betService.getExtrasFromUserId(edition, user.id);
      }
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, edition, teams);
      const activeProfileBets = groupExtraBetsByType(activeProfileExtraBets, parseExtraBets, players, teams, "bets");

      // Check to prevent fetching extras if season hasn't started yet
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (nowTimestamp < editionStart) {
        return {
          activeProfileBets,
          bets: [],
        };
      }

      const extraBets: IExtraBetRaw[] = await this.betService.getExtras(edition, editionStart);
      const bets = groupExtraBetsByType(extraBets, parseExtraBets, players, teams, "bets");

      return {
        activeProfileBets,
        bets,
      };
    });
  };

  getExtrasResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (user) {
        void this.userService.updateLastOnlineTime(user.id);
      }

      const { edition, editionStart } = checkEdition(req.params.season);
      const extraBetsResults: IExtraBetResultRaw[] = await this.betService.getExtrasResults(edition, editionStart);
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, edition, teams);

      return groupExtraBetsByType(extraBetsResults, parseExtraBetResult, players, teams, "results");
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (!user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as { awayScore: null | number; homeScore: null | number; matchId: number };
      const { awayScore, homeScore, matchId } = reqBody;

      const matchResponse = await this.matchService.getTimestampByMatchId(matchId);
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (matchResponse && matchResponse.timestamp < nowTimestamp) {
        throw new AppError("Não autorizado a fazer apostas nesta partida", 401, ErrorCode.UNAUTHORIZED);
      }

      if (matchResponse) {
        await this.betService.update(homeScore, awayScore, matchId, user.id);
        return {}; // to satisfy void response
      }
    });
  };

  updateExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      if (!user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      const { edition, editionStart } = checkEdition(req.params.season);

      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as { extraType: string; playerId: number; teamId: number };
      const { extraType, playerId, teamId } = reqBody;

      if (!editionStart || !edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (nowTimestamp >= editionStart) {
        throw new AppError("Não autorizado! A temporada já começou.", 401, ErrorCode.UNAUTHORIZED);
      }

      await this.betService.updateExtras(extraType, playerId ?? null, teamId, user.id, edition);
    });
  };
}
