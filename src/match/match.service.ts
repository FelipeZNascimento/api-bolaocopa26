import type { IMatchRaw } from "#match/match.types.js";
// import type { IMatch, IMatchRaw, IWeek } from "#match/match.types.js";
// import type { ICount } from "#shared/shared.types.js";

import db from "#database/db.js";
// import { MatchStatus } from "#match/match.constants.js";
import { IReferee, IStadium } from "#team/team.types.js";
// import { ResultSetHeader } from "mysql2/promise";

export class MatchService {
  async getByEdition(editionId: number) {
    const rows: IMatchRaw[] = await db.query(
      `SELECT matches.id, matches.id_fifa as idFifa, matches.timestamp, matches.round, matches.goals_home as scoreHome, matches.goals_away as scoreAway,
        matches.penalties_home as penaltiesHome, matches.penalties_away as penaltiesAway, matches.id_referee as idReferee, matches.id_stadium as idStadium,
        matches.status,
        
        matches.id_stadium as idStadium, matches.id_referee as idReferee,
        matches.id_home as idHome, matches.id_away as idAway

        FROM matches
        WHERE matches.id_edition = ?
        GROUP BY matches.id
        ORDER BY matches.timestamp ASC`,
      [editionId],
    );
    return rows;
  }

  async getReferees(editionId: number) {
    const rows: IReferee[] = await db.query(
      `SELECT referees.id, referees.id_fifa as idFifa, referees.name, referees.date_of_birth as dateOfBirth,
        countries.name as country, countries.name_en as countryEn
        FROM referees
        LEFT JOIN countries ON countries.id = referees.id_country
        WHERE id_edition = ?
        ORDER BY name ASC`,
      [editionId],
    );
    return rows;
  }

  async getStadiums(editionId: number) {
    const rows: IStadium[] = await db.query(
      `SELECT stadiums.id, stadiums.name, stadiums.city, stadiums.id_country as idCountry, stadiums.capacity,
        stadiums.geo_latitude as geoLatitude, stadiums.geo_longitude as geoLongitude,
        countries.name as country, countries.name_en as countryEn
        FROM stadiums
        LEFT JOIN countries ON countries.id = stadiums.id_country
        WHERE id_edition = ?
        ORDER BY name ASC`,
      [editionId],
    );
    return rows;
  }

  // async getBySeasonWeek(season: number, week: number) {
  //   return (await db.query(
  //     `SELECT SQL_NO_CACHE matches.id, matches.timestamp, matches.week, matches.id_season as season, matches.status, matches.possession,
  //       matches.away_points as awayScore, matches.home_points as homeScore, matches.clock, matches.overUnder, matches.homeTeamOdds,
  //       teamHome.name AS teamHome, teamHome.alias AS teamHomeAlias, teamHome.id AS idTeamHome,
  //       teamHome.code AS teamHomeCode, teamHome.background AS teamHomeBackground, teamHome.foreground AS teamHomeForeground,
  //       teamAway.name AS teamAway, teamAway.alias AS teamAwayAlias, teamAway.id AS idTeamAway,
  //       teamAway.code AS teamAwayCode, teamAway.background AS teamAwayBackground, teamAway.foreground AS teamAwayForeground
  //       FROM matches
  //       INNER JOIN teams as teamHome 		ON matches.id_home_team = teamHome.id
  //       INNER JOIN teams as teamAway 		ON matches.id_away_team = teamAway.id
  //       WHERE matches.id_season = ?
  //       AND matches.week = ?
  //       ORDER BY matches.timestamp ASC`,
  //     [season, week],
  //   )) as IMatch[];
  // }

  // async getCurrentWeek() {
  //   const [row] = (await db.query(
  //     `SELECT week
  //       FROM matches
  //       WHERE matches.timestamp > UNIX_TIMESTAMP() - 24 * 3600
  //       ORDER BY timestamp ASC
  //       LIMIT 1`,
  //     [],
  //   )) as IWeek[];

  //   return row.week;
  // }

  // async getMatchesBySeason(season: number) {
  //   return (await db.query(
  //     `SELECT SQL_NO_CACHE matches.id, matches.timestamp, matches.week, matches.id_season as season, matches.status, matches.possession,
  //       matches.away_points as awayScore, matches.home_points as homeScore, matches.clock, matches.overUnder, matches.homeTeamOdds,
  //       matches.id_home_team as idHomeTeam, matches.id_away_team as idAwayTeam
  //       FROM matches
  //       WHERE matches.id_season = ?
  //       ORDER BY matches.timestamp ASC`,
  //     [season],
  //   )) as IMatch[];
  // }

  // async getTimestampByMatchId(matchId: number) {
  //   const [row] = (await db.query(
  //     `SELECT SQL_NO_CACHE matches.id, matches.timestamp
  //       FROM matches
  //       WHERE matches.id = ?`,
  //     [matchId],
  //   )) as { id: number; timestamp: number }[];

  //   return row as undefined | { id: number; timestamp: number };
  // }

  // async getWeekMatchesCount(season: number, week: number) {
  //   const [row] = (await db.query(
  //     `SELECT COUNT(*) as count
  //       FROM matches
  //       WHERE id_season = ?
  //       AND week = ?`,
  //     [season, week],
  //   )) as ICount[];

  //   return row.count;
  // }

  // async updateByMatchInfo(
  //   awayPoints: number,
  //   homePoints: number,
  //   matchStatus: MatchStatus,
  //   possession: "away" | "home" | null,
  //   clock: null | string,
  //   awayTeamCode: string,
  //   homeTeamCode: string,
  //   week: number,
  //   season: number,
  // ) {
  //   return (await db.query(
  //     `UPDATE matches
  //       SET away_points = ?,
  //       home_points = ?,
  //       status = ?,
  //       possession = ?,
  //       clock = ?
  //       WHERE id_away_team = (
  //           SELECT id
  //           FROM teams
  //           WHERE code = ?
  //       )
  //       AND id_home_team = (
  //           SELECT id
  //           FROM teams
  //           WHERE code = ?
  //       )
  //       AND week = ?
  //       AND id_season = ?`,
  //     [awayPoints, homePoints, matchStatus, possession, clock, awayTeamCode, homeTeamCode, week, season],
  //   )) as ResultSetHeader;
  // }
}
