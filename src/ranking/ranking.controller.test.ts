import type { BetService } from "#bet/bet.service.js";
import type { IBet, IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";
import type { MatchService } from "#match/match.service.js";
import type { IMatch } from "#match/match.types.js";
import type { TeamService } from "#team/team.service.js";
import type { ITeam } from "#team/team.types.js";
import type { UserService } from "#user/user.service.js";
import type { IUser } from "#user/user.types.js";

import { MATCH_STATUS } from "#match/match.constants.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RankingController } from "./ranking.controller";

const apiResponseSuccess = vi.hoisted(() => vi.fn());
const parseMatchQueryResponseMock = vi.hoisted(() => vi.fn((match: IMatch) => match));
const parseBetQueryResponseMock = vi.hoisted(() => vi.fn((bets: IBet[]) => bets));
const getRoundsRankingMock = vi.hoisted(() => vi.fn());
const getSeasonRankingMock = vi.hoisted(() => vi.fn());
const getTeamsFromCacheOrFetchMock = vi.hoisted(() => vi.fn());
const groupExtraBetsByTypeMock = vi.hoisted(() => vi.fn());
const parseExtraBetsMock = vi.hoisted(() => vi.fn());
const parseExtraBetResultMock = vi.hoisted(() => vi.fn());

vi.mock("#utils/apiResponse.js", () => ({
  ApiResponse: {
    error: vi.fn(),
    success: apiResponseSuccess,
  },
  isFulfilled: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "fulfilled"),
  isRejected: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "rejected"),
}));

vi.mock("#match/match.utils.js", () => ({
  parseMatchQueryResponse: parseMatchQueryResponseMock,
}));

vi.mock("#bet/bet.utils.js", () => ({
  groupExtraBetsByType: groupExtraBetsByTypeMock,
  parseBetQueryResponse: parseBetQueryResponseMock,
  parseExtraBetResult: parseExtraBetResultMock,
  parseExtraBets: parseExtraBetsMock,
}));

vi.mock("#team/team.util.js", () => ({
  getTeamsFromCacheOrFetch: getTeamsFromCacheOrFetchMock,
}));

vi.mock("./ranking.utils", () => ({
  getRoundsRanking: getRoundsRankingMock,
  getSeasonRanking: getSeasonRankingMock,
}));

const createUser = (id: number, name: string): IUser => ({
  id,
  isActive: true,
  isOnline: true,
  name,
  nickname: name,
  timestamp: 0,
});

const createMatch = (id: number, scoreHome: number, scoreAway: number, status = 1, round = 1): IMatch =>
  ({
    awayTeam: null,
    bets: [],
    homeTeam: null,
    id,
    idFifa: id,
    referee: null,
    round,
    score: {
      away: scoreAway,
      home: scoreHome,
    },
    stadium: null,
    status,
    timestamp: 1,
  }) as IMatch;

const createBet = (id: number, userId: number, matchId: number, scoreHome: number, scoreAway: number): IBet => ({
  id,
  matchId,
  scoreAway,
  scoreHome,
  timestamp: 1,
  user: {
    id: userId,
    nickname: "user-" + String(userId),
  },
});

const getMockReqRes = (season?: string) => ({
  next: vi.fn(),
  req: {
    params: season ? { season } : {},
  } as unknown as Request,
  res: {} as Response,
});

