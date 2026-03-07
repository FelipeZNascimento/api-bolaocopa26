import type { IConfederation, ITeam } from "#team/team.types.js";

import db from "#database/db.js";

export class TeamService {
  async getAll(editionId: number) {
    const rows: ITeam[] = await db.query(
      `SELECT teams.id as id, teams.group as idGroup, teams.id_fifa as idFifa,
        countries.id_confederation as idConfederation, countries.name as name,
        countries.name_en as nameEn, countries.abbreviation as abbreviation,
        countries.abbreviation_en as abbreviationEn, countries.iso_code as isoCode, 
        GROUP_CONCAT(DISTINCT teams_colors.color ORDER BY teams_colors.id) colorsRaw
        FROM teams
        LEFT JOIN countries ON countries.id = teams.id_country
        LEFT JOIN teams_colors ON teams_colors.id_team = teams.id
        WHERE teams.id != 0 AND teams.id_edition = ?
        GROUP BY teams.id
        ORDER BY countries.name ASC`,
      [editionId],
    );

    return rows;
  }

  async getById(teamId: number, editionId: number) {
    const [row]: ITeam[] = await db.query(
      `SELECT teams.id as id, teams.group as teamGroup, teams.id_fifa as idFifa,
        countries.id_confederation as idConfederation, countries.name as name,
        countries.name_en as nameEn, countries.abbreviation as abbreviation,
        countries.abbreviation_en as abbreviationEn, countries.iso_code as isoCode, 
        confederations.id as confederationId, confederations.name as confederationName,
        confederations.name_en as confederationNameEn,
        confederations.abbreviation as confederationAbbreviation,
        GROUP_CONCAT(DISTINCT teams_colors.color ORDER BY teams_colors.id) colorsRaw
        FROM teams
        LEFT JOIN countries ON countries.id = teams.id_country
        LEFT JOIN confederations ON countries.id_confederation = confederations.id
        LEFT JOIN teams_colors ON teams_colors.id_team = teams.id
        WHERE teams.id != 0 AND teams.id_edition = ? AND teams.id = ?
        GROUP BY teams.id
        ORDER BY countries.name ASC`,
      [editionId, teamId],
    );

    return row;
  }

  async getConfederations() {
    const rows: IConfederation[] = await db.query(
      `SELECT id, abbreviation, name, name_en as nameEn
        FROM confederations
        ORDER BY abbreviation ASC`,
      [],
    );
    return rows;
  }
}
