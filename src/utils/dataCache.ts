/* eslint-disable perfectionist/sort-objects */
import NodeCache from "node-cache";
import { EditionService } from "#edition/edition.service.js";
import {
  getEditionInfoFromCacheOrFetch,
  getRefereesFromCacheOrFetch,
  getStadiumsFromCacheOrFetch,
} from "#edition/edition.util.js";
import { logger } from "#logger/logger.service.js";
import { MatchService } from "#match/match.service.js";
import {
  getEventsFromCacheOrFetch,
  getEventsInfoFromCacheOrFetch,
  getMatchesFromCacheOrFetch,
} from "#match/match.utils.js";
import { TeamService } from "#team/team.service.js";
import { getPlayersFromCacheOrFetch, getTeamsFromCacheOrFetch } from "#team/team.util.js";
export const CACHE_KEYS = {
  TEAMS: 0,
  CURRENT_WEEK: 1,
  WEEKLY_RANKING: 2,
  CONFEDERATIONS: 3,
  STADIUMS: 4,
  REFEREES: 5,
  MATCHES: 6,
  PLAYERS: 7,
  CLUBS: 8,
  EVENTS: 9,
  EDITION_INFO: 10,
  EVENTS_INFO: 11,
};

export const cachedInfo = new NodeCache();

export const warmUpCache = async (): Promise<void> => {
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
  const events = await getEventsFromCacheOrFetch(matchService, currentEdition, players);

  await Promise.all([
    getMatchesFromCacheOrFetch(matchService, currentEdition, currentEdition, teams, stadiums, referees, events),
    getEventsInfoFromCacheOrFetch(matchService),
  ]);

  logger.info("Cache warm-up complete");
};
