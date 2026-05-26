import type { IUser } from "#user/user.types.js";

// import { ICount } from "#shared/shared.types.js";
import bcrypt from "bcrypt";
import { ResultSetHeader } from "mysql2/promise";

import db from "#database/db.js";

const SALT_ROUNDS = 12;

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
      `SELECT users.id, users.email, users.name, users.nickname,
        users_edition.is_active as isActive,
        users.timestamp, users.admin,
        (users.timestamp IS NOT NULL AND (UNIX_TIMESTAMP(NOW()) - users.timestamp) < 600) AS isOnline,
        (SELECT COUNT(*) FROM extra_bets WHERE id_edition = users_edition.id_edition
        AND id_user = users.id) AS extrasCount
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
      `SELECT users.id, users.name, users.nickname,
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
    const normalizedEmail = email.toLowerCase();

    const row: IUser[] = await db.query(
      `SELECT users.id, users.email, users.name, users.nickname, users.admin,
        users_edition.id AS seasonId, users_edition.is_active as isActive
        FROM users
        INNER JOIN users_edition ON users.id = users_edition.id_user
        WHERE users.email = ?`,
      [normalizedEmail],
    );

    return row.length > 0 ? row[0] : null;
  }

  async getById(userId: number, editionId: number) {
    const row: IUser[] = await db.query(
      `SELECT users.id, users.name, users.nickname, users.email, users.admin,
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

  async getExtrasCountById(edition: number, userId: number) {
    const rows: [{ count: number }] = await db.query(
      `SELECT COUNT(*) as count FROM extra_bets WHERE id_edition = ? AND id_user = ?`,
      [edition, userId],
    );

    return rows[0].count;
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

  async isEmailRegistered(email: string, userId?: number) {
    const normalizedEmail = email.toLowerCase();

    const [rows]: [{ count: number }] = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE email = ?${userId ? " AND id != ?" : ""}`,
      userId ? [normalizedEmail, userId] : [normalizedEmail],
    );

    return rows.count > 0;
  }

  async isNicknameRegistered(nickname: string, userId?: number) {
    const [rows]: [{ count: number }] = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE nickname = ?${userId ? " AND id != ?" : ""}`,
      userId ? [nickname, userId] : [nickname],
    );

    return rows.count > 0;
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase();
    const hashRows: { password: string }[] = await db.query(`SELECT password FROM users WHERE email = ? LIMIT 1`, [
      normalizedEmail,
    ]);

    if (hashRows.length === 0) return [];

    const passwordMatch = await bcrypt.compare(password, hashRows[0].password);
    if (!passwordMatch) return [];

    const rows: IUser[] = await db.query(
      `SELECT users.id, users.email, users.name, users.nickname, users.timestamp, users.admin,
        users_edition.is_active as isActive, users_favorites.favorites, users_edition.id_edition AS editionId
        FROM users
        LEFT JOIN users_edition ON users.id = users_edition.id_user
        LEFT JOIN users_favorites ON users.id = users_favorites.user_id
        WHERE users.email = ?`,
      [normalizedEmail],
    );

    return rows;
  }

  async register(email: string, name: string, nickname: string, password: string) {
    const normalizedEmail = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const rows: ResultSetHeader = await db.query(
      `INSERT INTO users (email, password, name, nickname) VALUES (?, ?, ?, ?)`,
      [normalizedEmail, hashedPassword, name, nickname],
    );

    return rows;
  }

  async setOnCurrentEdition(edition: number, id: number) {
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
    const stored: { password: string }[] = await db.query(`SELECT password FROM users WHERE id = ? LIMIT 1`, [id]);

    if (stored.length === 0) return { affectedRows: 0 } as ResultSetHeader;

    const passwordMatch = await bcrypt.compare(currentPassword, stored[0].password);
    if (!passwordMatch) return { affectedRows: 0 } as ResultSetHeader;

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const rows: ResultSetHeader = await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, id]);

    return rows;
  }

  async updatePasswordFromToken(newPassword: string, id: number) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const rows: ResultSetHeader = await db.query(
      `UPDATE users
        SET password = ?
        WHERE id = ?`,
      [hashedPassword, id],
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
