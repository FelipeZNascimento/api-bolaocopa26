import type { IUser } from "#user/user.types.js";

// import { ICount } from "#shared/shared.types.js";
import { ResultSetHeader } from "mysql2/promise";

import db from "#database/db.js";

export class UserService {
  async deleteFromEdition(userId: number, editionId: number) {
    const rows: ResultSetHeader = await db.query(`DELETE FROM users_edition WHERE id_user = ? AND id_edition = ?`, [
      userId,
      editionId,
    ]);

    return rows;
  }

  // Get all users for an edition, including inactive ones (for admin view)
  async getAllByEdition(edition: number) {
    const rows: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp, users.admin,
        (users.timestamp IS NOT NULL AND (UNIX_TIMESTAMP(NOW()) - users.timestamp) < 600) AS isOnline
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users_edition.id_edition = ?
        ORDER BY users.nickname ASC`,
      [edition],
    );

    return rows;
  }

  async getByEdition(edition: number) {
    const rows: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp, users.admin,
        (users.timestamp IS NOT NULL AND (UNIX_TIMESTAMP(NOW()) - users.timestamp) < 600) AS isOnline
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
      `SELECT SQL_NO_CACHE users.id, users.email, users.name, users.nickname, users.admin,
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
      `SELECT SQL_NO_CACHE users.id, users.name, users.nickname, users.email, users.admin,
        users_edition.is_active as isActive,
        users.timestamp,
        users_favorites.favorites
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        LEFT JOIN users_favorites ON users.id = users_favorites.user_id AND users_favorites.edition_id = ?
        WHERE users_edition.id_edition = ? AND users.id = ?
        ORDER BY users.nickname ASC`,
      [editionId, editionId, userId],
    );

    return row.length > 0 ? row[0] : null;
  }

  async getFavoritesById(userId: number, editionId: number) {
    const row: { favorites: string }[] = await db.query(
      `SELECT users_favorites.favorites
        FROM users_favorites
        WHERE users_favorites.user_id = ?
        AND users_favorites.edition_id = ?`,
      [userId, editionId],
    );

    return row.length > 0 ? row[0].favorites : "";
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

  async login(email: string, password: string) {
    const rows: IUser[] = await db.query(
      `SELECT SQL_NO_CACHE users.id, users.email, users.name, users.nickname, users.timestamp, users.admin,
        users_edition.is_active as isActive, users_favorites.favorites, users_edition.id_edition AS editionId
        FROM users
        LEFT JOIN users_edition ON users.id = users_edition.id_user
        LEFT JOIN users_favorites ON users.id = users_favorites.user_id
        WHERE users.email = ?
        AND users.password = ?`,
      [email, password],
    );

    return rows;
  }

  async register(email: string, name: string, nickname: string, password: string) {
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO users (email, password, name, nickname) VALUES (?, ?, ?, ?)`,
      [email, password, name, nickname],
    );

    return rows;
  }

  async setOnCurrentSeason(edition: number, id: number) {
    const rows: ResultSetHeader = await db.query(`INSERT INTO users_edition (id_user, id_edition) VALUES (?, ?)`, [
      id,
      edition,
    ]);

    return rows;
  }

  async updateActiveStatus(userId: number, editionId: number, newStatus: boolean) {
    const rows: ResultSetHeader = await db.query(
      `UPDATE users_edition
        SET is_active = ?
        WHERE id_user = ? AND id_edition = ?`,
      [newStatus, userId, editionId],
    );

    return rows;
  }

  async updateFavorites(id: number, editionId: number, favorites: string) {
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO users_favorites (user_id, edition_id, favorites)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE favorites = ?`,
      [id, editionId, favorites, favorites],
    );

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
