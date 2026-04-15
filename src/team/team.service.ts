import type { IClubRaw, IConfederation, IPlayerRaw, ITeam } from "#team/team.types.js";

import db from "#database/db.js";

export class TeamService {
  async getAll(editionId: number) {
    const rows: ITeam[] = await db.query(
      `SELECT teams.id as id, teams.group, teams.id_fifa as idFifa,
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

  async getClubs(clubIds: number[]) {
    const rows: IClubRaw[] = await db.query(
      `SELECT clubs.id, clubs.name, clubs.id_country as idCountry, countries.id as countryId, countries.name as countryName, countries.name_en as countryNameEn,
        countries.abbreviation as countryAbbreviation, countries.abbreviation_en as countryAbbreviationEn, countries.iso_code as countryIsoCode
        FROM clubs
        LEFT JOIN countries ON countries.id = clubs.id_country
        WHERE clubs.id IN (?)
        ORDER BY name ASC`,
      [clubIds],
    );
    return rows;
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

  async getPlayers(editionId: number) {
    const rows: IPlayerRaw[] = await db.query(
      `SELECT players.id, players.id_fifa as idFifa, players.id_fifa_picture as idFifaPicture, players.name, players.id_team as idTeam, players.id_position as idPosition,
          players.id_club as idClub, players.date_of_birth as dateOfBirth, players.height, players.number as number,
          positions.description as positionDescription, positions.description_en as positionDescriptionEn, positions.abbreviation as positionAbbreviation, positions.abbreviation_en as positionAbbreviationEn
          FROM players
          LEFT JOIN positions ON positions.id = players.id_position
          WHERE players.id_edition = ?
          ORDER BY name ASC`,
      [editionId],
    );
    return rows;
  }
}
