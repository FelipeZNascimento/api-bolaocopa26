import type { IUser } from "#user/user.types.js";

import { ITeam } from "#team/team.types.js";
export interface IBet {
  id: number;
  matchId: number;
  scoreAway: number;
  scoreHome: number;
  timestamp: number;
  user: Pick<IUser, "id" | "nickname">;
}
export interface IBetRaw {
  id: number;
  matchId: number;
  nickname: string;
  scoreAway: number;
  scoreHome: number;
  timestamp: number;
  userId: number;
}

export interface IExtraBet {
  extraType: number;
  id: number;
  player: {
    dateOfBirth: Date | null;
    height: null | number;
    id: null | number;
    name: null | string;
    number: null | number;
    position: {
      abbreviation: null;
      description: null | string;
      id: null | number;
    };
    weight: null | number;
  };
  team: ITeam;
  timestamp: Date;
  user: Pick<IUser, "id" | "isActive" | "name" | "nickname">;
}

export interface IExtraBetRaw {
  extraType: number;
  id: number;
  isActive: number;
  name: string;
  nickname: string;
  playerBirth: Date | null;
  playerHeight: null | number;
  playerId: null | number;
  playerName: null | string;
  playerNumber: null | number;
  playerWeight: null | number;
  positionAbbreviation: null;
  positionDescription: null | string;
  positionId: null | number;
  teamId: number;
  timestamp: Date;
  userId: number;
}

export interface IExtraBetResult {
  extraType: number;
  player: {
    dateOfBirth: Date | null;
    height: null | number;
    id: null | number;
    name: null | string;
    number: null | number;
    position: {
      abbreviation: null;
      description: null | string;
      id: null | number;
    };
    weight: null | number;
  };
  team: ITeam;
}
export interface IExtraBetResultRaw {
  extraType: number;
  playerBirth: Date | null;
  playerHeight: null | number;
  playerId: null | number;
  playerName: null | string;
  playerNumber: null | number;
  playerWeight: null | number;
  positionAbbreviation: null;
  positionDescription: null | string;
  positionId: null | number;
  teamId: number;
}
