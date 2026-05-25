import type { IFifaMatch, IMatch } from "#match/match.types.js";

import { readFileSync } from "fs";

import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MatchExternalAPI } from "#match/match.external-api.js";
import { MatchService } from "#match/match.service.js";
import { getMatchesFromCacheOrFetch, setMatchesCache } from "#match/match.utils.js";
import { TeamService } from "#team/team.service.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WEBSOCKET_EVENTS } from "#websocket/websocket.constants.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { MATCH_STATUS } from "./match.constants";

export interface IMatchSyncStats {
  duration: number;
  errors: number;
  lastSync: number;
  totalFetched: number;
  updated: number;
}

/**
 * Configuration for the sync service
 */
const SYNC_CONFIG = {
  edition: parseInt(process.env.EDITION ?? "0"),
  enabled: process.env.MATCH_SYNC_ENABLED !== "false", // Enabled by default, disable with env var
  // interval: parseInt(process.env.MATCH_SYNC_INTERVAL ?? "30000"), // 30 seconds default
  interval: parseInt(process.env.MATCH_SYNC_INTERVAL ?? "5000"), // 30 seconds default
};

/**
 * Match Sync Service
 * Periodically fetches matches from an external API, updates cache and database,
 * and broadcasts changes via WebSocket
 */
export class MatchSyncService {
  private static instance: MatchSyncService;
  private editionService: EditionService;
  private externalAPI: MatchExternalAPI;
  private intervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private matchService: MatchService;
  private stats: IMatchSyncStats = {
    duration: 0,
    errors: 0,
    lastSync: 0,
    totalFetched: 0,
    updated: 0,
  };
  private teamService: TeamService;
  private websocketService: WebSocketService;

  private constructor() {
    this.externalAPI = new MatchExternalAPI();
    this.matchService = new MatchService();
    this.teamService = new TeamService();
    this.editionService = new EditionService();
    this.websocketService = WebSocketService.getInstance();
  }

  public static getInstance(): MatchSyncService {
    if (!MatchSyncService.instance) {
      MatchSyncService.instance = new MatchSyncService();
    }
    return MatchSyncService.instance;
  }

  /**
   * Get sync statistics
   */
  public getStats(): IMatchSyncStats {
    return { ...this.stats };
  }

  /**
   * Start the sync service
   */
  public start(): void {
    if (!SYNC_CONFIG.enabled) {
      logger.info("Match sync service is disabled via configuration");
      return;
    }

    if (!SYNC_CONFIG.edition) {
      logger.error("No edition configured, cannot start match sync service");
      return;
    }

    if (this.intervalId) {
      logger.warn("Match sync service is already running");
      return;
    }

    logger.info({ edition: SYNC_CONFIG.edition, interval: SYNC_CONFIG.interval }, "Starting match sync service");

    // Set up periodic sync
    this.intervalId = setInterval(() => {
      void this.sync();
    }, SYNC_CONFIG.interval);
  }

  /**
   * Stop the sync service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Match sync service stopped");
    }
  }

  /**
   * Broadcast matches to all connected WebSocket clients
   */
  private broadcastMatches(updatedCount: number): void {
    try {
      this.websocketService.broadcast(WEBSOCKET_EVENTS.MATCHES_UPDATED);
      logger.info({ updatedCount }, "Broadcasted matches update to WebSocket clients");
    } catch (error) {
      logger.error({ err: error }, "Error broadcasting matches to WebSocket");
    }
  }

  /**
   * Convert FIFA API period to our internal match status
   * This is a simplified mapping and may need to be expanded based on actual API values
   */
  private convertPeriodToStatus(period: number): number {
    switch (period) {
      case 2:
        return MATCH_STATUS.NOT_STARTED;
      case 3:
        return MATCH_STATUS.FIRST_HALF;
      case 4:
        return MATCH_STATUS.HALFTIME;
      case 5:
        return MATCH_STATUS.SECOND_HALF;
      case 6:
        return MATCH_STATUS.AWAITING_EXTRA_TIME;
      case 7:
        return MATCH_STATUS.FIRST_EXTRA_TIME;
      case 8:
        return MATCH_STATUS.HALFTIME_EXTRA_TIME;
      case 9:
        return MATCH_STATUS.SECOND_EXTRA_TIME;
      case 10:
        return MATCH_STATUS.FINAL;
      case 11:
        return MATCH_STATUS.AWAITING_PENALTIES;
      case 12:
        return MATCH_STATUS.PENALTIES;
      default:
        return 0; // Unknown status
    }
  }

  /**
   * Detect which matches have changed
   */
  private detectChanges(cachedMatches: IMatch[], newMatches: IMatch[]): IMatch[] {
    const changedMatches: IMatch[] = [];

    for (const newMatch of newMatches) {
      const cachedMatch = cachedMatches.find((m) => m.id === newMatch.id);

      // If match doesn't exist in cache or has changed, mark it as changed
      if (!cachedMatch || this.hasMatchChanged(cachedMatch, newMatch)) {
        changedMatches.push(newMatch);
      }
    }

    return changedMatches;
  }

