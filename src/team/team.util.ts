import type { IConfederation, ITeam } from "#team/team.types.js";

import { TeamService } from "#team/team.service.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
/**
 * getFromCacheOrFetch - Returns all teams from cache or fetches from database if not present in cache.
 *
 * @teamService: Instantiated TeamService to fetch team data.
 *
 * @return: All teams.
 */
export const getTeamsFromCacheOrFetch = async (
  teamService: TeamService,
  requestedEdition: number,
  currentEdition: number,
): Promise<ITeam[]> => {
  const cachedTeams: ITeam[] | undefined = cachedInfo.get(CACHE_KEYS.TEAMS);

  if (cachedTeams && requestedEdition === currentEdition) {
    console.log("Returning teams from cache");
    return cachedTeams;
  }

  console.log("Returning teams from DB fetch");
  const teamsRaw = await teamService.getAll(requestedEdition);
  const confederations = await getConfederationsFromCacheOrFetch(teamService);

  // const formattedTeams = formatTeams(teamsRaw, confederations);
  const formattedTeams = teamsRaw.map((team) => ({
    ...team,
    confederation: confederations.find((conf) => conf.id === team.idConfederation) ?? null,
  }));

  if (requestedEdition === currentEdition) {
    setTeamsCache(formattedTeams);
  }

  return [...formattedTeams];
};

export const getConfederationsFromCacheOrFetch = async (teamService: TeamService): Promise<IConfederation[]> => {
  const cachedConfederations: IConfederation[] | undefined = cachedInfo.get(CACHE_KEYS.CONFEDERATIONS);

  if (cachedConfederations) {
    console.log("Returning conferences from cache");
    return cachedConfederations;
  }

  const confederations = await teamService.getConfederations();
  setConfederationsCache(confederations);
  return [...confederations];
};

export const setTeamsCache = (teams: ITeam[]): void => {
  cachedInfo.set(CACHE_KEYS.TEAMS, teams, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setConfederationsCache = (confederations: IConfederation[]): void => {
  cachedInfo.set(CACHE_KEYS.CONFEDERATIONS, confederations, 60 * 60 * 24 * 14); // Cache for 14 days
};
