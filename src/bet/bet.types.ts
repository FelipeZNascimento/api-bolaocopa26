import type { IUser } from "#user/user.types.js";

import { IPlayer, ITeam } from "#team/team.types.js";
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
  player: IPlayer | null;
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
  playerId: null | number;
  teamId: number;
  timestamp: Date;
  userId: number;
}

export interface IExtraBetResult {
  extraType: number;
  player: IPlayer | null;
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
