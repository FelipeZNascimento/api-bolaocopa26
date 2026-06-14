import type { IEvent, IEventInfo, IEventRaw, IMatch, IMatchRaw } from "#match/match.types.js";
import type { IPlayer, ITeam } from "#team/team.types.js";

import { BetService } from "#bet/bet.service.js";
import { IBet } from "#bet/bet.types.js";
import { parseRawBets } from "#bet/bet.utils.js";
import { EditionService } from "#edition/edition.service.js";
import { IReferee, IStadium } from "#edition/edition.types.js";
import { getRefereesFromCacheOrFetch, getStadiumsFromCacheOrFetch } from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MATCH_STATUS, TMatchStatus } from "#match/match.constants.js";
import { AWARD_POINTS_2026 } from "#ranking/ranking.constants.js";
import { getRoundMultiplier } from "#ranking/ranking.utils.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
import { IUser } from "#user/user.types.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { MatchService } from "./match.service.js";

export const isMatchEnded = (status: TMatchStatus) => {
  return status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_EXTRA_TIME || status === MATCH_STATUS.CANCELLED;
};

export const parseRawEvents = (eventsRaw: IEventRaw[], eventsInfo: IEventInfo[], players: IPlayer[]): IEvent[] => {
  return eventsRaw.map((event) => {
    const player = players.find((p) => p.id === event.playerId);
    const playerTwo = event.playerTwoId ? players.find((p) => p.id === event.playerTwoId) : null;
    const eventInfo = eventsInfo.find((e) => e.id === event.eventId) ?? null;

    if (!player) {
      throw new Error(`Player with ID ${event.playerId.toString()} not found for event ${event.id.toString()}`);
    }

    return {
      event: eventInfo,
      gametime: event.gametime,
      id: event.id,
      matchId: event.matchId,
      player,
      playerAssist: playerTwo ?? null,
      teamId: player.team?.id ?? 0,
    };
  });
};

export const parseRawMatch = (match: IMatchRaw, teams: ITeam[], stadiums: IStadium[], referees: IReferee[]) => {
  const awayTeam = teams.find((team) => team.id === match.idAway);
  const homeTeam = teams.find((team) => team.id === match.idHome);

  const parsedMatch: IMatch = {
    awayTeam: awayTeam ?? null,
    bets: [],
    events: [],
    gametime: match.gametime,
    group: match.round <= 3 && homeTeam?.group ? homeTeam.group : null,
    homeTeam: homeTeam ?? null,
    id: match.id,
    idFifa: match.idFifa,
    loggedUserBets: null,
    referee: referees.find((referee) => referee.id === match.idReferee) ?? null,
    round: match.round,
    score: {
      away: match.scoreAway,
      awayPenalties: match.penaltiesAway,
      home: match.scoreHome,
      homePenalties: match.penaltiesHome,
    },
    stadium: stadiums.find((stadium) => stadium.id === match.idStadium) ?? null,
    status: match.status,
    timestamp: parseInt(match.timestamp),
    weather: {
      description: null,
      humidity: null,
      temperature: null,
      windSpeed: null,
    },
  };

  return parsedMatch;
};

export const formatMatches = (
  matches: IMatch[],
  bets: IBet[],
  userBets: IBet[],
  events: IEvent[],
  userId: null | number = null,
): IMatch[] => {
  return matches.map((match: IMatch) => {
    const matchBets = bets
      .filter((bet) => bet.matchId === match.id && bet.user.id !== userId)
      .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname))
      .map((bet) => ({
        id: bet.id,
        matchId: bet.matchId,
        scoreAway: bet.scoreAway,
        scoreHome: bet.scoreHome,
        timestamp: bet.timestamp,
        user: {
          id: bet.user.id,
          nickname: bet.user.nickname,
        },
      }));

    let loggedUserMatchBets: IBet | null = null;

    // Filter logged user bets
    if (userBets.length > 0) {
      loggedUserMatchBets = userBets
        .filter((bet) => bet.matchId === match.id && bet.user.id === userId)
        .map((bet) => ({
          id: bet.id,
          matchId: bet.matchId,
          scoreAway: bet.scoreAway,
          scoreHome: bet.scoreHome,
          timestamp: bet.timestamp,
          user: {
            id: bet.user.id,
            nickname: bet.user.nickname,
          },
        }))[0];
    }

    match.events = match.events ?? events.filter((e) => e.matchId === match.id);
    match.bets = matchBets;
    match.loggedUserBets = loggedUserMatchBets;
    match.pointsAwarded = {
      exact: AWARD_POINTS_2026.exactScore * getRoundMultiplier(match.round),
      minimal: AWARD_POINTS_2026.winnerOnly * getRoundMultiplier(match.round),
      miss: 0,
      partial: AWARD_POINTS_2026.oneScore * getRoundMultiplier(match.round),
    };

    return match;
  });
};

