import type { IEvent, IEventRaw, IMatch, IMatchRaw } from "#match/match.types.js";
import type { IPlayer, IReferee, IStadium, ITeam } from "#team/team.types.js";

import { IBet } from "#bet/bet.types.js";
import { MATCH_STATUS, MatchStatus } from "#match/match.constants.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";

import { MatchService } from "./match.service";

export const isMatchEnded = (status: MatchStatus) => {
  return status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME || status === MATCH_STATUS.CANCELLED;
};

export const parseRawEvents = (eventsRaw: IEventRaw[], players: IPlayer[]): IEvent[] => {
  return eventsRaw.map((event) => {
    const player = players.find((p) => p.id === event.playerId);
    const playerTwo = event.playerTwoId ? players.find((p) => p.id === event.playerTwoId) : null;

    if (!player) {
      throw new Error(`Player with ID ${event.playerId.toString()} not found for event ${event.id.toString()}`);
    }

    return {
      event: {
        description: event.eventDescription,
        descriptionEn: event.eventDescriptionEn,
        gametime: event.gametime,
        id: event.eventId,
      },
      id: event.id,
      matchId: event.matchId,
      player,
      playerAssist: playerTwo ?? null,
    };
  });
};

export const parseRawMatch = (match: IMatchRaw, teams: ITeam[], stadiums: IStadium[], referees: IReferee[]) => {
  const parsedMatch: IMatch = {
    awayTeam: teams.find((team) => team.id === match.idAway) ?? null,
    bets: [],
    events: [],
    homeTeam: teams.find((team) => team.id === match.idHome) ?? null,
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
    timestamp: match.timestamp,
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
    const matchEvents = events.filter((event) => event.matchId === match.id);
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

    match.bets = matchBets;
    match.loggedUserBets = loggedUserMatchBets;
    match.events = matchEvents;

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
    console.log("Returning events from cache");
    return cachedEvents;
  }

  const eventsRaw: IEventRaw[] = await matchService.getEvents(editionId);
  const events: IEvent[] = parseRawEvents(eventsRaw, players);
  cachedInfo.set(CACHE_KEYS.EVENTS, events, 60 * 60 * 24 * 14); // Cache for 14 days
  return [...events];
};

export const getStadiumsFromCacheOrFetch = async (
  matchService: MatchService,
  requestedEdition: number,
  currentEdition: number,
): Promise<IStadium[]> => {
  const cachedStadiums: IStadium[] | undefined = cachedInfo.get(CACHE_KEYS.STADIUMS);

  if (cachedStadiums && requestedEdition === currentEdition) {
    console.log("Returning stadiums from cache");
    return cachedStadiums;
  }

  const stadiums = await matchService.getStadiums(requestedEdition);

  if (requestedEdition === currentEdition) {
    setStadiumsCache(stadiums);
  }
  return [...stadiums];
};

export const getMatchesFromCacheOrFetch = async (
  matchService: MatchService,
  requestedEdition: number,
  currentEdition: number,
  teams: ITeam[],
  stadiums: IStadium[],
  referees: IReferee[],
): Promise<IMatch[]> => {
  const cachedMatches: IMatch[] | undefined = cachedInfo.get(CACHE_KEYS.MATCHES);

  if (cachedMatches && requestedEdition === currentEdition) {
    console.log("Returning matches from cache");
    return cachedMatches;
  }

  const matchesRaw: IMatchRaw[] = await matchService.getByEdition(requestedEdition);
  const filteredMatches: IMatch[] = matchesRaw.map((match) => parseRawMatch(match, teams, stadiums, referees));

  if (requestedEdition === currentEdition) {
    setMatchesCache(filteredMatches);
  }
  return [...filteredMatches];
};

export const getRefereesFromCacheOrFetch = async (
  matchService: MatchService,
  requestedEdition: number,
  currentEdition: number,
): Promise<IReferee[]> => {
  const cachedReferees: IReferee[] | undefined = cachedInfo.get(CACHE_KEYS.REFEREES);

  if (cachedReferees && requestedEdition === currentEdition) {
    console.log("Returning referees from cache");
    return cachedReferees;
  }

  const referees = await matchService.getReferees(requestedEdition);

  if (requestedEdition === currentEdition) {
    setRefereesCache(referees);
  }
  return [...referees];
};

export const setStadiumsCache = (stadiums: IStadium[]): void => {
  cachedInfo.set(CACHE_KEYS.STADIUMS, stadiums, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setRefereesCache = (referees: IReferee[]): void => {
  cachedInfo.set(CACHE_KEYS.REFEREES, referees, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setMatchesCache = (matches: IMatch[]): void => {
  cachedInfo.set(CACHE_KEYS.MATCHES, matches, 60 * 60 * 24 * 14); // Cache for 14 days
};
