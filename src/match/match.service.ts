import type { IEventRaw, IMatch, IMatchRaw } from "#match/match.types.js";
// import type { IMatch, IMatchRaw, IWeek } from "#match/match.types.js";
// import type { ICount } from "#shared/shared.types.js";

import { ResultSetHeader } from "mysql2/promise";

import db from "#database/db.js";
// import { MatchStatus } from "#match/match.constants.js";
import { IReferee, IStadium } from "#team/team.types.js";

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

  async getTimestampByMatchId(matchId: number) {
    const row = await db.query(
      `SELECT SQL_NO_CACHE matches.id, matches.timestamp
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
