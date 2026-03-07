import { IBet, IExtraBet, IExtraBetResult } from "#bet/bet.types.js";
import { FOOTBALL_MATCH_STATUS, MATCH_STATUS } from "#match/match.constants.js";
import { IMatch } from "#match/match.types.js";
import { IUser } from "#user/user.types.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";

import { AWARD_POINTS, DEFAULT_ROUND_MULTIPLIER, ROUND_MULTIPLIERS } from "./ranking.constants";
import {
  ICalculatedRankingLine,
  IRankingScore,
  IRankingScoreExtras,
  IRoundRanking,
  TRankingWinner,
} from "./ranking.types";

const FINAL_ROUND_STATUSES = new Set<number>([FOOTBALL_MATCH_STATUS.FINAL, FOOTBALL_MATCH_STATUS.FINAL_PENALTIES]);
export const getSeasonRanking = (
  roundsRanking: IRoundRanking[],
  baseComparisonRoundNumber: number,
  extraBets: {
    champion: IExtraBet[];
    defense: IExtraBet[];
    offense: IExtraBet[];
    striker: IExtraBet[];
  },
  extraBetsResults: {
    champion: IExtraBetResult[];
    defense: IExtraBetResult[];
    offense: IExtraBetResult[];
    striker: IExtraBetResult[];
  },
) => {
  const lastRound = Math.max(...roundsRanking.map((r) => r.round));
  const lastRoundRanking = roundsRanking.find((r) => r.round === lastRound)?.ranking;
  const isSeasonFinished =
    baseComparisonRoundNumber === lastRound && (lastRoundRanking?.every((line) => line.isFinished) ?? false);

  let seasonRanking: ICalculatedRankingLine[] =
    lastRoundRanking?.map((line) => {
      const calculatedExtraBets = calculateExtraBets(line.user.id, extraBets, extraBetsResults);
      const extrasTotal =
        calculatedExtraBets.champion +
        calculatedExtraBets.defense +
        calculatedExtraBets.offense +
        calculatedExtraBets.striker;
      calculatedExtraBets.points = extrasTotal;

      return {
        accumulatedScore: {
          ...line.accumulatedScore,
          extras: calculatedExtraBets,
          points: line.accumulatedScore.points + extrasTotal,
        },
        isFinished: isSeasonFinished,
        score: {
          ...line.accumulatedScore,
          extras: calculatedExtraBets,
          points: line.accumulatedScore.points + extrasTotal,
        },
        user: line.user,
      };
    }) ?? [];

  seasonRanking = sortRanking(seasonRanking);
  seasonRanking = addPositioning(seasonRanking);
  return seasonRanking;
};

export const calculateExtraBets = (
  userId: number,
  extraBets: {
    champion: IExtraBet[];
    defense: IExtraBet[];
    offense: IExtraBet[];
    striker: IExtraBet[];
  },
  extraBetsResults: {
    champion: IExtraBetResult[];
    defense: IExtraBetResult[];
    offense: IExtraBetResult[];
    striker: IExtraBetResult[];
  },
): IRankingScoreExtras => {
  const championBet = extraBets.champion.find((bet) => bet.user.id === userId);
  const defenseBet = extraBets.defense.find((bet) => bet.user.id === userId);
  const offenseBet = extraBets.offense.find((bet) => bet.user.id === userId);
  const strikerBet = extraBets.striker.find((bet) => bet.user.id === userId);

  const hasChampionMatch =
    championBet && extraBetsResults.champion.some((result) => result.team.id === championBet.team.id);
  const hasDefenseMatch =
    defenseBet && extraBetsResults.defense.some((result) => result.team.id === defenseBet.team.id);
  const hasOffenseMatch =
    offenseBet && extraBetsResults.offense.some((result) => result.team.id === offenseBet.team.id);
  const hasStrikerMatch =
    strikerBet && extraBetsResults.striker.some((result) => result.player.id === strikerBet.player.id);

  return {
    champion: hasChampionMatch ? AWARD_POINTS.extraChampion : 0,
    defense: hasDefenseMatch ? AWARD_POINTS.extraDefense : 0,
    offense: hasOffenseMatch ? AWARD_POINTS.extraOffense : 0,
    points: 0,
    striker: hasStrikerMatch ? AWARD_POINTS.extraStriker : 0,
  };
};

