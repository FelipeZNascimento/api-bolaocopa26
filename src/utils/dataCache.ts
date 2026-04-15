/* eslint-disable perfectionist/sort-objects */
import NodeCache from "node-cache";

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
};

export const cachedInfo = new NodeCache();
