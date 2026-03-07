import type { IBetRaw, IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";

import db from "#database/db.js";
// import { ResultSetHeader } from "mysql2/promise";

export class BetService {
  async getExtras(edition: number, editionStart: number) {
    const rows = await db.query(
      `SELECT extra_bets.id, extra_bets.id_user as userId, extra_bets.id_extra_type as extraType, extra_bets.id_team as teamId,
        extra_bets.id_player as playerId, extra_bets.timestamp,
        users.nickname as nickname, users.name as name,
        users_edition.is_active as isActive,
        players.name as playerName, players.number as playerNumber,
        players.date_of_birth as playerBirth, players.height as playerHeight, players.weight as playerWeight,
        positions.id as positionId, positions.description as positionDescription, positions.abbreviation as positionAbbreviation
        FROM extra_bets
        LEFT JOIN users ON extra_bets.id_user = users.id
        LEFT JOIN users_edition ON extra_bets.id_user = users_edition.id_user
        LEFT JOIN players ON players.id = extra_bets.id_player
        LEFT JOIN positions ON positions.id = players.id_position
        WHERE extra_bets.id_edition = ? AND users_edition.is_active = 1 AND ? < UNIX_TIMESTAMP()`,
      [edition, editionStart],
    );

    return rows as IExtraBetRaw[];
  }

  async getExtrasResults(season: number, editionStart: number) {
    const row = await db.query(
      `SELECT extra_bets_results.id_player as playerId, extra_bets_results.id_team as teamId,
        extra_bets_results.id_type as extraType,
        players.name as playerName, players.number as playerNumber,
        players.date_of_birth as playerBirth, players.height as playerHeight, players.weight as playerWeight,
        positions.id as positionId, positions.description as positionDescription, positions.abbreviation as positionAbbreviation
        FROM extra_bets_results
        LEFT JOIN players ON players.id = extra_bets_results.id_player
        LEFT JOIN positions ON positions.id = players.id_position
        WHERE extra_bets_results.id_edition = ? AND ? < UNIX_TIMESTAMP()`,
      [season, editionStart],
    );

    return row as IExtraBetResultRaw[];
  }

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