export const getRoundsRanking = (
  season: number,
  users: IUser[],
  matches: IMatch[],
  startedMatches: IMatch[],
  bets: IBet[],
): IRoundRanking[] => {
  const roundsRanking: IRoundRanking[] = [];
  const rounds = [...new Set(matches.map((match) => match.round))];

  rounds.forEach((round) => {
    const roundCacheKey = getRoundCacheKey(season, round);
    const cachedRanking = cachedInfo.get<ICalculatedRankingLine[]>(roundCacheKey);
    // If a cached ranking for the finished round exists, use it.
    if (cachedRanking) {
      roundsRanking.push({ ranking: cachedRanking, round });
      return;
    }

    const previousRound = round - 1;
    const previousRoundRanking =
      previousRound > 0 ? roundsRanking.find((r) => r.round === previousRound)?.ranking : undefined;

    // If not, calculate the ranking for the finished round and cache it.
    const roundRanking = calculateRound(users, startedMatches, bets, round, previousRoundRanking);
    roundsRanking.push({ ranking: roundRanking, round });

    if (isRoundFinished(matches, round)) {
      cachedInfo.set(roundCacheKey, roundRanking);
    }
  });

  return roundsRanking;
};

const isRoundFinished = (matches: IMatch[], round: number): boolean => {
  const roundMatches = matches.filter((match) => match.round === round);
  return roundMatches.length > 0 && roundMatches.every((match) => FINAL_ROUND_STATUSES.has(match.status));
};

const getRoundCacheKey = (season: number, round: number): string => {
  return String(CACHE_KEYS.WEEKLY_RANKING) + "_" + String(season) + "_" + String(round);
};

const calculateRound = (
  users: IUser[],
  matches: IMatch[],
  bets: IBet[],
  round: number,
  previousRoundRanking?: ICalculatedRankingLine[],
): ICalculatedRankingLine[] => {
  const filteredMatches = matches.filter((match) => match.status !== MATCH_STATUS.NOT_STARTED && match.round === round);

  const gameCount = filteredMatches.length;
  const matchById = new Map(filteredMatches.map((match) => [match.id, match]));
  const maxPoints = AWARD_POINTS.exactScore * getRoundMultiplier(round);

  const ranking: ICalculatedRankingLine[] = users.map((user) => {
    const previousUserLine = previousRoundRanking?.find((line) => line.user.id === user.id);
    const accumulatedScore: IRankingScore = previousUserLine?.accumulatedScore ?? {
      betCount: 0,
      exacts: 0,
      gameCount: 0,
      misses: 0,
      oneScores: 0,
      percentage: 0,
      points: 0,
      position: 0,
      positionVariation: 0,
      winnersOnly: 0,
    };

    const score: IRankingScore = {
      betCount: 0,
      exacts: 0,
      gameCount: gameCount,
      misses: 0,
      oneScores: 0,
      percentage: 0,
      points: 0,
      position: 0,
      positionVariation: 0,
      winnersOnly: 0,
    };

    const userBets = bets.filter((bet) => bet.user.id === user.id);
    userBets.forEach((bet) => {
      const match = matchById.get(bet.matchId);
      if (!match) {
        return;
      }

      score.betCount += 1;

      const actualWinner = getWinner(match.score.home, match.score.away);
      const predictedWinner = getWinner(bet.scoreHome, bet.scoreAway);
      const isWinnerCorrect = actualWinner === predictedWinner;

      if (!isWinnerCorrect) {
        score.misses += 1;
        return;
      }

      const isHomeScoreCorrect = match.score.home === bet.scoreHome;
      const isAwayScoreCorrect = match.score.away === bet.scoreAway;
      const roundMultiplier = getRoundMultiplier(match.round);

      if (isHomeScoreCorrect && isAwayScoreCorrect) {
        score.points += AWARD_POINTS.exactScore * roundMultiplier;
        score.exacts += 1;
      } else if (isHomeScoreCorrect || isAwayScoreCorrect) {
        score.points += AWARD_POINTS.oneScore * roundMultiplier;
        score.oneScores += 1;
      } else {
        score.points += AWARD_POINTS.winnerOnly * roundMultiplier;
        score.winnersOnly += 1;
      }
    });

    score.percentage = gameCount > 0 ? Number(((score.points / (gameCount * maxPoints)) * 100).toFixed(1)) : 0;
    const totalGameCount = accumulatedScore.gameCount + score.gameCount;
    const accumulatedPercentage =
      totalGameCount > 0
        ? Number(
            (
              (accumulatedScore.percentage * accumulatedScore.gameCount + score.percentage * score.gameCount) /
              totalGameCount
            ).toFixed(1),
          )
        : 0;

    return {
      accumulatedScore: {
        betCount: accumulatedScore.betCount + score.betCount,
        exacts: accumulatedScore.exacts + score.exacts,
        gameCount: accumulatedScore.gameCount + score.gameCount,
        misses: accumulatedScore.misses + score.misses,
        oneScores: accumulatedScore.oneScores + score.oneScores,
        percentage: accumulatedPercentage,
        points: accumulatedScore.points + score.points,
        position: 0,
        positionVariation: 0,
        winnersOnly: accumulatedScore.winnersOnly + score.winnersOnly,
      },
      isFinished: isRoundFinished(matches, round),
      round: round,
      score: score,
      user: user,
    };
  });

  // Sort by accumulated score first to ensure the correct position variation calculation, then by score for the final ranking.
  let rankingByAccumulated = sortRanking(ranking, true);
  rankingByAccumulated = addPositioning(rankingByAccumulated, true);

  let rankingByScore = sortRanking(rankingByAccumulated);
  rankingByScore = addPositioning(rankingByScore);

  rankingByScore.forEach((line) => {
    const previousRoundLine = previousRoundRanking?.find((l) => l.user.id === line.user.id);
    if (previousRoundLine) {
      line.accumulatedScore.positionVariation =
        previousRoundLine.accumulatedScore.position - line.accumulatedScore.position;
    }
  });

  return rankingByScore;
};

