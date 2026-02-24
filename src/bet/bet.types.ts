import type { IUser } from "#user/user.types.js";
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
  idSeason: number;
  json: string;
  userColor: string;
  userIcon: string;
  userId: number;
  userName: string;
}
