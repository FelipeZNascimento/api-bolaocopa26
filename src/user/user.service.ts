import type { IUser } from "#user/user.types.js";

import db from "#database/db.js";
// import { ICount } from "#shared/shared.types.js";
import { ResultSetHeader } from "mysql2/promise";

export class UserService {
  async getByEdition(edition: number) {
    const rows: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp,
        (UNIX_TIMESTAMP(NOW()) - users.timestamp) < 600 AS isOnline
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users_edition.id_edition = ? AND users_edition.is_active = 1
        ORDER BY users.nickname ASC`,
      [edition],
    );

    return rows;
  }

  async getByEmail(email: string) {
    const row: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.email, users.name, users.nickname,
        users_edition.id AS seasonId, users_edition.is_active as isActive
        FROM users
        INNER JOIN users_edition ON users.id = users_edition.id_user
        WHERE users.email = ?`,
      [email],
    );

    return row.length > 0 ? row[0] : null;
  }

  async getById(userId: number, editionId: number) {
    const row: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname, users.email,
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
      `SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE email = ?${userId ? " AND id != ?" : ""}`,
      userId ? [email, userId] : [email],
    );

    return rows.count === 0;
  }

  async isNicknameValid(nickname: string, userId?: number) {
    const [rows]: [{ count: number }] = await db.query(
      `SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE nickname = ?${userId ? " AND id != ?" : ""}`,
      userId ? [nickname, userId] : [nickname],
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

  async register(email: string, name: string, nickname: string, password: string) {
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO users (email, password, name, nickname) VALUES (?, ?, ?, ?)`,
      [email, password, name, nickname],
    );

    return rows;
  }

  // async setIcons(id: number, color: string, icon: string) {
  //   const rows = (await db.query(
  //     `INSERT INTO users_icon (id_user, icon, color) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE icon = ?, color = ?`,
  //     [id, icon, color, icon, color],
  //   )) as ResultSetHeader;

  //   return rows;
  // }

  async setOnCurrentSeason(edition: number, id: number) {
    const rows: ResultSetHeader = await db.query(`INSERT INTO users_edition (id_user, id_edition) VALUES (?, ?)`, [
      id,
      edition,
    ]);

    return rows;
  }

  async updateLastOnlineTime(id: number) {
    if (id === 0) {
      return;
    }

    const rows = await db.query(`UPDATE users SET timestamp = UNIX_TIMESTAMP(NOW()) WHERE id = ?`, [id]);

    return rows;
  }

  async updatePassword(currentPassword: string, newPassword: string, id: number) {
    const rows: ResultSetHeader = await db.query(
      `UPDATE users
        SET users.password = ?
        WHERE users.id = ?
        AND users.password = ?`,
      [newPassword, id, currentPassword],
    );

    return rows;
  }

  async updatePasswordFromToken(newPassword: string, id: number) {
    const rows: ResultSetHeader = await db.query(
      `UPDATE users
        SET password = ?
        WHERE id = ?`,
      [newPassword, id],
    );

    return rows;
  }

  async updateProfile(id: number, name: string, nickname: string) {
    const rows: ResultSetHeader = await db.query(
      `UPDATE users
        SET name = ?,
        nickname = ?
        WHERE id = ?`,
      [name, nickname, id],
    );

    return rows;
  }
}
