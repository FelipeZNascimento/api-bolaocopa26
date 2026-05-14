import type { IMatch } from "#match/match.types.js";
import type { IReferee, IStadium } from "#team/team.types.js";

import { logger } from "#logger/logger.service.js";
import { MatchExternalAPI } from "#match/match.external-api.js";
import { MatchService } from "#match/match.service.js";
import { parseRawMatch, setMatchesCache } from "#match/match.utils.js";
import { TeamService } from "#team/team.service.js";
import { getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { WebSocketService } from "#websocket/websocket.service.js";

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
  interval: parseInt(process.env.MATCH_SYNC_INTERVAL ?? "30000"), // 30 seconds default
};

/**
 * Match Sync Service
 * Periodically fetches matches from an external API, updates cache and database,
 * and broadcasts changes via WebSocket
 */
export class MatchSyncService {
  private static instance: MatchSyncService;
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

    // Run initial sync
    void this.sync();

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
  private broadcastMatches(matches: IMatch[], updatedCount: number): void {
    try {
      const message = JSON.stringify({
        data: matches,
        timestamp: Date.now(),
        type: "matches_update",
        updatedCount,
      });

      this.websocketService.broadcast(message);
      logger.info({ matchCount: matches.length, updatedCount }, "Broadcasted matches to WebSocket clients");
    } catch (error) {
      logger.error({ err: error }, "Error broadcasting matches to WebSocket");
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
   * Get referees from cache or fetch from database
   */
  private async getRefereesFromCacheOrFetch(editionId: number): Promise<IReferee[]> {
    const cached: IReferee[] | undefined = cachedInfo.get(CACHE_KEYS.REFEREES);
    if (cached) {
      return cached;
    }
    return await this.matchService.getReferees(editionId);
  }

  /**
   * Get stadiums from cache or fetch from database
   */
  private async getStadiumsFromCacheOrFetch(editionId: number): Promise<IStadium[]> {
    const cached: IStadium[] | undefined = cachedInfo.get(CACHE_KEYS.STADIUMS);
    if (cached) {
      return cached;
    }
    return await this.matchService.getStadiums(editionId);
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
      oldMatch.timestamp !== newMatch.timestamp
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

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.debug("Starting match sync");

      // Fetch matches from external API
      const externalMatches = await this.externalAPI.fetchMatches(SYNC_CONFIG.edition);
      this.stats.totalFetched = externalMatches.length;

      // Get cached matches for comparison
      const cachedMatches: IMatch[] | undefined = cachedInfo.get(CACHE_KEYS.MATCHES);

      // Get teams, stadiums, and referees for parsing
      const [teams, stadiums, referees] = await Promise.all([
        getTeamsFromCacheOrFetch(this.teamService, SYNC_CONFIG.edition),
        this.getStadiumsFromCacheOrFetch(SYNC_CONFIG.edition),
        this.getRefereesFromCacheOrFetch(SYNC_CONFIG.edition),
      ]);

      // Parse external matches to the standard format
      const parsedMatches = externalMatches.map((match) => parseRawMatch(match, teams, stadiums, referees));

      // Detect changes
      const changedMatches = this.detectChanges(cachedMatches ?? [], parsedMatches);
      this.stats.updated = changedMatches.length;

      if (changedMatches.length > 0) {
        logger.info({ changedCount: changedMatches.length }, "Detected changed matches");

        // Update database for changed matches
        await this.updateDatabase(changedMatches);

        // Update cache with all matches
        setMatchesCache(parsedMatches);

        // Broadcast to all connected clients
        this.broadcastMatches(parsedMatches, changedMatches.length);
      } else {
        logger.debug("No match changes detected");

        // Still update cache to refresh TTL
        if (parsedMatches.length > 0) {
          setMatchesCache(parsedMatches);
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