const getRoundMultiplier = (round: number): number => {
  return ROUND_MULTIPLIERS[round] ?? DEFAULT_ROUND_MULTIPLIER;
};

const getWinner = (scoreHome: number, scoreAway: number): TRankingWinner => {
  if (scoreHome > scoreAway) {
    return "home";
  }

  if (scoreAway > scoreHome) {
    return "away";
  }

  return "draw";
};

const sortRanking = (ranking: ICalculatedRankingLine[], isAccumulated = false): ICalculatedRankingLine[] => {
  // Sort by points, then by exacts, then by one scores and finally by name.
  // Returns a new array to avoid mutating the original one.

  if (isAccumulated) {
    return [...ranking].sort((a, b) => {
      if (b.accumulatedScore.points !== a.accumulatedScore.points) {
        return b.accumulatedScore.points - a.accumulatedScore.points;
      }

      if (b.accumulatedScore.exacts !== a.accumulatedScore.exacts) {
        return b.accumulatedScore.exacts - a.accumulatedScore.exacts;
      }

      if (b.accumulatedScore.oneScores !== a.accumulatedScore.oneScores) {
        return b.accumulatedScore.oneScores - a.accumulatedScore.oneScores;
      }

      return a.user.name.localeCompare(b.user.name);
    });
  } else {
    return [...ranking].sort((a, b) => {
      if (b.score.points !== a.score.points) {
        return b.score.points - a.score.points;
      }

      if (b.score.exacts !== a.score.exacts) {
        return b.score.exacts - a.score.exacts;
      }

      if (b.score.oneScores !== a.score.oneScores) {
        return b.score.oneScores - a.score.oneScores;
      }

      return a.user.name.localeCompare(b.user.name);
    });
  }
};

const addPositioning = (ranking: ICalculatedRankingLine[], isAccumulated = false): ICalculatedRankingLine[] => {
  // Adds position to each ranking line.
  // If drawn with the previous line, it will have the same position as the previous one - then skip one.
  // Returns a new array to avoid mutating the original one.
  const rankingWithPosition = [...ranking];

  if (isAccumulated) {
    rankingWithPosition.forEach((rankingLine, index) => {
      if (index === 0) {
        rankingLine.accumulatedScore.position = 1;
        return;
      }

      const previous = rankingWithPosition[index - 1];
      const isDraw =
        rankingLine.accumulatedScore.points === previous.accumulatedScore.points &&
        rankingLine.accumulatedScore.exacts === previous.accumulatedScore.exacts &&
        rankingLine.accumulatedScore.oneScores === previous.accumulatedScore.oneScores;

      rankingLine.accumulatedScore.position = isDraw ? previous.accumulatedScore.position : index + 1;
    });
  } else {
    rankingWithPosition.forEach((rankingLine, index) => {
      if (index === 0) {
        rankingLine.score.position = 1;
        return;
      }

      const previous = rankingWithPosition[index - 1];
      const isDraw =
        rankingLine.score.points === previous.score.points &&
        rankingLine.score.exacts === previous.score.exacts &&
        rankingLine.score.oneScores === previous.score.oneScores;

      rankingLine.score.position = isDraw ? previous.score.position : index + 1;
    });
  }

  return rankingWithPosition;
};
