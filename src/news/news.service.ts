import type { INewsItem } from "#news/news.types.js";

import db from "#database/db.js";

export class NewsService {
  async fetch(editionId: number): Promise<INewsItem[]> {
    const rows: INewsItem[] = await db.query(
      `SELECT news.id, news.ge_id as geId, UNIX_TIMESTAMP(news.timestamp) as timestamp,
        news.title, news.summary, news.link, news.image, news.edition_id as editionId
        FROM news
        WHERE news.edition_id = ?
        ORDER BY news.timestamp ASC`,
      [editionId],
    );

    return rows;
  }

  async findByLink(link: string): Promise<null | { id: number }> {
    const rows: { id: number }[] = await db.query(`SELECT id FROM news WHERE link = ? LIMIT 1`, [link]);
    return rows[0] ?? null;
  }

  async insert(item: INewsItem): Promise<void> {
    await db.query(
      `INSERT INTO news (ge_id, timestamp, title, summary, link, image, edition_id)
       VALUES (?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?)`,
      [item.ge_id, item.timestamp, item.title, item.summary, item.link, item.image, item.edition_id],
    );
  }
}
