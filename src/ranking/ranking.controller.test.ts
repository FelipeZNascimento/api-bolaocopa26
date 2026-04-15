import type { IBet, IExtraBet, IExtraBetResult } from "#bet/bet.types.js";
import type { IMatch } from "#match/match.types.js";
import type { IUser } from "#user/user.types.js";

import { FOOTBALL_MATCH_STATUS, MATCH_STATUS } from "#match/match.constants.js";
import { AppError } from "#utils/appError.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AWARD_POINTS } from "./ranking.constants";
import { RankingController } from "./ranking.controller";
import { ICalculatedRankingLine } from "./ranking.types";
import { calculateExtraBets, getRoundsRanking, getSeasonRanking } from "./ranking.utils";

const apiResponseSuccess = vi.hoisted(() => vi.fn());
const checkEditionMock = vi.hoisted(() =>
  vi.fn(() => ({
    currentEdition: 2026,
    edition: 2026,
    editionStart: 2026,
  })),
);

vi.mock("#utils/apiResponse.js", () => ({
  ApiResponse: {
    error: vi.fn(),
    success: apiResponseSuccess,
  },
  isFulfilled: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "fulfilled"),
  isRejected: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "rejected"),
}));

vi.mock("#match/match.utils.js", () => ({
  parseRawMatch: vi.fn((match: IMatch) => match),
}));

vi.mock("#bet/bet.utils.js", () => ({
  groupExtraBetsByType: vi.fn(() => []),
  parseExtraBetResult: vi.fn(),
  parseExtraBets: vi.fn(),
  parseRawBets: vi.fn((bets: IBet[]) => bets),
}));

vi.mock("#team/team.util.js", () => ({
  getPlayersFromCacheOrFetch: vi.fn(() => Promise.resolve([])),
  getTeamsFromCacheOrFetch: vi.fn(() => Promise.resolve([])),
}));

vi.mock("#utils/checkEdition.js", () => ({
  checkEdition: checkEditionMock,
}));

const createUser = (id: number, name: string, nickname?: string): IUser => ({
  email: `user${String(id)}@test.com`,
  id,
  isActive: true,
  isOnline: true,
  name,
  nickname: nickname ?? name,
  timestamp: 0,
});

