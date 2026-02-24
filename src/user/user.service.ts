import type { IUser } from "#user/user.types.js";

import db from "#database/db.js";
// import { ICount } from "#shared/shared.types.js";
// import { ResultSetHeader } from "mysql2/promise";

export class UserService {
  // async getByEmail(email: string) {
  //   const [row] = (await db.query(
  //     `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.full_name as fullName,
  //       users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp,
  //       users_edition.id AS seasonId
  //       FROM users
  //       INNER JOIN users_edition ON users.id = users_edition.id_user
  //       LEFT JOIN users_icon ON users.id = users_icon.id_user
  //       LEFT JOIN users_online ON users.id = users_online.id_user
  //       WHERE users.login = ?
  //       GROUP BY users.id`,
  //     [email],
  //   )) as IUser[];

  //   return row;
  // }

  async getByEdition(edition: number) {
    const rows: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users_edition.id_edition = ? AND users_edition.is_active = 1
        ORDER BY users.nickname ASC`,
      [edition],
    );

    return rows;
  }

  async getById(userId: number, editionId: number) {
    const row: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users_edition.id_edition = ? AND users.id = ?
        ORDER BY users.nickname ASC`,
      [editionId, userId],
    );

    return row.length > 0 ? row[0] : null;
  }

  async isEmailValid(email: string, userId?: number) {
    const [rows]: [{ count: number }] = await db.query(
      `SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE login = ? AND id <> ?`,
      [email, userId],
    );

    return rows.count === 0;
  }

  async isUsernameValid(name: string, userId?: number) {
    const [rows]: [{ count: number }] = await db.query(
      `SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE name = ? AND id <> ?`,
      [name, userId],
    );

    return rows.count === 0;
  }

  async login(email: string, password: string, editionId: number) {
    const row: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.email, users.name, users.nickname, users.timestamp,
        users_edition.is_active as isActive
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users.email = ?
        AND users.password = ?
        AND users_edition.id_edition = ?`,
      [email, password, editionId],
    );

    return row.length > 0 ? row[0] : null;
  }

  // async register(email: string, fullName: string, name: string, password: string) {
  //   const rows = (await db.query(`INSERT INTO users (login, password, full_name, name) VALUES (?, ?, ?, ?)`, [
  //     email,
  //     password,
  //     fullName,
  //     name,
  //   ])) as ResultSetHeader;

  //   return rows;
  // }

  // async setIcons(id: number, color: string, icon: string) {
  //   const rows = (await db.query(
  //     `INSERT INTO users_icon (id_user, icon, color) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE icon = ?, color = ?`,
  //     [id, icon, color, icon, color],
  //   )) as ResultSetHeader;

  //   return rows;
  // }

  // async setOnCurrentSeason(season: number, id: number) {
  //   const rows = (await db.query(`INSERT INTO users_edition (id_user, id_season) VALUES (?, ?)`, [
  //     id,
  //     season,
  //   ])) as ResultSetHeader;

  //   return rows;
  // }

  async updateLastOnlineTime(id: number) {
    if (id === 0) {
      return;
    }

    const rows = await db.query(`UPDATE users SET timestamp = UNIX_TIMESTAMP(NOW()) WHERE id = ?`, [id]);

    return rows;
  }

  // async updatePassword(newPassword: string, currentPassword: string, id: number) {
  //   const rows = (await db.query(
  //     `UPDATE users
  //       SET password = ?
  //       WHERE id = ?
  //       AND password = ?`,
  //     [newPassword, id, currentPassword],
  //   )) as ResultSetHeader;

  //   return rows;
  // }

  // async updatePasswordFromToken(newPassword: string, id: number) {
  //   const rows = (await db.query(
  //     `UPDATE users
  //       SET password = ?
  //       WHERE id = ?`,
  //     [newPassword, id],
  //   )) as ResultSetHeader;

  //   return rows;
  // }

  // async updateProfile(email: string, name: string, username: string, id: number) {
  //   const rows = (await db.query(
  //     `UPDATE users
  //       SET name = ?,
  //       full_name = ?,
  //       login = ?
  //       WHERE id = ?`,
  //     [username, name, email, id],
  //   )) as ResultSetHeader;

  //   return rows;
  // }
}