export const getEventsFromCacheOrFetch = async (
  matchService: MatchService,
  editionId: number,
  players: IPlayer[],
): Promise<IEvent[]> => {
  const cachedEvents: IEvent[] | undefined = cachedInfo.get(CACHE_KEYS.EVENTS);

  if (cachedEvents) {
    logger.debug("Returning events from cache");
    return cachedEvents;
  }

  const eventsRaw: IEventRaw[] = await matchService.getEvents(editionId);
  const eventsInfo = await getEventsInfoFromCacheOrFetch(matchService);

  const events: IEvent[] = parseRawEvents(eventsRaw, eventsInfo, players);
  // Events are being maintained inside the matches now, so we can avoid caching them separately.
  // If needed, we can reintroduce this cache in the future.
  // cachedInfo.set(CACHE_KEYS.EVENTS, events, 60 * 60 * 24 * 14); // Cache for 14 days
  return [...events];
};

export const getEventsInfoFromCacheOrFetch = async (matchService: MatchService): Promise<IEventInfo[]> => {
  const cachedEventInfo: IEventInfo[] | undefined = cachedInfo.get(CACHE_KEYS.EVENTS_INFO);

  if (cachedEventInfo) {
    logger.debug("Returning event info from cache");
    return cachedEventInfo;
  }

  const eventsInfo: IEventInfo[] = await matchService.getEventsInfo();
  cachedInfo.set(CACHE_KEYS.EVENTS_INFO, eventsInfo, 60 * 60 * 24 * 14); // Cache for 14 days
  return [...eventsInfo];
};

export const getMatchesFromCacheOrFetch = async (
  matchService: MatchService,
  requestedEdition: number,
  currentEdition: number,
  teams?: ITeam[],
  stadiums?: IStadium[],
  referees?: IReferee[],
): Promise<IMatch[]> => {
  const cachedMatches: IMatch[] | undefined = cachedInfo.get(CACHE_KEYS.MATCHES);

  if (cachedMatches && requestedEdition === currentEdition) {
    logger.debug("Returning matches from cache");
    return cachedMatches;
  }

  if (!teams || !stadiums || !referees) {
    logger.error(
      `Missing data for parsing matches. Teams: ${!!teams}, Stadiums: ${!!stadiums}, Referees: ${!!referees}`,
    );
    return []; // Return empty array if any of the required data is missing to prevent errors, and log the issue
  }

  const matchesRaw: IMatchRaw[] = await matchService.getByEdition(requestedEdition);
  const parsedMatches: IMatch[] = matchesRaw.map((match) => parseRawMatch(match, teams, stadiums, referees));

  if (requestedEdition === currentEdition) {
    setMatchesCache(parsedMatches);
  }
  return [...parsedMatches];
};

export const getFormattedMatches = async (
  matchService: MatchService,
  teamService: TeamService,
  editionService: EditionService,
  betService: BetService,
  edition: number,
  user: IUser | null,
): Promise<IMatch[]> => {
  const teams: ITeam[] = await getTeamsFromCacheOrFetch(teamService, edition);
  const stadiums: IStadium[] = await getStadiumsFromCacheOrFetch(editionService, edition, edition);
  const referees: IReferee[] = await getRefereesFromCacheOrFetch(editionService, edition, edition);
  const players: IPlayer[] = await getPlayersFromCacheOrFetch(teamService, edition, teams);
  const events: IEvent[] = await getEventsFromCacheOrFetch(matchService, edition, players);
  const matches: IMatch[] = await getMatchesFromCacheOrFetch(matchService, edition, edition, teams, stadiums, referees);

  const matchesIds = matches.map((match) => match.id);
  const queries = [betService.getStartedMatchesBetsByMatchIds(matchesIds)];

  if (user) {
    queries.push(betService.getUserBetsByMatchIds(matchesIds, user.id));
  }
  const [startedMatchesBetsResponse, userBetsResponse] = await Promise.allSettled(queries);
  if (isRejected(startedMatchesBetsResponse) || (user && isRejected(userBetsResponse))) {
    throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
  }

  let startedMatchesBets: IBet[] = [];
  if (isFulfilled(startedMatchesBetsResponse)) {
    startedMatchesBets = parseRawBets(startedMatchesBetsResponse.value);
  }

  let userBets: IBet[] = [];
  if (user && isFulfilled(userBetsResponse)) {
    userBets = parseRawBets(userBetsResponse.value);
  }

  try {
    return formatMatches(matches, startedMatchesBets, userBets, events, user?.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    throw new AppError(`Erro ao formatar as partidas: ${errorMessage}`, 500, ErrorCode.INTERNAL_SERVER_ERROR);
  }
};

export const setMatchesCache = (matches: IMatch[]): void => {
  cachedInfo.set(CACHE_KEYS.MATCHES, matches, 60 * 60 * 24 * 14); // Cache for 14 days
};
