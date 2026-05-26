import type { IEventRaw, IMatch, IMatchRaw } from "#match/match.types.js";
import { ResultSetHeader } from "mysql2/promise";

import db from "#database/db.js";

export class MatchService {
  async getByEdition(editionId: number) {
    const rows: IMatchRaw[] = await db.query(
      `SELECT matches.id, matches.id_fifa as idFifa, matches.timestamp, matches.round,
        matches.goals_home as scoreHome, matches.goals_away as scoreAway,
        matches.penalties_home as penaltiesHome, matches.penalties_away as penaltiesAway,
        matches.id_referee as idReferee, matches.id_stadium as idStadium,
        matches.status, matches.gametime,
        
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

  async getEarliestMatchesForRounds(editionId: number): Promise<{ round: number; timestamp: number }[]> {
    const rows: { round: number; timestamp: number }[] = await db.query(
      `SELECT round, MIN(timestamp) as timestamp
        FROM matches
        WHERE id_edition = ? AND round IN (4, 5)
        GROUP BY round
        ORDER BY round ASC`,
      [editionId],
    );
    return rows;
  }

  async getEvents(editionId: number) {
    const rows: IEventRaw[] = await db.query(
      `SELECT events.id, events.id_match as matchId, events.gametime, events.id_player as playerId,
        events.id_player_two as playerTwoId, events.id_event_info as eventId,
        events_info.description as eventDescription, events_info.description_en as eventDescriptionEn
        FROM events
        LEFT JOIN events_info ON events_info.id = events.id_event_info
        LEFT JOIN matches ON matches.id = events.id_match
        WHERE matches.id_edition = ?
        ORDER BY matches.timestamp ASC`,
      [editionId],
    );
    return rows;
  }

  async getTimestampByMatchId(matchId: number) {
    const row = await db.query(
      `SELECT matches.id, matches.timestamp
        FROM matches
        WHERE matches.id = ?`,
      [matchId],
    );

    return row as undefined | { id: number; timestamp: number };
  }

  /**
   * Update a match in the database
   * @param match - The match object with updated data
   * @returns The result of the update operation
   */
  async updateMatch(match: IMatch): Promise<ResultSetHeader> {
    return await db.query(
      `UPDATE matches
        SET 
          timestamp = ?,
          goals_home = ?,
          goals_away = ?,
          penalties_home = ?,
          penalties_away = ?,
          status = ?,
          gametime = ?
        WHERE id = ?`,
      [
        match.timestamp,
        match.score.home,
        match.score.away,
        match.score.homePenalties ?? 0,
        match.score.awayPenalties ?? 0,
        match.status,
        match.gametime,
        match.id,
      ],
    );
  }
}
