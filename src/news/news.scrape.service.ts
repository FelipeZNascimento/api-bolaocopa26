import type { INewsItem, INewsSyncStats } from "#news/news.types.js";

import * as cheerio from "cheerio";

import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { NewsService } from "#news/news.service.js";

const SCRAPER_CONFIG = {
  enabled: process.env.NEWS_SCRAPER_ENABLED !== "false",
  interval: parseInt(process.env.NEWS_SCRAPER_INTERVAL ?? "1800000"), // 30 minutes default
  timeout: 1000 * 60 * 30, // 30 minutes
  url: process.env.NEWS_SCRAPER_URL ?? "https://ge.globo.com/futebol/copa-do-mundo/",
};

const FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
  "User-Agent":
    // eslint-disable-next-line max-len
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

export class NewsScrapeService {
  private static instance: NewsScrapeService;
  private editionService: EditionService;
  private intervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private newsService: NewsService;
  private stats: INewsSyncStats = {
    duration: 0,
    errors: 0,
    inserted: 0,
    lastSync: 0,
    totalFetched: 0,
  };

  private constructor() {
    this.editionService = new EditionService();
    this.newsService = new NewsService();
  }

  public static getInstance(): NewsScrapeService {
    if (!NewsScrapeService.instance) {
      NewsScrapeService.instance = new NewsScrapeService();
    }
    return NewsScrapeService.instance;
  }

  public getStats(): INewsSyncStats {
    return { ...this.stats };
  }

  public start(): void {
    if (!SCRAPER_CONFIG.enabled) {
      logger.info("News scraper service is disabled via configuration");
      return;
    }

    if (this.intervalId) {
      logger.warn("News scraper service is already running");
      return;
    }

    logger.info({ interval: SCRAPER_CONFIG.interval, url: SCRAPER_CONFIG.url }, "Starting news scraper service");

    void this.scrape();
    this.intervalId = setInterval(() => {
      void this.scrape();
    }, SCRAPER_CONFIG.interval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("News scraper service stopped");
    }
  }

  private extractNewsItems(html: string): INewsItem[] {
    const $ = cheerio.load(html);
    const items: INewsItem[] = [];

    $("._evt .bastian-feed-item:has(.feed-post.type-materia)").each((_, el) => {
      try {
        const $el = $(el);

        const link = $el.find(".feed-post-link").attr("href") ?? "";
        if (!link) return;

        const title = $el.find(".feed-post-body-title .feed-post-link p").text().trim();
        if (!title) return;

        const summary = $el.find(".feed-post-body-resumo p").text().trim();

        const ge_id = $el.find(".feed-post").attr("id") ?? "";

        const image = "";

        const dateMatch = link.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        const timestamp = dateMatch
          ? Math.floor(new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        items.push({ edition_id: null, ge_id, image, link, summary, timestamp, title });
      } catch (err) {
        logger.warn({ err }, "Failed to parse a news feed item");
      }
    });

    return items;
  }

  private async fetchArticleImage(articleUrl: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.timeout);
      try {
        const res = await fetch(articleUrl, { headers: FETCH_HEADERS, signal: controller.signal });
        if (!res.ok) return "";
        const html = await res.text();
        const $ = cheerio.load(html);
        return $("meta[property='og:image']").attr("content") ?? "";
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      logger.warn({ articleUrl, err }, "Could not fetch article image");
      return "";
    }
  }

  private async scrape(): Promise<void> {
    if (this.isSyncing) {
      logger.warn("News scraper already running, skipping this tick");
      return;
    }

    this.isSyncing = true;
    const start = Date.now();
    let errors = 0;
    let inserted = 0;

    try {
      logger.info({ url: SCRAPER_CONFIG.url }, "Fetching news page");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.timeout);

      let html: string;
      try {
        const response = await fetch(SCRAPER_CONFIG.url, {
          headers: FETCH_HEADERS,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
        }

        html = await response.text();
      } finally {
        clearTimeout(timeoutId);
      }

      const items = this.extractNewsItems(html);
      logger.info({ count: items.length }, "Parsed news items from page");

      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);

      for (const item of items) {
        item.edition_id = currentEdition;
        try {
          const existing = await this.newsService.findByLink(item.link);
          if (existing) continue;

          item.image = await this.fetchArticleImage(item.link);
          await this.newsService.insert(item);
          inserted++;
          logger.debug({ image: item.image, link: item.link, title: item.title }, "Inserted new news item");
        } catch (err) {
          errors++;
          logger.error({ err, link: item.link }, "Failed to upsert news item");
        }
      }

      const duration = Date.now() - start;
      this.stats = {
        duration,
        errors,
        inserted,
        lastSync: Math.floor(Date.now() / 1000),
        totalFetched: items.length,
      };

      logger.info({ duration, errors, inserted, totalFetched: items.length }, "News scrape complete");
    } catch (err) {
      errors++;
      logger.error({ err }, "News scraper fetch failed");

      this.stats = {
        ...this.stats,
        duration: Date.now() - start,
        errors,
        lastSync: Math.floor(Date.now() / 1000),
      };
    } finally {
      this.isSyncing = false;
    }
  }
}
