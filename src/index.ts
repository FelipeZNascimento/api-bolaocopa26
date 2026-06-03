// import { connection } from "#database/db.js";
import { EditionService } from "#edition/edition.service.js";
import {
  getEditionInfoFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
} from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MatchService } from "#match/match.service.js";
import { MatchSyncService } from "#match/match.sync.service.js";
import {
  getEventsFromCacheOrFetch,
  getEventsInfoFromCacheOrFetch,
  getMatchesFromCacheOrFetch,
} from "#match/match.utils.js";
import { NewsScrapeService } from "#news/news.scrape.service.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import app from "./app.js";

const warmUpCache = async (): Promise<void> => {
  const editionService = new EditionService();
  const matchService = new MatchService();
  const teamService = new TeamService();

  const { currentEdition } = await getEditionInfoFromCacheOrFetch(editionService);
  if (!currentEdition) {
    logger.warn("No current edition configured, skipping cache warm-up");
    return;
  }

  const [teams, stadiums, referees] = await Promise.all([
    getTeamsFromCacheOrFetch(teamService, currentEdition),
    getStadiumsFromCacheOrFetch(editionService, currentEdition, currentEdition),
    getRefereesFromCacheOrFetch(editionService, currentEdition, currentEdition),
  ]);

  const players = await getPlayersFromCacheOrFetch(teamService, currentEdition, teams);

  await Promise.all([
    getMatchesFromCacheOrFetch(matchService, currentEdition, currentEdition, teams, stadiums, referees),
    getEventsFromCacheOrFetch(matchService, currentEdition, players),
    getEventsInfoFromCacheOrFetch(matchService),
  ]);

  logger.info("Cache warm-up complete");
};

const port = process.env.PORT ?? "9001";

const server = app.listen(port, () => {
  logger.info({ port }, `Bolao da Copa 2026 API listening on port ${port}`);
});

WebSocketService.getInstance(server);

// Warm up all caches before accepting traffic
void warmUpCache();

// Start the match sync service
const matchSyncService = MatchSyncService.getInstance();
matchSyncService.start();

// Start the news scraper service
const newsScrapeService = NewsScrapeService.getInstance();
newsScrapeService.start();

// Graceful shutdown handler
const shutdown = () => {
  console.warn("Shutdown signal received");

  // Stop match sync service
  matchSyncService.stop();

  // Stop news scraper service
  newsScrapeService.stop();

  // Add WebSocket cleanup
  const wsService = WebSocketService.getInstance();
  wsService.broadcast("Server shutting down");

  // Add connection draining
  app.disable("connection"); // Stop accepting new connections

  // Add timeout for existing connections
  setTimeout(() => {
    console.warn("Connection drain timeout reached, forcing shutdown");
    process.exit(1);
  }, 10000);

  server.close(() => {
    console.info("HTTP server closed");

    try {
      // connection.destroy();
      console.info("Database connections closed");

      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error: Error) => {
  logger.error({ err: error }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});

export default server;
