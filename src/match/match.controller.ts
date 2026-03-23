import type { IBet } from "#bet/bet.types.js";
import type { IEvent, IMatch } from "#match/match.types.js";
import type { IPlayer, IReferee, IStadium, ITeam } from "#team/team.types.js";

import { BetService } from "#bet/bet.service.js";
import { parseRawBets } from "#bet/bet.utils.js";
import { MatchService } from "#match/match.service.js";
import {
  formatMatches,
  getEventsFromCacheOrFetch,
  getMatchesFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
} from "#match/match.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { NextFunction, Request, Response } from "express";

export class MatchController extends BaseController {
  constructor(
    private matchService: MatchService,
    private userService: UserService,
    private betService: BetService,
    private teamService: TeamService,
    private websocketInstance: WebSocketService,
  ) {
    super();
  }

  getByEdition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let user = null;
      if (req.session.user) {
        user = req.session.user;
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }

      const edition = req.params.edition || process.env.EDITION;
      const round = parseInt(req.params.round) || 0;
      const currentEdition = process.env.EDITION ? parseInt(process.env.EDITION) : null;

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (!edition) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const editionId = parseInt(edition) < 2000 ? parseInt(edition) : editionMapping(edition);
      if (editionId === 0) {
        throw new AppError("Parâmetro inválido", 400, ErrorCode.INVALID_INPUT);
      }

      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, editionId);
      const stadiums: IStadium[] = await getStadiumsFromCacheOrFetch(this.matchService, editionId, currentEdition);
      const referees: IReferee[] = await getRefereesFromCacheOrFetch(this.matchService, editionId, currentEdition);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, editionId, teams);
      const events: IEvent[] = await getEventsFromCacheOrFetch(this.matchService, editionId, players);
      const matches: IMatch[] = await getMatchesFromCacheOrFetch(
        this.matchService,
        editionId,
        currentEdition,
        teams,
        stadiums,
        referees,
      );

      let filteredMatches = matches;
      if (round > 0) {
        filteredMatches = matches.filter((match) => match.round === round);
      }

      const matchesIds = filteredMatches.map((match) => match.id);
      const queries = [this.betService.getStartedMatchesBetsByMatchIds(matchesIds)];

      if (user) {
        queries.push(this.betService.getUserMatchesBetsByMatchIds(matchesIds, user.id));
      }
      const [startedMatchesBetsResponse, userBetsResponse] = await Promise.allSettled(queries);
      // Only throw if user or matches fetch failed
      if (isRejected(startedMatchesBetsResponse) || (user && isRejected(userBetsResponse))) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      let startedMatchesBets: IBet[] = [];
      if (isFulfilled(startedMatchesBetsResponse)) {
        startedMatchesBets = parseRawBets(startedMatchesBetsResponse.value);
      }

      let userBets: IBet[] = [];
      if (user && isFulfilled(userBetsResponse)) {
        userBets = parseRawBets(userBetsResponse.value);
      }

      try {
        const formattedMatches = formatMatches(filteredMatches, startedMatchesBets, userBets, events, user?.id);
        return formattedMatches;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        throw new AppError(`Erro ao formatar as partidas: ${errorMessage}`, 500, ErrorCode.INTERNAL_SERVER_ERROR);
      }
    });
  };
}
