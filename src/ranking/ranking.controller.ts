import { NextFunction, Request, Response } from "express";

import {
  EXTRA_TYPE_BEST_PLAYER,
  EXTRA_TYPE_CHAMPION,
  EXTRA_TYPE_DEFENSE,
  EXTRA_TYPE_OFFENSE,
  EXTRA_TYPE_TOP_SCORER,
} from "#bet/bet.constants.js";
import { BetService } from "#bet/bet.service.js";
import { IExtraBet, IExtraBetRaw, IExtraBetResult, IExtraBetResultRaw } from "#bet/bet.types.js";
import { groupExtraBetsByType, parseExtraBetResult, parseExtraBets, parseRawBets } from "#bet/bet.utils.js";
import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { MATCH_STATUS } from "#match/match.constants.js";
import { MatchService } from "#match/match.service.js";
import { getMatchesFromCacheOrFetch } from "#match/match.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { IPlayer, ITeam } from "#team/team.types.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { getEditionRanking, getRoundsRanking } from "./ranking.utils.js";
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
      const { currentEdition, editionStart } = await getEditionInfoFromCacheOrFetch(this.editionService);

      if (!currentEdition || !editionStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const maxStartedRound = await this.editionService.getMaxStartedRound(currentEdition);
      let maxStageId;

      if (maxStartedRound === null || maxStartedRound < 4) {
        maxStageId = 1;
      } else if (maxStartedRound < 5) {
        maxStageId = 2;
      } else {
        maxStageId = 3;
      }

      const queries = [
        this.userService.getByEdition(currentEdition),
        this.betService.getExtras(currentEdition, editionStart, maxStageId),
        this.betService.getExtrasResults(currentEdition, editionStart),
      ];
      const [usersResponse, extrasResponse, extrasResultsResponse] = (await Promise.allSettled(queries)) as [
        PromiseSettledResult<IUser[]>,
        PromiseSettledResult<IExtraBetRaw[]>,
        PromiseSettledResult<IExtraBetResultRaw[]>,
      ];
      if (isRejected(usersResponse) || isRejected(extrasResponse) || isRejected(extrasResultsResponse)) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      let users: IUser[] = [];
      if (isFulfilled(usersResponse)) {
        users = usersResponse.value;
      }

      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, currentEdition);
      const matches = await getMatchesFromCacheOrFetch(this.matchService, currentEdition, currentEdition, teams);
      const players: IPlayer[] = await getPlayersFromCacheOrFetch(this.teamService, currentEdition, teams);
      const extraBets = {
        bestPlayer: [] as IExtraBet[],
        champion: [] as IExtraBet[],
        defense: [] as IExtraBet[],
        offense: [] as IExtraBet[],
        topScorer: [] as IExtraBet[],
      };
      // Parse extra bets, group by extra type and keep only valid bets
      if (isFulfilled(extrasResponse)) {
        const groupedExtraBets = groupExtraBetsByType(
          extrasResponse.value,
          parseExtraBets,
          players,
          teams,
          users,
          "bets",
        );
        extraBets.champion = (groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_CHAMPION)?.bets ?? []).filter(
          (bet): bet is IExtraBet => bet.team !== null,
        );
        extraBets.bestPlayer = (
          groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_BEST_PLAYER)?.bets ?? []
        ).filter((bet): bet is IExtraBet => bet.team !== null);
        extraBets.topScorer = (
          groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_TOP_SCORER)?.bets ?? []
        ).filter((bet): bet is IExtraBet => bet.team !== null);
        extraBets.offense = (groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_OFFENSE)?.bets ?? []).filter(
          (bet): bet is IExtraBet => bet.team !== null,
        );
        extraBets.defense = (groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_DEFENSE)?.bets ?? []).filter(
          (bet): bet is IExtraBet => bet.team !== null,
        );
      }

      const extraBetsResults = {
        bestPlayer: [] as IExtraBetResult[],
        champion: [] as IExtraBetResult[],
        defense: [] as IExtraBetResult[],
        offense: [] as IExtraBetResult[],
        topScorer: [] as IExtraBetResult[],
      };
      // Parse extra bets results, group by extra type and keep only valid bets
      if (isFulfilled(extrasResultsResponse)) {
        const groupedExtraBetsResults = groupExtraBetsByType(
          extrasResultsResponse.value,
          parseExtraBetResult,
          players,
          teams,
          users,
          "results",
        );
        extraBetsResults.champion =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_CHAMPION)?.results ?? [];
        extraBetsResults.bestPlayer =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_BEST_PLAYER)?.results ?? [];
        extraBetsResults.topScorer =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_TOP_SCORER)?.results ?? [];
        extraBetsResults.offense =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_OFFENSE)?.results ?? [];
        extraBetsResults.defense =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_DEFENSE)?.results ?? [];
      }

      // Determine the current round - the last round where at least one match has started
      const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => b - a);
      const baseComparisonRound =
        rounds.find((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          return roundMatches.some((m) => m.status !== MATCH_STATUS.NOT_STARTED);
        }) ?? rounds[rounds.length - 1];

      // Only consider bets from matches that already started to calculate the ranking.
      const startedMatches = matches.filter((match) => match.status !== MATCH_STATUS.NOT_STARTED);
      const betsResponse = await this.betService.getStartedMatchesBetsByMatchIds(startedMatches.map((m) => m.id));
      const bets = parseRawBets(betsResponse);

      const roundsRanking = getRoundsRanking(currentEdition, users, matches, startedMatches, bets);
      const editionRanking = getEditionRanking(roundsRanking, baseComparisonRound, extraBets, extraBetsResults);
      const editionRankingWithoutExtras = getEditionRanking(
        roundsRanking,
        baseComparisonRound,
        { bestPlayer: [], champion: [], defense: [], offense: [], topScorer: [] },
        { bestPlayer: [], champion: [], defense: [], offense: [], topScorer: [] },
      );

      return {
        edition: editionRanking,
        editionWithoutExtras: editionRankingWithoutExtras,
        round: roundsRanking,
      };
    });
  };
}