  /**
   * Check if a match has changed by comparing relevant fields
   */
  private hasMatchChanged(oldMatch: IMatch, newMatch: IMatch): boolean {
    return (
      oldMatch.status !== newMatch.status ||
      oldMatch.score.home !== newMatch.score.home ||
      oldMatch.score.away !== newMatch.score.away ||
      oldMatch.score.homePenalties !== newMatch.score.homePenalties ||
      oldMatch.score.awayPenalties !== newMatch.score.awayPenalties ||
      oldMatch.gametime !== newMatch.gametime
    );
  }

  /**
   * Main sync logic
   */
  private async sync(): Promise<void> {
    // Prevent overlapping syncs
    if (this.isSyncing) {
      logger.debug("Match sync already in progress, skipping");
      return;
    }

    const startTime = Date.now();
    this.isSyncing = true;

    try {
      logger.debug("Starting match sync");
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      // Fetch matches from cache/db
      const allMatches = await getMatchesFromCacheOrFetch(this.matchService, currentEdition, currentEdition);
      // const cachedMatches = allMatches.filter(
      //   // Only consider matches within 1 day (before or after)
      //   (m) => m.timestamp >= startTime - 60 * 60 * 24 || m.timestamp <= startTime + 60 * 60 * 24,
      // );

      // For testing, only fetch one match from external API
      const cachedMatches = allMatches.filter((m) => m.idFifa === 400021443);

      cachedMatches.forEach((m) =>
        logger.debug({ matchId: m.id, timestamp: m.timestamp }, "Match close to current time, will check for updates"),
      );

      // Fetch matches from external API in parallel for all close matches
      // const externalAPIMatchResponse = await Promise.allSettled(
      //   cachedMatches.map((m) => this.externalAPI.fetchMatch(m.idFifa)),
      // );
      // const externalAPIMatches = externalAPIMatchResponse.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      // [TESTING] Read from local file instead of external API
      const externalAPIMatches = [
        JSON.parse(readFileSync(new URL("./fifaApiResponse.json", import.meta.url), "utf-8")) as IFifaMatch,
      ];

      // Parse external match to select fields we care about and convert to our internal format
      const parsedMatches: IMatch[] = cachedMatches.map((match) => {
        const external = externalAPIMatches.find((m) => parseInt(m.IdMatch, 10) === match.idFifa);
        if (!external) return match;

        logger.debug(
          {
            convertedStatus: this.convertPeriodToStatus(external.Period),
            externalStatus: external.Period,
            matchId: match.id,
          },
          "Fetched match data from external API",
        );

        return {
          ...match,
          gametime: external.MatchTime,
          score: {
            away: external.AwayTeam.Score,
            awayPenalties: external.AwayTeamPenaltyScore,
            home: external.HomeTeam.Score,
            homePenalties: external.HomeTeamPenaltyScore,
          },
          status: this.convertPeriodToStatus(external.Period),
        };
      });

      // Detect changes
      const changedMatches = this.detectChanges(cachedMatches, parsedMatches);
      this.stats.updated = changedMatches.length;

      if (changedMatches.length > 0) {
        logger.info({ changedCount: changedMatches.length }, "Detected changed matches");

        // Update database for changed matches
        await this.updateDatabase(changedMatches);

        // Merge updated close matches back into the full match list before caching
        const updatedById = new Map(parsedMatches.map((m) => [m.id, m]));
        const updatedAllMatches = allMatches.map((m) => updatedById.get(m.id) ?? m);
        setMatchesCache(updatedAllMatches);

        // Broadcast to all connected clients
        this.broadcastMatches(changedMatches.length);
      } else {
        logger.debug("No match changes detected");

        // Still update cache to refresh TTL
        if (allMatches.length > 0) {
          setMatchesCache(allMatches);
        }
      }

      this.stats.lastSync = Date.now();
      this.stats.duration = Date.now() - startTime;
      logger.info({ duration: this.stats.duration, updated: this.stats.updated }, "Match sync completed");
    } catch (error) {
      this.stats.errors++;
      logger.error({ err: error }, "Error during match sync");

      // Don't throw - we want the service to continue running
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update database with changed matches
   */
  private async updateDatabase(matches: IMatch[]): Promise<void> {
    const updatePromises = matches.map(async (match) => {
      try {
        await this.matchService.updateMatch(match);
        logger.debug({ matchId: match.id }, "Updated match in database");
      } catch (error) {
        logger.error({ err: error, matchId: match.id }, "Failed to update match");
        // Don't throw - we want to continue updating other matches
      }
    });

    await Promise.allSettled(updatePromises);
  }
}
