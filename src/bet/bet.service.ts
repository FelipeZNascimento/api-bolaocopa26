import type { IBetRaw, IExtraBetRaw, IExtraBetResultRaw } from "#bet/bet.types.js";

import db from "#database/db.js";
import { ResultSetHeader } from "mysql2/promise";

export class BetService {
  async getExtras(edition: number, editionStart: number) {
    const rows = await db.query(
      `SELECT extra_bets.id, extra_bets.id_user as userId, extra_bets.id_extra_type as extraType, extra_bets.id_team as teamId,
        extra_bets.id_player as playerId, extra_bets.timestamp,
        users.nickname as nickname, users.name as name,
        users_edition.is_active as isActive
        FROM extra_bets
        LEFT JOIN users ON extra_bets.id_user = users.id
        LEFT JOIN users_edition ON extra_bets.id_user = users_edition.id_user AND users_edition.id_edition = ?
        LEFT JOIN players ON players.id = extra_bets.id_player
        WHERE extra_bets.id_edition = ? AND users_edition.is_active = 1 AND ? < UNIX_TIMESTAMP()`,
      [edition, edition, editionStart],
    );

    return rows as IExtraBetRaw[];
  }

  async getExtrasFromUserId(edition: number, userId: number) {
    const rows = await db.query(
      `SELECT extra_bets.id, extra_bets.id_user as userId, extra_bets.id_extra_type as extraType, extra_bets.id_team as teamId,
        extra_bets.id_player as playerId, extra_bets.timestamp,
        users.nickname as nickname, users.name as name,
        users_edition.is_active as isActive
        FROM extra_bets
        LEFT JOIN users ON extra_bets.id_user = users.id
        LEFT JOIN users_edition ON extra_bets.id_user = users_edition.id_user AND users_edition.id_edition = ?
        LEFT JOIN players ON players.id = extra_bets.id_player
        WHERE extra_bets.id_edition = ? AND users_edition.is_active = 1 AND extra_bets.id_user = ?`,
      [edition, edition, userId],
    );

    return rows as IExtraBetRaw[];
  }

  async getExtrasResults(season: number, editionStart: number) {
    const rows: IExtraBetResultRaw[] = await db.query(
      `SELECT extra_bets_results.id_player as playerId, extra_bets_results.id_team as teamId,
        extra_bets_results.id_type as extraType
        FROM extra_bets_results
        LEFT JOIN players ON players.id = extra_bets_results.id_player
        WHERE extra_bets_results.id_edition = ? AND ? < UNIX_TIMESTAMP()`,
      [season, editionStart],
    );

    return rows;
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

  async update(homeScore: null | number, awayScore: null | number, matchId: number, userId: number) {
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO bets (id_match, id_user, goals_home, goals_away)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE goals_home = ?, goals_away = ?`,
      [matchId, userId, homeScore, awayScore, homeScore, awayScore],
    );

    return rows;
  }

  async updateExtras(extraType: string, playerId: number, teamId: number, userId: number, editionId: number) {
    console.log("Updating extras with", { editionId, extraType, playerId, teamId, userId });
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO extra_bets (id_user, id_edition, id_extra_type, id_team, id_player) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id_extra_type = ?, id_team = ?, id_player = ?`,
      [userId, editionId, extraType, teamId, playerId, extraType, teamId, playerId],
    );

    return rows;
  }
}
