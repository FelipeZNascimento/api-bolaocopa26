import type { IBet } from "#bet/bet.types.js";
import type { IEvent, IMatch } from "#match/match.types.js";
import type { IPlayer, ITeam } from "#team/team.types.js";
import { NextFunction, Request, Response } from "express";

import { BetService } from "#bet/bet.service.js";
import { parseRawBets } from "#bet/bet.utils.js";
import { EditionService } from "#edition/edition.service.js";
import { IReferee, IStadium } from "#edition/edition.types.js";
import {
  getEditionInfoFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
} from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { FOOTBALL_MATCH_STATUS, STOPPED_GAME } from "#match/match.constants.js";
import { updateMatchesSchema } from "#match/match.schemas.js";
import { MatchService } from "#match/match.service.js";
import {
  formatMatches,
  getEventsFromCacheOrFetch,
  getMatchesFromCacheOrFetch,
  setMatchesCache,
} from "#match/match.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { IUser } from "#user/user.types.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { parseBody } from "#utils/parseBody.js";
import { WEBSOCKET_EVENTS } from "#websocket/websocket.constants.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { MatchSyncService } from "./match.sync.service.js";

export class MatchController extends BaseController {
  constructor(
    private matchService: MatchService,
    private betService: BetService,
    private teamService: TeamService,
    private websocketService: WebSocketService,
    private editionService: EditionService,
  ) {
    super();
  }

  getByEdition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const round = parseInt(req.params.round) || 0;
      return this._getFormattedMatches(currentEdition, round, req.session.user ?? null);
    });
  };

  getLiveMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }
      const allMatches = await this._getFormattedMatches(currentEdition, 0, req.session.user ?? null);

      return allMatches
        .filter((match) => !STOPPED_GAME.includes(match.status))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 3);
    });
  };

  getNextMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const allMatches = await this._getFormattedMatches(currentEdition, 0, req.session.user ?? null);

      return allMatches
        .filter((match) => match.status === FOOTBALL_MATCH_STATUS.NOT_STARTED)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 3);
    });
  };

  syncMatches = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequestFromCache(req, res, next, () => {
      const matchSyncService = MatchSyncService.getInstance();
      void matchSyncService.sync();
    });
  };

  updateMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const { updatedMatches } = parseBody(updateMatchesSchema, req.body);

      const matches = await getMatchesFromCacheOrFetch(this.matchService, currentEdition, currentEdition);
      if (!matches || matches.length === 0) {
        throw new AppError("Nenhuma partida encontrada para atualizar", 404, ErrorCode.NOT_FOUND);
      }

      // 1. Organize updates
      const matchUpdates = updatedMatches.reduce<IMatch[]>((acc, updatedMatch) => {
        const matchToUpdate = matches.find((match) => match.idFifa === updatedMatch.fifaId);
        if (!matchToUpdate) {
          logger.warn(`Match with FIFA ID ${updatedMatch.fifaId} not found, skipping update`);
          return acc;
        }
        acc.push({
          ...matchToUpdate,
          gametime: updatedMatch.gametime,
          score: {
            ...matchToUpdate.score,
            ...(updatedMatch.homeScore !== undefined && { home: updatedMatch.homeScore }),
            ...(updatedMatch.awayScore !== undefined && { away: updatedMatch.awayScore }),
          },
          ...(updatedMatch.status !== undefined && { status: updatedMatch.status }),
        });
        return acc;
      }, []);

      // 2. Trigger all DB updates in parallel
      await Promise.all(matchUpdates.map((match) => this.matchService.updateMatch(match)));
      logger.info(`Updated ${matchUpdates.length} matches in database`);

      // 3. Update cache
      const updatedById = new Map(matchUpdates.map((m) => [m.idFifa, m]));
      setMatchesCache(matches.map((match) => updatedById.get(match.idFifa) ?? match));
      logger.info(`Updated ${matchUpdates.length} matches in cache`);

      // Notify clients about the update
      this.websocketService.broadcast(WEBSOCKET_EVENTS.MATCHES_UPDATED);
      logger.info("Broadcasted matches update to clients");

      return { message: "Partidas atualizadas com sucesso" };
    });
  };

  private _getFormattedMatches = async (edition: number, round: number, user: IUser | null): Promise<IMatch[]> => {
    const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
    const stadiums: IStadium[] = await getStadiumsFromCacheOrFetch(this.editionService, edition, edition);
    const referees: IReferee[] = await getRefereesFromCacheOrFetch(this.editionService, edition, edition);
    const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, edition, teams);
    const events: IEvent[] = await getEventsFromCacheOrFetch(this.matchService, edition, players);
    const matches: IMatch[] = await getMatchesFromCacheOrFetch(
      this.matchService,
      edition,
      edition,
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
      return formatMatches(filteredMatches, startedMatchesBets, userBets, events, user?.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new AppError(`Erro ao formatar as partidas: ${errorMessage}`, 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }
  };
}
