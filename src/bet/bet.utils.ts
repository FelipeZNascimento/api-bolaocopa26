import type { IPlayer, ITeam } from "#team/team.types.js";

import { logger } from "#logger/logger.service.js";
import { IUser } from "#user/user.types.js";
import { EXTRA_TYPES } from "./bet.constants.js";
import { IBet, IBetRaw, IExtraBetRaw, IExtraBetResultRaw } from "./bet.types.js";

export const parseExtraBetResult = (extraBetResult: IExtraBetResultRaw, players: IPlayer[], teams: ITeam[]) => {
  const team = teams.find((t) => t.id === extraBetResult.teamId);
  const player = players.find((p) => p.id === extraBetResult.playerId);

  if (!team) {
    throw new Error(`Team with id ${extraBetResult.teamId.toString()} not found`);
  }

  return {
    extraType: extraBetResult.extraType,
    player: player ?? null,
    team: team,
  };
};

export const parseExtraBets = (extraBets: IExtraBetRaw, players: IPlayer[], teams: ITeam[], users: IUser[]) => {
  const team = teams.find((t) => t.id === extraBets.teamId);
  const player = players.find((p) => p.id === extraBets.playerId);
  const user = users.find((u) => u.id === extraBets.userId);

  if (!team) {
    logger.debug({ extraBets }, "Team not found for extra bet");
  }

  return {
    extraType: extraBets.extraType,
    id: extraBets.id,
    player: player ?? null,
    stageId: extraBets.stageId,
    team: team ?? null,
    timestamp: extraBets.timestamp,
    user: user ?? null,
  };
};

export const parseRawBets = (rawBets: IBetRaw[]) => {
  const bets: IBet[] = rawBets.map((rawBet) => {
    return {
      id: rawBet.id,
      matchId: rawBet.matchId,
      scoreAway: rawBet.scoreAway,
      scoreHome: rawBet.scoreHome,
      timestamp: rawBet.timestamp,
      user: {
        id: rawBet.userId,
        nickname: rawBet.nickname,
      },
    };
  });

  return bets;
};

export const groupExtraBetsByType = <TRaw extends { extraType: number }, TFormatted, TKey extends string = "bets">(
  rawBets: TRaw[],
  parser: (bet: TRaw, players: IPlayer[], teams: ITeam[], users: IUser[]) => TFormatted,
  players: IPlayer[],
  teams: ITeam[],
  users: IUser[],
  resultsKey: TKey = "bets" as TKey,
): (Record<TKey, TFormatted[]> & { description: string; extraType: number })[] => {
  const groupedByExtraType = new Map<number, TFormatted[]>();

  rawBets.forEach((bet) => {
    const formattedBet = parser(bet, players, teams, users);

    const existing = groupedByExtraType.get(bet.extraType);
    if (existing) {
      existing.push(formattedBet);
    } else {
      groupedByExtraType.set(bet.extraType, [formattedBet]);
    }
  });

  return Array.from(groupedByExtraType.entries()).map(([extraType, items]) => ({
    description: EXTRA_TYPES[extraType],
    extraType,
    [resultsKey]: items,
  })) as (Record<TKey, TFormatted[]> & { description: string; extraType: number })[];
};
