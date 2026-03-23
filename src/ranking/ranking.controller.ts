import { EXTRA_TYPE_CHAMPION, EXTRA_TYPE_DEFENSE, EXTRA_TYPE_OFFENSE, EXTRA_TYPE_STRIKER } from "#bet/bet.constants.js";
import { BetService } from "#bet/bet.service.js";
import { IExtraBet, IExtraBetRaw, IExtraBetResult, IExtraBetResultRaw } from "#bet/bet.types.js";
import { groupExtraBetsByType, parseExtraBetResult, parseExtraBets, parseRawBets } from "#bet/bet.utils.js";
import { MATCH_STATUS } from "#match/match.constants.js";
import { MatchService } from "#match/match.service.js";
import { IMatch, IMatchRaw } from "#match/match.types.js";
import { parseRawMatch } from "#match/match.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { ITeam } from "#team/team.types.js";
import { getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { checkEdition } from "#utils/checkEdition.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NextFunction, Request, Response } from "express";

import { getRoundsRanking, getSeasonRanking } from "./ranking.utils";
export class RankingController extends BaseController {
  constructor(
    private userService: UserService,
    private matchService: MatchService,
    private teamService: TeamService,
    private betService: BetService,
  ) {
    super();
  }

  getRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { edition, editionStart } = checkEdition(req.params.season);

      const queries = [
        this.userService.getByEdition(edition),
        this.matchService.getByEdition(edition),
        this.betService.getExtras(edition, editionStart),
        this.betService.getExtrasResults(edition, editionStart),
      ];
      const [usersResponse, matchesResponse, extrasResponse, extrasResultsResponse] = (await Promise.allSettled(
        queries,
      )) as [
        PromiseSettledResult<IUser[]>,
        PromiseSettledResult<IMatchRaw[]>,
        PromiseSettledResult<IExtraBetRaw[]>,
        PromiseSettledResult<IExtraBetResultRaw[]>,
      ];
      if (
        isRejected(usersResponse) ||
        isRejected(matchesResponse) ||
        isRejected(extrasResponse) ||
        isRejected(extrasResultsResponse)
      ) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      let users: IUser[] = [];
      if (isFulfilled(usersResponse)) {
        users = usersResponse.value;
      }

      let matches: IMatch[] = [];
      if (isFulfilled(matchesResponse)) {
        matches = matchesResponse.value.map((match) => parseRawMatch(match, [], [], []));
      }

      const teams: ITeam[] = await getTeamsFromCacheOrFetch(this.teamService, edition);
      const extraBets = {
        champion: [] as IExtraBet[],
        defense: [] as IExtraBet[],
        offense: [] as IExtraBet[],
        striker: [] as IExtraBet[],
      };
      if (isFulfilled(extrasResponse)) {
        const groupedExtraBets = groupExtraBetsByType(extrasResponse.value, parseExtraBets, teams, "bets");
        extraBets.champion = groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_CHAMPION)?.bets ?? [];
        extraBets.striker = groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_STRIKER)?.bets ?? [];
        extraBets.offense = groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_OFFENSE)?.bets ?? [];
        extraBets.defense = groupedExtraBets.find((eb) => eb.extraType === EXTRA_TYPE_DEFENSE)?.bets ?? [];
      }

      const extraBetsResults = {
        champion: [] as IExtraBetResult[],
        defense: [] as IExtraBetResult[],
        offense: [] as IExtraBetResult[],
        striker: [] as IExtraBetResult[],
      };
      if (isFulfilled(extrasResultsResponse)) {
        const groupedExtraBetsResults = groupExtraBetsByType(
          extrasResultsResponse.value,
          parseExtraBetResult,
          teams,
          "results",
        );
        extraBetsResults.champion =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_CHAMPION)?.results ?? [];
        extraBetsResults.striker =
          groupedExtraBetsResults.find((eb) => eb.extraType === EXTRA_TYPE_STRIKER)?.results ?? [];
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

      const roundsRanking = getRoundsRanking(edition, users, matches, startedMatches, bets);
      const seasonRanking = getSeasonRanking(roundsRanking, baseComparisonRound, extraBets, extraBetsResults);

      return {
        round: roundsRanking,
        season: seasonRanking,
      };
    });
  };
}