describe("RankingController", () => {
  const mockUserService = {
    getByEdition: vi.fn(),
  };

  const mockMatchService = {
    getByEdition: vi.fn(),
  };

  const mockTeamService = {};

  const mockBetService = {
    getExtras: vi.fn(),
    getExtrasResults: vi.fn(),
    getStartedMatchesBetsByMatchIds: vi.fn(),
  };

  let controller: RankingController;

  beforeEach(() => {
    controller = new RankingController(
      mockUserService as unknown as UserService,
      mockMatchService as unknown as MatchService,
      mockTeamService as TeamService,
      mockBetService as unknown as BetService,
    );

    vi.clearAllMocks();
    delete process.env.EDITION;
    delete process.env.EDITION_START;
  });

  it("getRanking: should fetch services, filter started matches and return ranking", async () => {
    const users = [createUser(1, "Alice")];
    const matches = [createMatch(100, 1, 0, 1), createMatch(101, 0, 0, 0)];
    const bets = [createBet(1, 1, 100, 1, 0)];
    const teams: ITeam[] = [];
    const extraBets: IExtraBetRaw[] = [];
    const extraBetsResults: IExtraBetResultRaw[] = [];

    mockUserService.getByEdition.mockResolvedValue(users);
    mockMatchService.getByEdition.mockResolvedValue(matches);
    mockBetService.getExtras.mockResolvedValue(extraBets);
    mockBetService.getExtrasResults.mockResolvedValue(extraBetsResults);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue(bets);
    getTeamsFromCacheOrFetchMock.mockResolvedValue(teams);
    groupExtraBetsByTypeMock.mockReturnValue([]);

    const mockRoundsRanking = new Map([[1, []]]);
    const mockSeasonRanking = [{ position: 1, score: { points: 5 } }];
    getRoundsRankingMock.mockReturnValue(mockRoundsRanking);
    getSeasonRankingMock.mockReturnValue(mockSeasonRanking);

    process.env.EDITION = "2026";
    process.env.EDITION_START = "2026";

    const { next, req, res } = getMockReqRes();

    await controller.getRanking(req, res, next);

    expect(mockUserService.getByEdition).toHaveBeenCalledWith(2026);
    expect(mockMatchService.getByEdition).toHaveBeenCalledWith(2026);
    expect(mockBetService.getExtras).toHaveBeenCalledWith(2026, 2026);
    expect(mockBetService.getExtrasResults).toHaveBeenCalledWith(2026, 2026);
    expect(getTeamsFromCacheOrFetchMock).toHaveBeenCalledWith(mockTeamService, 2026);
    expect(mockBetService.getStartedMatchesBetsByMatchIds).toHaveBeenCalledWith([100]);
    expect(parseMatchQueryResponseMock).toHaveBeenCalledTimes(2);
    expect(parseBetQueryResponseMock).toHaveBeenCalledWith(bets);
    expect(groupExtraBetsByTypeMock).toHaveBeenCalledTimes(2);
    expect(getRoundsRankingMock).toHaveBeenCalledWith(2026, users, matches, [matches[0]], bets);
    expect(getSeasonRankingMock).toHaveBeenCalledWith(
      mockRoundsRanking,
      1,
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
    );

    expect(apiResponseSuccess).toHaveBeenCalledTimes(1);
    const returnedPayload = apiResponseSuccess.mock.calls[0][1] as {
      round: unknown;
      season: unknown[];
    };
    expect(returnedPayload.season).toEqual(mockSeasonRanking);
    expect(returnedPayload.round).toEqual(mockRoundsRanking);
    expect(next).not.toHaveBeenCalled();
  });

  it("getRanking: should call next with AppError when season is missing", async () => {
    // Set EDITION_START but not EDITION to test missing season
    process.env.EDITION_START = "2026";
    const { next, req, res } = getMockReqRes();

    await controller.getRanking(req, res, next);

    expect(apiResponseSuccess).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it("getRanking: should determine current round as last round with started matches", async () => {
    const users = [createUser(1, "Alice")];
    const matches = [
      createMatch(100, 1, 0, MATCH_STATUS.FINAL, 1),
      createMatch(101, 2, 1, MATCH_STATUS.FIRST, 2),
      createMatch(102, 0, 0, MATCH_STATUS.NOT_STARTED, 3),
    ];
    const bets = [createBet(1, 1, 100, 1, 0), createBet(2, 1, 101, 2, 1)];
    const teams: ITeam[] = [];
    const extraBets: IExtraBetRaw[] = [];
    const extraBetsResults: IExtraBetResultRaw[] = [];

    mockUserService.getByEdition.mockResolvedValue(users);
    mockMatchService.getByEdition.mockResolvedValue(matches);
    mockBetService.getExtras.mockResolvedValue(extraBets);
    mockBetService.getExtrasResults.mockResolvedValue(extraBetsResults);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue(bets);
    getTeamsFromCacheOrFetchMock.mockResolvedValue(teams);
    groupExtraBetsByTypeMock.mockReturnValue([]);

    const mockRoundsRanking = new Map();
    getRoundsRankingMock.mockReturnValue(mockRoundsRanking);
    getSeasonRankingMock.mockReturnValue([]);

    process.env.EDITION = "2026";
    process.env.EDITION_START = "2026";
    const { next, req, res } = getMockReqRes("2026");

    await controller.getRanking(req, res, next);

    // Should call getSeasonRanking with round 2 (last round with at least one started match)
    expect(getSeasonRankingMock).toHaveBeenCalledWith(
      mockRoundsRanking,
      2,
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("getRanking: should use last round when all matches are not started", async () => {
    const users = [createUser(1, "Alice")];
    const matches = [
      createMatch(100, 0, 0, MATCH_STATUS.NOT_STARTED, 1),
      createMatch(101, 0, 0, MATCH_STATUS.NOT_STARTED, 2),
    ];
    const bets: IBet[] = [];
    const teams: ITeam[] = [];
    const extraBets: IExtraBetRaw[] = [];
    const extraBetsResults: IExtraBetResultRaw[] = [];

    mockUserService.getByEdition.mockResolvedValue(users);
    mockMatchService.getByEdition.mockResolvedValue(matches);
    mockBetService.getExtras.mockResolvedValue(extraBets);
    mockBetService.getExtrasResults.mockResolvedValue(extraBetsResults);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue(bets);
    getTeamsFromCacheOrFetchMock.mockResolvedValue(teams);
    groupExtraBetsByTypeMock.mockReturnValue([]);

    const mockRoundsRanking = new Map();
    getRoundsRankingMock.mockReturnValue(mockRoundsRanking);
    getSeasonRankingMock.mockReturnValue([]);

    process.env.EDITION = "2026";
    process.env.EDITION_START = "2026";
    const { next, req, res } = getMockReqRes("2026");

    await controller.getRanking(req, res, next);

    // Should fallback to last round (1) when no matches have started
    expect(getSeasonRankingMock).toHaveBeenCalledWith(
      mockRoundsRanking,
      1,
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
      {
        champion: [],
        defense: [],
        offense: [],
        striker: [],
      },
    );
    expect(next).not.toHaveBeenCalled();
  });
});
