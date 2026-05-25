import db from "#database/db.js";
import { FOOTBALL_MATCH_STATUS } from "#match/match.constants.js";
import { IReferee, IStadium } from "./edition.types";

export class EditionService {
  async getCurrentRound(editionId: number): Promise<null | number> {
    const rows: { currentRound: null | number }[] = await db.query(
      `SELECT COALESCE(
          (SELECT MIN(round) FROM matches WHERE id_edition = ? AND status = ?),
          (SELECT MAX(round) FROM matches WHERE id_edition = ?)
        ) as currentRound`,
      [editionId, FOOTBALL_MATCH_STATUS.NOT_STARTED, editionId],
    );
    return rows[0]?.currentRound ?? null;
  }

  async getEditionStart(editionId: number): Promise<null | number> {
    const rows: { editionStart: null | number }[] = await db.query(
      `SELECT MIN(timestamp) as editionStart FROM matches WHERE id_edition = ?`,
      [editionId],
    );
    return rows[0]?.editionStart ?? null;
  }

  async getInfo(edition: number) {
    const rows = await db.query(
      `SELECT SQL_NO_CACHE seasons.id, seasons.description FROM seasons
        WHERE seasons.id = ?`,
      [edition],
    );

    return rows;
  }

  async getMaxStartedRound(editionId: number): Promise<null | number> {
    const rows: { maxRound: null | number }[] = await db.query(
      `SELECT MAX(round) as maxRound
        FROM matches
        WHERE id_edition = ? AND timestamp <= UNIX_TIMESTAMP()`,
      [editionId],
    );
    return rows[0]?.maxRound ?? null;
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
}
