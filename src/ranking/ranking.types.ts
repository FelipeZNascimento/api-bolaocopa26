import type { IUser } from "#user/user.types.js";

export interface ICalculatedRankingLine {
  accumulatedScore: IRankingScore;
  isFinished: boolean;
  round?: number;
  score: IRankingScore;
  user: Pick<IUser, "id" | "isActive" | "name" | "nickname">;
}

export interface ICumulativePointsByRound {
  exactScoreHits: number;
  pointsVariation: number;
  round: number;
  totalPoints: number;
}

export interface IRankingScore {
  betCount: number;
  exacts: number;
  extras?: IRankingScoreExtras;
  gameCount: number;
  misses: number;
  oneScores: number;
  percentage: number;
  points: number;
  position: number;
  positionVariation: number;
  winnersOnly: number;
}
export interface IRankingScoreExtras {
  champion: number;
  defense: number;
  offense: number;
  points: number;
  striker: number;
}

export interface IRawExtras {
  "1": number;
  "2": number;
  "3": number;
  "4": number;
  "5": number;
  "6": number;
  "7": number;
  "8": number;
  "9": number;
  "10": number;
  "11": number;
  "12": number[];
  "13": number[];
  TExtraType: number;
}

export interface IRoundRanking {
  ranking: ICalculatedRankingLine[];
  round: number;
}

export type TRankingWinner = "away" | "draw" | "home";
