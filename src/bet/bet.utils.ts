import type { ITeam } from "#team/team.types.js";

import { EXTRA_TYPES } from "./bet.constants";
import { IBet, IBetRaw, IExtraBetRaw, IExtraBetResultRaw } from "./bet.types";

export const parseExtraBetResult = (extraBetResult: IExtraBetResultRaw, teams: ITeam[]) => {
  const team = teams.find((t) => t.id === extraBetResult.teamId);

  if (!team) {
    throw new Error(`Team with id ${extraBetResult.teamId.toString()} not found`);
  }

  return {
    extraType: extraBetResult.extraType,
    player: {
      dateOfBirth: extraBetResult.playerBirth,
      height: extraBetResult.playerHeight,
      id: extraBetResult.playerId,
      name: extraBetResult.playerName,
      number: extraBetResult.playerNumber,
      position: {
        abbreviation: extraBetResult.positionAbbreviation,
        description: extraBetResult.positionDescription,
        id: extraBetResult.positionId,
      },
      weight: extraBetResult.playerWeight,
    },
    team: team,
  };
};

export const parseExtraBets = (extraBets: IExtraBetRaw, teams: ITeam[]) => {
  const team = teams.find((t) => t.id === extraBets.teamId);

  if (!team) {
    throw new Error(`Team with id ${extraBets.teamId.toString()} not found`);
  }

  return {
    extraType: extraBets.extraType,
    id: extraBets.id,
    player: {
      dateOfBirth: extraBets.playerBirth,
      height: extraBets.playerHeight,
      id: extraBets.playerId,
      name: extraBets.playerName,
      number: extraBets.playerNumber,
      position: {
        abbreviation: extraBets.positionAbbreviation,
        description: extraBets.positionDescription,
        id: extraBets.positionId,
      },
      weight: extraBets.playerWeight,
    },
    team: team,
    timestamp: extraBets.timestamp,
    user: {
      id: extraBets.userId,
      isActive: !!extraBets.isActive,
      name: extraBets.name,
      nickname: extraBets.nickname,
    },
  };
};

export const parseBetQueryResponse = (rawBets: IBetRaw[]) => {
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
  parser: (bet: TRaw, teams: ITeam[]) => TFormatted,
  teams: ITeam[],
  resultsKey: TKey = "bets" as TKey,
): (Record<TKey, TFormatted[]> & { description: string; extraType: number })[] => {
  const groupedByExtraType = new Map<number, TFormatted[]>();

  rawBets.forEach((bet) => {
    const formattedBet = parser(bet, teams);

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