const createMatch = (
  id: number,
  scoreHome: number,
  scoreAway: number,
  status = FOOTBALL_MATCH_STATUS.FINAL,
  round = 1,
): IMatch =>
  ({
    awayTeam: null,
    bets: [],
    events: [],
    homeTeam: null,
    id,
    idFifa: id,
    loggedUserBets: null,
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

const createExtraBet = (userId: number, teamId: number, playerId?: number): IExtraBet => ({
  extraType: 1,
  id: userId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  player: playerId ? ({ id: playerId, name: `Player ${String(playerId)}` } as any) : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  team: { abbreviation: "TEM", id: teamId, name: `Team ${String(teamId)}` } as any,
  timestamp: new Date(0),
  user: {
    id: userId,
    isActive: true,
    name: `User ${String(userId)}`,
    nickname: `user-${String(userId)}`,
  },
});

const createExtraBetResult = (teamId: number, playerId?: number): IExtraBetResult => ({
  extraType: 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  player: playerId ? ({ id: playerId, name: `Player ${String(playerId)}` } as any) : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  team: { abbreviation: "TEM", id: teamId, name: `Team ${String(teamId)}` } as any,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockUserService as unknown as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockMatchService as unknown as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockTeamService as unknown as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockBetService as unknown as any,
    );

    vi.clearAllMocks();
    cachedInfo.flushAll();
    delete process.env.EDITION;
    delete process.env.EDITION_START;
  });

  describe("getRanking Controller", () => {
    it("should fetch data and return ranking when edition is provided", async () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 2, 1)];

      mockUserService.getByEdition.mockResolvedValue(users);
      mockMatchService.getByEdition.mockResolvedValue(matches);
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getExtrasResults.mockResolvedValue([]);
      mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue(bets);

      process.env.EDITION = "2026";
      process.env.EDITION_START = "2026";

      const { next, req, res } = getMockReqRes("2026");
      await controller.getRanking(req, res, next);

      expect(mockUserService.getByEdition).toHaveBeenCalledWith(2026);
      expect(mockMatchService.getByEdition).toHaveBeenCalledWith(2026);
      expect(mockBetService.getStartedMatchesBetsByMatchIds).toHaveBeenCalledWith([100]);
      expect(apiResponseSuccess).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = apiResponseSuccess.mock.calls[0][1];
      expect(result).toHaveProperty("round");
      expect(result).toHaveProperty("season");
    });

    it("should call next with error when edition is missing", async () => {
      checkEditionMock.mockImplementationOnce(() => {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      });

      const { next, req, res } = getMockReqRes();

      await controller.getRanking(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0] as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it("should filter only started matches for betting", async () => {
      const users = [createUser(1, "Alice")];
      const matches = [
        createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1),
        createMatch(101, 0, 0, MATCH_STATUS.NOT_STARTED, 1),
      ];

      mockUserService.getByEdition.mockResolvedValue(users);
      mockMatchService.getByEdition.mockResolvedValue(matches);
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getExtrasResults.mockResolvedValue([]);
      mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);

      process.env.EDITION = "2026";
      process.env.EDITION_START = "2026";

      const { next, req, res } = getMockReqRes("2026");
      await controller.getRanking(req, res, next);

      expect(mockBetService.getStartedMatchesBetsByMatchIds).toHaveBeenCalledWith([100]);
    });

    it("should determine current round correctly", async () => {
      const users = [createUser(1, "Alice")];
      const matches = [
        createMatch(100, 1, 0, FOOTBALL_MATCH_STATUS.FINAL, 1),
        createMatch(101, 2, 1, FOOTBALL_MATCH_STATUS.FIRST_HALF, 2),
        createMatch(102, 0, 0, MATCH_STATUS.NOT_STARTED, 3),
      ];

      mockUserService.getByEdition.mockResolvedValue(users);
      mockMatchService.getByEdition.mockResolvedValue(matches);
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getExtrasResults.mockResolvedValue([]);
      mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);

      process.env.EDITION = "2026";
      process.env.EDITION_START = "2026";

      const { next, req, res } = getMockReqRes("2026");
      await controller.getRanking(req, res, next);

      expect(apiResponseSuccess).toHaveBeenCalledTimes(1);
      // Round 2 should be the base comparison round (last round with started matches)
    });
  });

  describe("getRoundsRanking", () => {
    it("should calculate ranking for a single round", () => {
      const users = [createUser(1, "Alice"), createUser(2, "Bob")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Alice: exact score
        createBet(2, 2, 100, 2, 0), // Bob: one score correct
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking).toHaveLength(1);
      expect(ranking[0].round).toBe(1);
      expect(ranking[0].ranking).toHaveLength(2);

      const aliceRank = ranking[0].ranking.find((r) => r.user.id === 1);
      const bobRank = ranking[0].ranking.find((r) => r.user.id === 2);

      expect(aliceRank?.score.points).toBe(AWARD_POINTS.exactScore);
      expect(aliceRank?.score.exacts).toBe(1);
      expect(bobRank?.score.points).toBe(AWARD_POINTS.oneScore);
      expect(bobRank?.score.oneScores).toBe(1);
    });

    it("should calculate ranking across multiple rounds with accumulation", () => {
      const users = [createUser(1, "Alice")];
      const matches = [
        createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1),
        createMatch(101, 3, 0, FOOTBALL_MATCH_STATUS.FINAL, 2),
      ];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Round 1: exact score (5 pts)
        createBet(2, 1, 101, 3, 0), // Round 2: exact score (5 pts)
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking).toHaveLength(2);

      const round1 = ranking.find((r) => r.round === 1);
      const round2 = ranking.find((r) => r.round === 2);

      expect(round1?.ranking[0].score.points).toBe(5);
      expect(round1?.ranking[0].accumulatedScore.points).toBe(5);
      expect(round2?.ranking[0].score.points).toBe(5);
      expect(round2?.ranking[0].accumulatedScore.points).toBe(10);
    });

    it("should apply round multipliers correctly", () => {
      const users = [createUser(1, "Alice")];
      const matches = [
        createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1), // Multiplier: 1
        createMatch(101, 1, 0, FOOTBALL_MATCH_STATUS.FINAL, 2), // Multiplier: 1
        createMatch(102, 0, 1, FOOTBALL_MATCH_STATUS.FINAL, 3), // Multiplier: 1
        createMatch(103, 3, 0, FOOTBALL_MATCH_STATUS.FINAL, 4), // Multiplier: 2
      ];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Exact score in round 1: 5 * 1 = 5
        createBet(2, 1, 101, 1, 0), // Exact score in round 2: 5 * 1 = 5
        createBet(3, 1, 102, 0, 1), // Exact score in round 3: 5 * 1 = 5
        createBet(4, 1, 103, 3, 0), // Exact score in round 4: 5 * 2 = 10
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      const round1 = ranking.find((r) => r.round === 1)?.ranking[0];
      const round4 = ranking.find((r) => r.round === 4)?.ranking[0];

      expect(round1?.score.points).toBe(5);
      expect(round4?.score.points).toBe(10);
      // Round 4 accumulated should be 5 + 5 + 5 + 10 = 25
      expect(round4?.accumulatedScore.points).toBe(25);
    });

    it("should cache finished rounds", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 2, 1)];

      const cacheKey = String(CACHE_KEYS.WEEKLY_RANKING) + "_2026_1";
      expect(cachedInfo.get(cacheKey)).toBeUndefined();

      getRoundsRanking(2026, users, matches, matches, bets);

      const cached = cachedInfo.get(cacheKey);
      expect(cached).toBeDefined();
      expect(Array.isArray(cached)).toBe(true);
    });

    it("should use cached data when available", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 2, 1)];

      const mockCachedRanking: ICalculatedRankingLine[] = [
        {
          accumulatedScore: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 999, // Distinct value to verify cache is used
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          isFinished: true,
          round: 1,
          score: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 999,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          user: users[0],
        },
      ];

      const cacheKey = String(CACHE_KEYS.WEEKLY_RANKING) + "_2026_1";
      cachedInfo.set(cacheKey, mockCachedRanking);

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.points).toBe(999);
    });

    it("should calculate positions correctly", () => {
      const users = [createUser(1, "Alice"), createUser(2, "Bob"), createUser(3, "Charlie")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Exact: 5 pts
        createBet(2, 2, 100, 2, 0), // One score: 3 pts
        createBet(3, 3, 100, 1, 2), // Wrong winner: 0 pts
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.position).toBe(1); // Alice
      expect(ranking[0].ranking[0].user.id).toBe(1);
      expect(ranking[0].ranking[1].score.position).toBe(2); // Bob
      expect(ranking[0].ranking[1].user.id).toBe(2);
      expect(ranking[0].ranking[2].score.position).toBe(3); // Charlie
      expect(ranking[0].ranking[2].user.id).toBe(3);
    });

    it("should handle tied positions", () => {
      const users = [createUser(1, "Alice"), createUser(2, "Bob"), createUser(3, "Charlie")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Exact: 5 pts
        createBet(2, 2, 100, 2, 1), // Exact: 5 pts
        createBet(3, 3, 100, 2, 0), // One score: 3 pts
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.position).toBe(1);
      expect(ranking[0].ranking[1].score.position).toBe(1); // Tied
      expect(ranking[0].ranking[2].score.position).toBe(3); // Skip position 2
    });

    it("should calculate position variation across rounds", () => {
      const users = [createUser(1, "Alice"), createUser(2, "Bob")];
      const matches = [
        createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1),
        createMatch(101, 3, 0, FOOTBALL_MATCH_STATUS.FINAL, 2),
      ];
      const bets = [
        createBet(1, 1, 100, 2, 1), // Alice: exact score in round 1 → 5 pts (accumulated: 5, position #1)
        createBet(2, 2, 100, 1, 2), // Bob: wrong winner in round 1 → 0 pts (accumulated: 0, position #2)
        createBet(3, 1, 101, 0, 3), // Alice: wrong winner in round 2 → 0 pts (accumulated: 5, position #2)
        createBet(4, 2, 101, 3, 0), // Bob: exact score in round 2 → 5 pts (accumulated: 5, position #1 tied with Alice)
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      const round2 = ranking.find((r) => r.round === 2);

      const round2Ranking = round2?.ranking;
      expect(round2Ranking).toBeDefined();

      // After round 2, both have 5 points accumulated, so they're tied at position #1
      // Alice went from #1 to #1 (tied), variation = 1 - 1 = 0
      // Bob went from #2 to #1 (tied), variation = 2 - 1 = 1
      const aliceRankR2 = round2Ranking?.find((r) => r.user.id === 1);
      const bobRankR2 = round2Ranking?.find((r) => r.user.id === 2);

      expect(aliceRankR2?.accumulatedScore.points).toBe(5);
      expect(bobRankR2?.accumulatedScore.points).toBe(5);
      expect(aliceRankR2?.accumulatedScore.position).toBe(1);
      expect(bobRankR2?.accumulatedScore.position).toBe(1);
      expect(aliceRankR2?.accumulatedScore.positionVariation).toBe(0);
      expect(bobRankR2?.accumulatedScore.positionVariation).toBe(1);
    });
  });

  describe("getSeasonRanking", () => {
    it("should add extra bets points to season ranking", () => {
      const user1 = createUser(1, "Alice");
      const roundRanking: ICalculatedRankingLine[] = [
        {
          accumulatedScore: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          isFinished: true,
          round: 1,
          score: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          user: user1,
        },
      ];

      const extraBets = {
        champion: [createExtraBet(1, 10)],
        defense: [createExtraBet(1, 20)],
        offense: [createExtraBet(1, 30)],
        striker: [createExtraBet(1, 40, 100)],
      };

      const extraBetsResults = {
        champion: [createExtraBetResult(10)],
        defense: [createExtraBetResult(20)],
        offense: [createExtraBetResult(30)],
        striker: [createExtraBetResult(40, 100)],
      };

      const seasonRanking = getSeasonRanking([{ ranking: roundRanking, round: 1 }], 1, extraBets, extraBetsResults);

      expect(seasonRanking[0].score.extras?.champion).toBe(AWARD_POINTS.extraChampion);
      expect(seasonRanking[0].score.extras?.defense).toBe(AWARD_POINTS.extraDefense);
      expect(seasonRanking[0].score.extras?.offense).toBe(AWARD_POINTS.extraOffense);
      expect(seasonRanking[0].score.extras?.striker).toBe(AWARD_POINTS.extraStriker);
      expect(seasonRanking[0].score.points).toBe(
        5 +
          AWARD_POINTS.extraChampion +
          AWARD_POINTS.extraDefense +
          AWARD_POINTS.extraOffense +
          AWARD_POINTS.extraStriker,
      );
    });

    it("should not add points for incorrect extra bets", () => {
      const user1 = createUser(1, "Alice");
      const roundRanking: ICalculatedRankingLine[] = [
        {
          accumulatedScore: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          isFinished: true,
          round: 1,
          score: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          user: user1,
        },
      ];

      const extraBets = {
        champion: [createExtraBet(1, 10)], // User bet on team 10
        defense: [],
        offense: [],
        striker: [],
      };

      const extraBetsResults = {
        champion: [createExtraBetResult(99)], // But team 99 won
        defense: [],
        offense: [],
        striker: [],
      };

      const seasonRanking = getSeasonRanking([{ ranking: roundRanking, round: 1 }], 1, extraBets, extraBetsResults);

      expect(seasonRanking[0].score.extras?.champion).toBe(0);
      expect(seasonRanking[0].score.points).toBe(5); // No extra points added
    });

    it("should mark season as finished when all rounds are complete", () => {
      const user1 = createUser(1, "Alice");
      const roundRanking: ICalculatedRankingLine[] = [
        {
          accumulatedScore: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          isFinished: true,
          round: 1,
          score: {
            betCount: 1,
            exacts: 1,
            gameCount: 1,
            misses: 0,
            oneScores: 0,
            percentage: 100,
            points: 5,
            position: 1,
            positionVariation: 0,
            winnersOnly: 0,
          },
          user: user1,
        },
      ];

      const seasonRanking = getSeasonRanking(
        [{ ranking: roundRanking, round: 1 }],
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

      expect(seasonRanking[0].isFinished).toBe(true);
    });
  });

  describe("calculateExtraBets", () => {
    it("should return zero points when user has no extra bets", () => {
      const extras = calculateExtraBets(
        1,
        { champion: [], defense: [], offense: [], striker: [] },
        { champion: [], defense: [], offense: [], striker: [] },
      );

      expect(extras.champion).toBe(0);
      expect(extras.defense).toBe(0);
      expect(extras.offense).toBe(0);
      expect(extras.striker).toBe(0);
      expect(extras.points).toBe(0);
    });

    it("should award points for correct champion bet", () => {
      const extras = calculateExtraBets(
        1,
        { champion: [createExtraBet(1, 10)], defense: [], offense: [], striker: [] },
        { champion: [createExtraBetResult(10)], defense: [], offense: [], striker: [] },
      );

      expect(extras.champion).toBe(AWARD_POINTS.extraChampion);
    });

    it("should award points for correct striker bet", () => {
      const extras = calculateExtraBets(
        1,
        { champion: [], defense: [], offense: [], striker: [createExtraBet(1, 10, 100)] },
        { champion: [], defense: [], offense: [], striker: [createExtraBetResult(10, 100)] },
      );

      expect(extras.striker).toBe(AWARD_POINTS.extraStriker);
    });

    it("should not award points when player ID doesn't match for striker", () => {
      const extras = calculateExtraBets(
        1,
        { champion: [], defense: [], offense: [], striker: [createExtraBet(1, 10, 100)] },
        { champion: [], defense: [], offense: [], striker: [createExtraBetResult(10, 999)] },
      );

      expect(extras.striker).toBe(0);
    });
  });

  describe("Scoring Logic", () => {
    it("should award correct points for exact score", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 2, 1)];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.exacts).toBe(1);
      expect(ranking[0].ranking[0].score.points).toBe(AWARD_POINTS.exactScore);
    });

    it("should award correct points for one score correct", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 2, 0)]; // Home correct, away wrong

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.oneScores).toBe(1);
      expect(ranking[0].ranking[0].score.points).toBe(AWARD_POINTS.oneScore);
    });

    it("should award correct points for winner only", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 3, 0)]; // Winner correct, scores wrong

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.winnersOnly).toBe(1);
      expect(ranking[0].ranking[0].score.points).toBe(AWARD_POINTS.winnerOnly);
    });

    it("should award zero points for wrong winner", () => {
      const users = [createUser(1, "Alice")];
      const matches = [createMatch(100, 2, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [createBet(1, 1, 100, 0, 3)]; // Predicted away win, actual home win

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.misses).toBe(1);
      expect(ranking[0].ranking[0].score.points).toBe(0);
    });

    it("should handle draw predictions correctly", () => {
      const users = [createUser(1, "Alice"), createUser(2, "Bob")];
      const matches = [createMatch(100, 1, 1, FOOTBALL_MATCH_STATUS.FINAL, 1)];
      const bets = [
        createBet(1, 1, 100, 1, 1), // Exact draw
        createBet(2, 2, 100, 2, 2), // Wrong draw score but winner correct
      ];

      const ranking = getRoundsRanking(2026, users, matches, matches, bets);

      expect(ranking[0].ranking[0].score.exacts).toBe(1);
      expect(ranking[0].ranking[0].score.points).toBe(AWARD_POINTS.exactScore);
      expect(ranking[0].ranking[1].score.winnersOnly).toBe(1);
      expect(ranking[0].ranking[1].score.points).toBe(AWARD_POINTS.winnerOnly);
    });
  });
});
