import type { IBet } from "#bet/bet.types.js";
import type { IEvent, IMatch } from "#match/match.types.js";
import type { IPlayer, IReferee, IStadium, ITeam } from "#team/team.types.js";
import { NextFunction, Request, Response } from "express";

import { BetService } from "#bet/bet.service.js";
import { parseRawBets } from "#bet/bet.utils.js";
import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { FOOTBALL_MATCH_STATUS, STOPPED_GAME, TMatchStatus } from "#match/match.constants.js";
import { MatchService } from "#match/match.service.js";
import {
  formatMatches,
  getEventsFromCacheOrFetch,
  getMatchesFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
  setMatchesCache,
} from "#match/match.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { editionMapping } from "#utils/editionMapping.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WEBSOCKET_EVENTS } from "#websocket/websocket.constants.js";
import { WebSocketService } from "#websocket/websocket.service.js";

export class MatchController extends BaseController {
  constructor(
    private matchService: MatchService,
    private userService: UserService,
    private betService: BetService,
    private teamService: TeamService,
    private websocketInstance: WebSocketService,
    private editionService: EditionService,
  ) {
    super();
  }

  getByEdition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const edition = req.params.edition || process.env.EDITION;
      const round = parseInt(req.params.round) || 0;

      if (!edition) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      return this._getFormattedMatches(edition, round, req.session.user ?? null);
    });
  };

  getLiveMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const currentEdition = process.env.EDITION;
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
      const currentEdition = process.env.EDITION;
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

  updateMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const reqBody = req.body as {
        updatedMatches: {
          awayScore?: number;
          fifaId?: number;
          gametime: string;
          homeScore?: number;
          status: TMatchStatus;
        }[];
      };
      const { updatedMatches } = reqBody;

      if (!updatedMatches || !Array.isArray(updatedMatches) || updatedMatches.length === 0) {
        throw new AppError("Campo obrigatório ausente ou inválido", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

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
      logger.info(`Updated ${JSON.stringify(matchUpdates)} matches in database`);

      // 3. Update cache
      const updatedById = new Map(matchUpdates.map((m) => [m.idFifa, m]));
      setMatchesCache(matches.map((match) => updatedById.get(match.idFifa) ?? match));
      logger.info(`Updated ${matchUpdates.length} matches in cache`);

      // Notify clients about the update
      this.websocketInstance.broadcast(WEBSOCKET_EVENTS.MATCHES_UPDATED);
      logger.info("Broadcasted matches update to clients");

      return { message: "Partidas atualizadas com sucesso" };
    });
  };

  private _getFormattedMatches = async (edition: string, round: number, user: IUser | null): Promise<IMatch[]> => {
    const currentEdition = process.env.EDITION ? parseInt(process.env.EDITION) : null;
    if (!currentEdition) {
      throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
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
