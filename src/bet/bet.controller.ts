import type { IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";
import type { IPlayer, ITeam } from "#team/team.types.js";
import { NextFunction, Request, Response } from "express";

import { BetService } from "#bet/bet.service.js";
import { groupExtraBetsByType, parseExtraBetResult, parseExtraBets } from "#bet/bet.utils.js";
import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { MatchService } from "#match/match.service.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";
import { AppError } from "#utils/appError.js";
import { checkEdition } from "#utils/checkEdition.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { EXTRA_TYPE_CHAMPION } from "./bet.constants.js";

export class BetController extends BaseController {
  constructor(
    private betService: BetService,
    private matchService: MatchService,
    private userService: UserService,
    private teamService: TeamService,
    private editionService: EditionService,
  ) {
    super();
  }

  getExtras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      const { currentEdition, editionStart } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition || !editionStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      // const { edition, editionStart } = checkEdition(req.params.edition);
      let activeProfileExtraBets: IExtraBetRaw[] = [];
      if (user) {
        activeProfileExtraBets = await this.betService.getExtrasFromUserId(currentEdition, user.id);
      }
      const users: IUser[] = await this.userService.getByEdition(currentEdition);
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, currentEdition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, currentEdition, teams);
      const activeProfileBets = groupExtraBetsByType(
        activeProfileExtraBets,
        parseExtraBets,
        players,
        teams,
        users,
        "bets",
      );

      // Check to prevent fetching extras if edition hasn't started yet
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (nowTimestamp < editionStart) {
        return {
          activeProfileBets,
          bets: [],
        };
      }

      const extraBets: IExtraBetRaw[] = await this.betService.getExtras(currentEdition, editionStart);
      const bets = groupExtraBetsByType(extraBets, parseExtraBets, players, teams, users, "bets");

      return {
        activeProfileBets,
        bets,
      };
    });
  };

  getExtrasResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { edition, editionStart } = checkEdition(req.params.edition);
      const extraBetsResults: IExtraBetResultRaw[] = await this.betService.getExtrasResults(edition, editionStart);
      const users: IUser[] = await this.userService.getByEdition(edition);
      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, edition, teams);

      return groupExtraBetsByType(extraBetsResults, parseExtraBetResult, players, teams, users, "results");
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (user && user.isActive === false) {
        throw new AppError("Usuário inativo", 403, ErrorCode.FORBIDDEN);
      }

      const reqBody = req.body as { awayScore: null | number; homeScore: null | number; matchId: number };
      const { awayScore, homeScore, matchId } = reqBody;

      const matchResponse = await this.matchService.getTimestampByMatchId(matchId);
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (matchResponse && matchResponse.timestamp < nowTimestamp) {
        throw new AppError("Não autorizado a fazer apostas nesta partida", 401, ErrorCode.UNAUTHORIZED);
      }

      if (matchResponse && user) {
        await this.betService.update(homeScore, awayScore, matchId, user.id);
        return {}; // to satisfy void response
      }
    });
  };

  updateExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;
      if (user && user.isActive === false) {
        throw new AppError("Usuário inativo", 403, ErrorCode.FORBIDDEN);
      }

      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      const { edition, editionStart } = checkEdition(req.params.edition);
      const reqBody = req.body as { extraType: string; playerId: number; teamId: number };
      const { extraType, playerId, teamId } = reqBody;
      const maxStartedRound = await this.editionService.getMaxStartedRound(edition);

      if (!editionStart || !edition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (parseInt(extraType, 10) !== EXTRA_TYPE_CHAMPION && nowTimestamp >= editionStart) {
        throw new AppError("Não autorizado! A temporada já começou.", 401, ErrorCode.UNAUTHORIZED);
      }

      let stageId: number = 1;
      if (maxStartedRound === 1) {
        // No matches have started yet — edition hasn't begun
        stageId = 1;
      } else if (maxStartedRound < 4) {
        // Matches started, but none from round 4 onwards
        stageId = 2;
      } else if (maxStartedRound < 6) {
        // Round 4 matches started, but round 5+ has not
        stageId = 3;
      }
      await this.betService.updateExtras(extraType, playerId ?? null, teamId, user!.id, edition, stageId);
    });
  };
}
