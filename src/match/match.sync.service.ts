import type { IEvent, IEventInfo, IFifaMatch, IMatch } from "#match/match.types.js";

// import { readFileSync } from "fs";

import { BetService } from "#bet/bet.service.js";
import { EditionService } from "#edition/edition.service.js";
import { getEditionInfoFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MatchExternalAPI } from "#match/match.external-api.js";
import { MatchService } from "#match/match.service.js";
import { getEventsInfoFromCacheOrFetch, getFormattedMatches, setMatchesCache } from "#match/match.utils.js";
import { TeamService } from "#team/team.service.js";
import { IPlayer } from "#team/team.types.js";
import { getPlayersFromCacheOrFetch } from "#team/team.util.js";
import { IUser } from "#user/user.types.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WEBSOCKET_EVENTS } from "#websocket/websocket.constants.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { FINISHED_GAME, FOOTBALL_MATCH_STATUS, MATCH_STATUS, STOPPED_GAME } from "./match.constants.js";

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
  private activeProfile: IUser | null = null;
  private betService: BetService;
  private editionService: EditionService;
  private externalAPI: MatchExternalAPI;
  private intervalId: NodeJS.Timeout | null = null;
  private isStarted = false;
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
  private readonly SYNC_TIMEOUT_MS = 120_000; // 2 minutes
  private teamService: TeamService;
  private readonly TIME_SPAN = 40;
  private websocketService: WebSocketService;

  private constructor() {
    this.externalAPI = new MatchExternalAPI();
    this.matchService = new MatchService();
    this.teamService = new TeamService();
    this.betService = new BetService();
    this.editionService = new EditionService();
    this.websocketService = WebSocketService.getInstance();
    this.matchesToBeFetched = [];
    this.activeProfile = null;
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
   * Set active profile
   */
  public setActiveProfile(user: IUser | null) {
    this.activeProfile = user;
  }

  /**
   * Start the sync service
   */
  public start(): void {
    if (!SYNC_CONFIG.enabled) {
      logger.info("MatchSync: Disabled via configuration");
      return;
    }

    if (!SYNC_CONFIG.edition) {
      logger.error("MatchSync: No edition configured, cannot start match sync service");
      return;
    }

    if (this.intervalId) {
      logger.warn("MatchSync: Service is already running");
      return;
    }

    logger.info({ edition: SYNC_CONFIG.edition, interval: SYNC_CONFIG.interval }, "MatchSync: Starting");

    this.isStarted = true;
    this.scheduleNextSync();
  }

  /**
   * Stop the sync service
   */
  public stop(): void {
    this.isStarted = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    logger.info("MatchSync: Service stopped");
  }

  /**
   * Main sync logic
   */
  async sync(): Promise<void> {
    // Prevent overlapping syncs
    if (this.isSyncing) {
      logger.debug("MatchSync: Already in progress, skipping");
      return;
    }

    const nowTimeOnStart = Math.floor(Date.now() / 1000);
    this.isSyncing = true;

    try {
      logger.debug("MatchSync: Starting");
      const { currentEdition } = await getEditionInfoFromCacheOrFetch(this.editionService);
      const eventsInfo = await getEventsInfoFromCacheOrFetch(this.matchService);
      if (!currentEdition) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      // Fetch matches from cache/db
      const matches = await getFormattedMatches(
        this.matchService,
        this.teamService,
        this.editionService,
        this.betService,
        currentEdition,
        this.activeProfile,
      );

      const closeMatches = matches.filter(
        (m) =>
          m.timestamp - 60 * 60 * this.TIME_SPAN < nowTimeOnStart &&
          nowTimeOnStart < m.timestamp + 60 * 60 * this.TIME_SPAN,
        // Only consider matches within 24h before AND 12h
      );
      // Include close matches to the fetch list
      closeMatches.forEach((m) => {
        if (!this.matchesToBeFetched.some((existing) => existing.id === m.id)) {
          this.matchesToBeFetched.push(m);
        }
      });
      logger.info({ matchesToBeFetchedLength: this.matchesToBeFetched.length }, "MatchSync: Matches to be fetched");

      let matchesToBeSaved: IMatch[] = [];

      // Fetch matches from external API in parallel for all close matches
      logger.debug(
        { matchIds: this.matchesToBeFetched.map((m) => m.idFifa) },
        "MatchSync: Fetching matches from external API",
      );
      const externalAPIMatchResponse = await Promise.allSettled(
        this.matchesToBeFetched.map((m) => this.externalAPI.fetchMatch(m.idFifa)),
      );
      const externalAPIMatches = externalAPIMatchResponse.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      // [TESTING] Read from local file instead of external API
      // For testing, only fetch one match from JSON file
      // this.matchesToBeFetched = matches.filter((m) => m.idFifa === 400021443);
      // const externalAPIMatches = [
      //   JSON.parse(readFileSync(new URL("./fifaApiResponse.json", import.meta.url), "utf-8")) as IFifaMatch,
      // ];

      const players = await getPlayersFromCacheOrFetch(this.teamService, currentEdition);
      // Parse external match to select wanted fields and convert to internal format
      const parsedMatches: IMatch[] = this.matchesToBeFetched.map((match) => {
        const external = externalAPIMatches.find((m) => m && parseInt(m.IdMatch, 10) === match.idFifa);
        if (!external) return match;

        const parsedEvents = this.parseEvents(external, match, players, eventsInfo);
        const parsedSquads = this.parseSquads(external, players);
        const weather = {
          description: external.Weather.TypeLocalized.find((type) => type.Locale === "pt-BR")?.Description || null,
          humidity: external.Weather.Humidity,
          temperature: external.Weather.Temperature,
          windSpeed: external.Weather.WindSpeed,
        };

        const awayTeam = match.awayTeam ? { ...match.awayTeam, squad: parsedSquads.away } : null;
        const homeTeam = match.homeTeam ? { ...match.homeTeam, squad: parsedSquads.home } : null;

        const parsedMatch = {
          ...match,
          awayTeam: awayTeam,
          events: parsedEvents,
          gametime: external.MatchTime,
          homeTeam: homeTeam,
          loggedUserBets: null,
          score: {
            away: external.AwayTeam.Score === null ? 0 : external.AwayTeam.Score,
            awayPenalties: external.AwayTeamPenaltyScore === null ? 0 : external.AwayTeamPenaltyScore,
            home: external.HomeTeam.Score === null ? 0 : external.HomeTeam.Score,
            homePenalties: external.HomeTeamPenaltyScore === null ? 0 : external.HomeTeamPenaltyScore,
          },
          status: this.convertPeriodToStatus(external.Period),
          weather: weather,
        };

        // Remove matches that started more than 12h ago and are finished from the fetch list, add to the save list
        if (
          parsedMatch.timestamp < nowTimeOnStart - 60 * 60 * this.TIME_SPAN &&
          FINISHED_GAME.includes(parsedMatch.status)
        ) {
          logger.info(
            {
              matchFifaId: parsedMatch.idFifa,
              matchId: parsedMatch.id,
              matchTimestamp: parsedMatch.timestamp,
              now: nowTimeOnStart,
            },
            "MatchSync: Found match that started 4h+ ago, will save on DB and remove from fetch list",
          );

          matchesToBeSaved.push({ ...parsedMatch });
        }

        return parsedMatch;
      });

      // Matches that are going to be saved don't need to be fetched on the next iteration
      matchesToBeSaved.forEach((match) => {
        this.matchesToBeFetched.splice(
          this.matchesToBeFetched.findIndex((m) => match.id === m.id),
          1,
        );
      });

      // If there are matches to be saved, update them in the database before fetching new data
      if (matchesToBeSaved.length > 0) {
        logger.info({ matchesToBeSavedCount: matchesToBeSaved.length }, "MatchSync: Saving old matches to database");
        await this.updateDatabase(matchesToBeSaved);
        matchesToBeSaved = [];
      }

      // Detect changes
      const updatedMatches = this.detectChanges(this.matchesToBeFetched, parsedMatches);
      updatedMatches.forEach((m) => {
        // If a match has changed, update it on the iterator array so it compares with the
        // updated match next time around
        const index = this.matchesToBeFetched.findIndex((tbf) => tbf.id === m.id);
        if (index !== -1) {
          this.matchesToBeFetched[index] = m;
        }
      });

      this.stats.updated = updatedMatches.length;

      if (updatedMatches.length > 0) {
        // Merge updated close matches back into the full match list before caching
        const updatedById = new Map(updatedMatches.map((m) => [m.id, m]));
        const allMatches: IMatch[] = matches.map((m) => updatedById.get(m.id) ?? m);
        setMatchesCache(allMatches);

        // Broadcast to all connected clients
        this.broadcastMatches(allMatches, updatedMatches);
      } else {
        // Still update cache to refresh TTL
        if (matches.length > 0) {
          setMatchesCache(matches);
        }
      }

      this.stats.lastSync = Math.floor(Date.now() / 1000);
      this.stats.duration = Math.floor(Date.now() / 1000) - nowTimeOnStart;
      logger.info({ duration: `${this.stats.duration}ms`, updated: this.stats.updated }, "MatchSync: Completed");
    } catch (error) {
      this.stats.errors++;
      logger.error({ err: error }, "MatchSync: Error");

      // Don't throw - we want the service to continue running
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Broadcast matches to all connected WebSocket clients
   */
  private broadcastMatches(allMatches: IMatch[], updatedMatches: IMatch[]): void {
    const nextMatches = allMatches
      .filter((match) => match.status === FOOTBALL_MATCH_STATUS.NOT_STARTED)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3);
    const liveMatches = allMatches
      .filter((match) => !STOPPED_GAME.includes(match.status))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3);

    try {
      this.websocketService.broadcast(WEBSOCKET_EVENTS.MATCHES_UPDATED, {
        allMatches,
        liveMatches,
        nextMatches,
        updatedMatches,
      });
      logger.info(
        { allMatches: allMatches.length, updatedMatches: updatedMatches.length },
        "MatchSync: Broadcasted matches update to WebSocket clients",
      );
    } catch (error) {
      logger.error({ err: error }, "MatchSync: Error broadcasting matches to WebSocket");
    }
  }

  /**
   * Convert FIFA API period to our internal match status
   * This is a simplified mapping and may need to be expanded based on actual API values
   */
  private convertPeriodToStatus(period: number): number {
    switch (period) {
      case 0:
        return MATCH_STATUS.NOT_STARTED;
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

    newMatches.forEach((newMatch) => {
      const cachedMatch = cachedMatches.find((m) => m.id === newMatch.id);

      // If match doesn't exist in cache or has changed, mark it as changed
      if (!cachedMatch || this.hasMatchChanged(cachedMatch, newMatch)) {
        changedMatches.push(newMatch);
      }
    });

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
      oldMatch.gametime !== newMatch.gametime ||
      oldMatch.weather?.temperature !== newMatch.weather?.temperature ||
      oldMatch.weather?.humidity !== newMatch.weather?.humidity ||
      oldMatch.weather?.windSpeed !== newMatch.weather?.windSpeed ||
      oldMatch.weather?.description !== newMatch.weather?.description ||
      oldMatch.events.length !== newMatch.events.length
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
        playerAssist: players.find((p) => p.fifa.id === parseInt(goal.IdAssistPlayer, 10)) ?? null,
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
        playerAssist: players.find((p) => p.fifa.id === parseInt(goal.IdAssistPlayer, 10)) ?? null,
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
   * Iterate over home and away teams to define starting squad
   */
  private parseSquads(externalMatch: IFifaMatch, players: IPlayer[]): { away: IPlayer[]; home: IPlayer[] } {
    const homePlayersExternal = externalMatch.HomeTeam.Players;
    const awayPlayersExternal = externalMatch.AwayTeam.Players;

    const home = homePlayersExternal.flatMap((ep) => {
      const player = players.find((p) => p.fifa.id === parseInt(ep.IdPlayer, 10));
      if (!player) {
        return [];
      }

      return [
        {
          ...player,
          isCaptain: ep.Captain,
          isStarting: ep.Status === 1,
        },
      ];
    });

    const away = awayPlayersExternal.flatMap((ep) => {
      const player = players.find((p) => p.fifa.id === parseInt(ep.IdPlayer, 10));
      if (!player) {
        return [];
      }

      return [
        {
          ...player,
          isCaptain: ep.Captain,
          isStarting: ep.Status === 1,
        },
      ];
    });

    return { away, home };
  }

  /**
   * Schedule the next sync iteration using recursive timeout.
   */
  private scheduleNextSync(): void {
    if (!this.isStarted || this.intervalId) {
      logger.warn("MatchSync: Service is already running, sync aborted");
      return;
    }

    this.intervalId = setTimeout(() => {
      this.intervalId = null;
      this.syncWithTimeout()
        .catch((error) => {
          logger.error({ err: error }, "MatchSync: Unhandled error in match sync timeout");
        })
        .finally(() => {
          if (this.isStarted) {
            this.scheduleNextSync();
          }
        });
    }, SYNC_CONFIG.interval);
  }

  private async syncWithTimeout() {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.isSyncing = false;
        reject(new Error("MatchSync: Timeout - exceeded 2 minutes"));
      }, this.SYNC_TIMEOUT_MS);
    });

    try {
      return await Promise.race([this.sync(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Update database with changed matches
   */
  private async updateDatabase(matches: IMatch[]): Promise<void> {
    const updatePromises = matches.map(async (match) => {
      try {
        logger.debug({ matchId: match.id }, "MatchSync: Match ID being saved");
        await this.matchService.updateMatch(match);
        await this.matchService.updateEvents(match.events);
        logger.debug({ matchId: match.id }, "MatchSync: Updated match in database");
      } catch (error) {
        logger.error({ err: error, matchId: match.id }, "MatchSync: Failed to update match");
        // Don't throw - we want to continue updating other matches
      }
    });

    await Promise.allSettled(updatePromises);
  }
}
