import type { IBetRaw } from "#bet/bet.types.js";

import db from "#database/db.js";
// import { ResultSetHeader } from "mysql2/promise";

export class BetService {
  // async getExtras(season: number, seasonStart: number) {
  //   const rows = (await db.query(
  //     `SELECT SQL_NO_CACHE extra_bets_new.id_user as userId, extra_bets_new.id_season as idSeason, extra_bets_new.json,
  //       users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
  //       FROM extra_bets_new
  //       INNER JOIN users 		ON users.id = extra_bets_new.id_user
  //       LEFT JOIN users_icon    ON users.id = users_icon.id_user
  //       WHERE id_season = ?
  //       AND UNIX_TIMESTAMP() >= ?`,
  //     [season, seasonStart],
  //   )) as IExtraBet[];

  //   return rows;
  // }

  // async getExtrasResults(season: number, seasonStart: number) {
  //   const row = (await db.query(
  //     `SELECT SQL_NO_CACHE id_season as idSeason, json
  //       FROM extra_bets_results_new
  //       WHERE id_season = ?
  //       AND UNIX_TIMESTAMP() >= ?`,
  //     [season, seasonStart],
  //   )) as IExtraBet[] | undefined;

  //   return row;
  // }

  async getStartedMatchesBetsByMatchIds(matchIds: number[]) {
    if (matchIds.length === 0) {
      return [];
    }

    const rows = await db.query(
      `SELECT bets.id, bets.id_match as matchId, bets.id_user as userId,
        bets.goals_home as scoreHome, bets.goals_away as scoreAway, bets.timestamp,
        users.nickname
        FROM bets
        LEFT JOIN users ON bets.id_user = users.id
        LEFT JOIN matches ON bets.id_match = matches.id
        WHERE matches.timestamp <= UNIX_TIMESTAMP()
        AND bets.id_match IN (?) AND bets.goals_home IS NOT null AND bets.goals_away IS NOT null`,
      [matchIds],
    );

    return rows as IBetRaw[];
  }

  async getUserMatchesBetsByMatchIds(matchIds: number[], userId: number) {
    if (matchIds.length === 0) {
      return [];
    }

    const rows = await db.query(
      `SELECT bets.id, bets.id_match as matchId, bets.id_user as userId,
        bets.goals_home as scoreHome, bets.goals_away as scoreAway, bets.timestamp,
        users.nickname, users.id as userId
        FROM bets
        INNER JOIN matches 		ON matches.id = bets.id_match
        INNER JOIN users 		ON users.id = bets.id_user
        WHERE bets.id_user = ?
        AND bets.id_match IN (?)
        GROUP BY bets.id_match, bets.id_user`,
      [userId, matchIds],
    );

    return rows as IBetRaw[];
  }

  // async update(betValue: number, matchId: number, userId: number) {
  //   return (await db.query(
  //     `INSERT INTO bets (id_match, id_user, id_bet)
  //       VALUES (?, ?, ?)
  //       ON DUPLICATE KEY UPDATE id_bet = ?`,
  //     [matchId, userId, betValue, betValue],
  //   )) as ResultSetHeader;
  // }

  // async updateExtras(extras: string, userId: number, season: string) {
  //   return (await db.query(
  //     `INSERT INTO extra_bets_new (id_user, id_season, json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE json = ?`,
  //     [userId, season, extras, extras],
  //   )) as ResultSetHeader;
  // }
}
