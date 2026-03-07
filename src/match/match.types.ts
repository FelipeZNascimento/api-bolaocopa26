import { IBet } from "#bet/bet.types.js";
import { IReferee, IStadium, ITeam } from "#team/team.types.js";
import { RowDataPacket } from "mysql2/promise";

export interface IMatch extends RowDataPacket {
  awayTeam: ITeam | null;
  bets: IBet[];
  homeTeam: ITeam | null;
  id: number;
  idFifa: number;
  referee: IReferee | null;
  round: number;
  score: IScore;
  stadium: IStadium | null;
  status: number;
  timestamp: number;
}

export interface IMatchRaw extends RowDataPacket {
  id: number;
  idAway: number;
  idFifa: number;
  idHome: number;
  idReferee: number;
  idStadium: number;
  penaltiesAway: number;
  penaltiesHome: number;
  round: number;
  scoreAway: number;
  scoreHome: number;
  status: number;
  timestamp: number;
}

export interface IScore {
  away: number;
  awayPenalties?: number;
  home: number;
  homePenalties?: number;
}

export interface IWeek extends RowDataPacket {
  week: number;
}
