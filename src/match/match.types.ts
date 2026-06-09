import { IBet } from "#bet/bet.types.js";
import { IReferee, IStadium } from "#edition/edition.types.js";
import { IPlayer, ITeam } from "#team/team.types.js";
// import { RowDataPacket } from "mysql2/promise";

export interface IEvent {
  coach?: boolean;
  event: IEventInfo | null;
  gametime: string;
  id?: number;
  matchId: number;
  player: IPlayer;
  playerAssist: IPlayer | null;
  staff?: boolean;
  teamId: number;
}

export interface IEventInfo {
  code: string;
  description: string;
  descriptionEn: string;
  fifaId: number;
  id: number;
}

export interface IEventRaw {
  eventId: number;
  gametime: string;
  id: number;
  matchId: number;
  playerId: number;
  playerTwoId: null | number;
}

export interface IFifaBooking {
  Card: number; // 1 for yellow, 2 for red
  IdCoach?: string;
  IdPlayer?: string;
  IdStaff?: string;
  IdTeam: string;
  Minute: string;
}
export interface IFifaGoal {
  IdAssistPlayer: string;
  IdPlayer: string;
  IdTeam: string; // It may not be the same as the main team id in case of own goals
  Minute: string;
  Period: number;
  Type: number; // 1 for penalty, 2 for regular goal, 3 for own goal (tbc)
}

export interface IFifaMatch {
  Attendance: string;
  AwayTeam: IFifaTeam;
  AwayTeamPenaltyScore: number;
  HomeTeam: IFifaTeam;
  HomeTeamPenaltyScore: number;
  IdMatch: string;
  MatchTime: string;
  // 2: not started, 3: first half, 4: halftime, 5: second half,
  // 6: waiting ET, 7: ET 1st half, 8: ET halftime, 9: ET 2nd half
  // 10: final
  // 11: penalties
  Period: number;
  Weather: IFifaWeather;
}

export interface IFifaSubstitution {
  IdPlayerOff: string;
  IdPlayerOn: string;
  IdTeam: string;
  Minute: string;
}

export interface IFifaTeam {
  Bookings: IFifaBooking[];
  Goals: IFifaGoal[];
  Score: number;
  Substitutions: IFifaSubstitution[];
  Tactics: string;
}

export interface IFifaWeather {
  Humidity: string;
  Temperature: string;
  WindSpeed: string;
}

export interface IMatch {
  awayTeam: ITeam | null;
  bets: IBet[];
  events: IEvent[];
  gametime: string;
  group: null | string;
  homeTeam: ITeam | null;
  id: number;
  idFifa: number;
  loggedUserBets: IBet | null;
  pointsAwarded?: {
    exact: number;
    minimal: number;
    miss: number;
    partial: number;
  };
  referee: IReferee | null;
  round: number;
  score: IScore;
  stadium: IStadium | null;
  status: number;
  timestamp: number;
  weather?: IWeather;
}

export interface IMatchRaw {
  gametime: string;
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
  timestamp: string;
}

export interface IScore {
  away: number;
  awayPenalties: number;
  home: number;
  homePenalties: number;
}

export interface IWeather {
  humidity: string;
  temperature: string;
  windSpeed: string;
}

export interface IWeek {
  week: number;
}
