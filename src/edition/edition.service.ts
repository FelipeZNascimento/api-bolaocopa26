import db from "#database/db.js";
import { FOOTBALL_MATCH_STATUS } from "#match/match.constants.js";

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

  async getMaxStartedRound(editionId: number): Promise<number> {
    const rows: { maxRound: null | number }[] = await db.query(
      `SELECT MAX(round) as maxRound
        FROM matches
        WHERE id_edition = ? AND timestamp <= UNIX_TIMESTAMP()`,
      [editionId],
    );
    return rows[0]?.maxRound ?? 1;
  }
}
