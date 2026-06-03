import type { IEvent, IEventInfo, IFifaMatch, IMatch } from "#match/match.types.js";

// import { readFileSync } from "fs";

import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MatchExternalAPI } from "#match/match.external-api.js";
import { MatchService } from "#match/match.service.js";
import { getEventsInfoFromCacheOrFetch, getMatchesFromCacheOrFetch, setMatchesCache } from "#match/match.utils.js";
import { TeamService } from "#team/team.service.js";
import { IPlayer } from "#team/team.types.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WEBSOCKET_EVENTS } from "#websocket/websocket.constants.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { MATCH_STATUS } from "./match.constants.js";

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
  private matchesToBeFetched: IMatch[];
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
    this.matchesToBeFetched = [];
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
   * Main sync logic
   */
  async sync(): Promise<void> {
    // Prevent overlapping syncs
    if (this.isSyncing) {
      logger.debug("Match sync already in progress, skipping");
      return;
    }

    const nowTimeOnStart = Math.floor(Date.now() / 1000);
    this.isSyncing = true;

    try {
      logger.debug("Starting match sync");
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      const eventsInfo = await getEventsInfoFromCacheOrFetch(this.matchService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      // Fetch matches from cache/db
      const matches = await getMatchesFromCacheOrFetch(this.matchService, currentEdition, currentEdition);
      const teams = await getTeamsFromCacheOrFetch(this.teamService, currentEdition);
      const players = await getPlayersFromCacheOrFetch(this.teamService, currentEdition, teams);
      const closeMatches = matches.filter(
        // Only consider matches within 2 hours before AND 4h after
        (m) => m.timestamp >= nowTimeOnStart - 60 * 60 * 2 && m.timestamp <= nowTimeOnStart + 60 * 60 * 4,
      );

      // Include close matches to the fetch list
      closeMatches.forEach((m) => this.matchesToBeFetched.includes(m) || this.matchesToBeFetched.push(m));
      let matchesToBeSaved: IMatch[] = [];

      // Remove matches that are more than 4 hours old from the fetch list, add to the save list
      this.matchesToBeFetched.forEach((m) => {
        if (m.timestamp < nowTimeOnStart - 60 * 60 * 4) {
          logger.info(
            { matchId: m.id, matchTimestamp: m.timestamp, now: nowTimeOnStart },
            "Found match that started 4h+ ago, will save on DB and remove from fetch list",
          );

          matchesToBeSaved.push(m);
          this.matchesToBeFetched.splice(
            this.matchesToBeFetched.findIndex((match) => match.id === m.id),
            1,
          );
        }
      });

      // If there are matches to be saved, update them in the database before fetching new data
      if (matchesToBeSaved.length > 0) {
        logger.info({ matchesToBeSavedCount: matchesToBeSaved.length }, "Saving old matches to database");
        await this.updateDatabase(matchesToBeSaved);
        matchesToBeSaved = [];
      }

      // For testing, only fetch one match from JSON file

      // Fetch matches from external API in parallel for all close matches
      const externalAPIMatchResponse = await Promise.allSettled(
        this.matchesToBeFetched.map((m) => this.externalAPI.fetchMatch(m.idFifa)),
      );
      const externalAPIMatches = externalAPIMatchResponse.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      // [TESTING] Read from local file instead of external API
      // this.matchesToBeFetched = matches.filter((m) => m.idFifa === 400021443);
      // const externalAPIMatches = [
      //   JSON.parse(readFileSync(new URL("./fifaApiResponse.json", import.meta.url), "utf-8")) as IFifaMatch,
      // ];

      // Parse external match to select wanted fields and convert to internal format
      const parsedMatches: IMatch[] = this.matchesToBeFetched.map((match) => {
        const external = externalAPIMatches.find((m) => parseInt(m.IdMatch, 10) === match.idFifa);
        if (!external) return match;

        const parsedEvents = this.parseEvents(external, match, players, eventsInfo);

        return {
          ...match,
          events: parsedEvents,
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
      const changedMatches = this.detectChanges(this.matchesToBeFetched, parsedMatches);
      this.stats.updated = changedMatches.length;

      if (changedMatches.length > 0) {
        // Merge updated close matches back into the full match list before caching
        const updatedById = new Map(parsedMatches.map((m) => [m.id, m]));
        parsedMatches.forEach((m) =>
          logger.debug({ eventsLength: m.events.length, matchId: m.id }, "Parsed match details"),
        );
        const updatedAllMatches: IMatch[] = matches.map((m) => updatedById.get(m.id) ?? m);
        setMatchesCache(updatedAllMatches);

        // Broadcast to all connected clients
        this.broadcastMatches(changedMatches.length);
      } else {
        // Still update cache to refresh TTL
        if (matches.length > 0) {
          setMatchesCache(matches);
        }
      }

      this.stats.lastSync = Math.floor(Date.now() / 1000);
      this.stats.duration = Math.floor(Date.now() / 1000) - nowTimeOnStart;
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
   * Iterate over home and away events to create a unified list of events for easier processing and caching
   */
  private parseEvents(
    externalMatch: IFifaMatch,
    match: IMatch,
    players: IPlayer[],
    eventsInfo: IEventInfo[],
  ): IEvent[] {
    const undefinedPlayer = players.find((p) => p.fifa.id === 864); // FIFA ID 864 is used for "undefined player"
    const homeGoals: IEvent[] = externalMatch.HomeTeam.Goals.map((goal) => {
      let event = eventsInfo.find((e) => e.fifaId === goal.Type) ?? null;
      if (goal.Period === 11) {
        event = eventsInfo.find((e) => e.id === 8) ?? null; // Penalty shootout if period === 11
      }

      return {
        event: event,
        gametime: goal.Minute,
        matchId: match.id,
        player: players.find((p) => p.fifa.id === parseInt(goal.IdPlayer, 10)) ?? undefinedPlayer!,
        playerAssist: players.find((p) => p.fifa.id === parseInt(goal.IdPlayer, 10)) ?? null,
        teamId: match.homeTeam!.id,
      };
    });

    const awayGoals: IEvent[] = externalMatch.AwayTeam.Goals.map((goal) => {
      let event = eventsInfo.find((e) => e.fifaId === goal.Type) ?? null;
      if (goal.Period === 11) {
        event = eventsInfo.find((e) => e.id === 8) ?? null; // Penalty shootout if period === 11
      }

      return {
        event: event,
        gametime: goal.Minute,
        matchId: match.id,
        player: players.find((p) => p.fifa.id === parseInt(goal.IdPlayer, 10)) ?? undefinedPlayer!,
        playerAssist: players.find((p) => p.fifa.id === parseInt(goal.IdPlayer, 10)) ?? null,
        teamId: match.awayTeam!.id,
      };
    });

    const homeCards: IEvent[] = externalMatch.HomeTeam.Bookings.map((booking) => {
      let event = booking.Card === 1 ? eventsInfo.find((e) => e.id === 4) : eventsInfo.find((e) => e.id === 5);

      return {
        coach: booking.IdCoach ? true : false,
        event: event ?? null,
        gametime: booking.Minute,
        matchId: match.id,
        player: players.find((p) => p.fifa.id === parseInt(booking.IdPlayer as string, 10)) ?? undefinedPlayer!,
        playerAssist: null,
        staff: booking.IdStaff ? true : false,
        teamId: match.homeTeam!.id,
      };
    });

    const awayCards: IEvent[] = externalMatch.AwayTeam.Bookings.map((booking) => {
      let event = booking.Card === 1 ? eventsInfo.find((e) => e.id === 4) : eventsInfo.find((e) => e.id === 5);

      return {
        coach: booking.IdCoach ? true : false,
        event: event ?? null,
        gametime: booking.Minute,
        matchId: match.id,
        player: players.find((p) => p.fifa.id === parseInt(booking.IdPlayer as string, 10)) ?? undefinedPlayer!,
        playerAssist: null,
        staff: booking.IdStaff ? true : false,
        teamId: match.awayTeam!.id,
      };
    });

    return [...homeGoals, ...awayGoals, ...homeCards, ...awayCards];
  }

  /**
   * Update database with changed matches
   */
  private async updateDatabase(matches: IMatch[]): Promise<void> {
    const updatePromises = matches.map(async (match) => {
      try {
        await this.matchService.updateMatch(match);
        await this.matchService.updateEvents(match.events);
        logger.debug({ matchId: match.id }, "Updated match in database");
      } catch (error) {
        logger.error({ err: error, matchId: match.id }, "Failed to update match");
        // Don't throw - we want to continue updating other matches
      }
    });

    await Promise.allSettled(updatePromises);
  }
}
