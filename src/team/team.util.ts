import type { IClub, IClubRaw, IConfederation, IPlayer, IPlayerRaw, ITeam } from "#team/team.types.js";

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
): Promise<ITeam[]> => {
  const cachedTeams: ITeam[] | undefined = cachedInfo.get(CACHE_KEYS.TEAMS);

  if (cachedTeams) {
    console.log("Returning teams from cache");
    return cachedTeams;
  }

  console.log("Returning teams from DB fetch");
  const teamsRaw = await teamService.getAll(requestedEdition);
  const confederations = await getConfederationsFromCacheOrFetch(teamService);
  let formattedTeams = teamsRaw.map((team) => ({
    ...team,
    colors: team.colorsRaw.split(",").map((color: string) => color.trim()),
    confederation: confederations.find((conf) => conf.id === team.idConfederation) ?? null,
  }));
  const players = await getPlayersFromCacheOrFetch(teamService, requestedEdition, formattedTeams);

  formattedTeams = formattedTeams.map((team) => ({
    ...team,
    players: players.filter((player) => player.team?.id === team.id),
  }));

  setTeamsCache(formattedTeams);
  return [...formattedTeams];
};

export const getClubsFromCacheOrFetch = async (teamService: TeamService, clubIds: number[]): Promise<IClub[]> => {
  const cachedClubs: IClub[] | undefined = cachedInfo.get(CACHE_KEYS.CLUBS);

  if (cachedClubs) {
    console.log("Returning clubs from cache");
    return cachedClubs;
  }

  const clubsRaw = await teamService.getClubs(clubIds);
  const clubs = parseClubs(clubsRaw);

  setClubsCache(clubs);
  return [...clubs];
};

export const getPlayersFromCacheOrFetch = async (
  teamService: TeamService,
  requestedEdition: number,
  teams: ITeam[],
): Promise<IPlayer[]> => {
  const cachedPlayers: IPlayer[] | undefined = cachedInfo.get(CACHE_KEYS.PLAYERS);

  if (cachedPlayers) {
    console.log("Returning players from cache");
    return cachedPlayers;
  }

  const playersRaw = await teamService.getPlayers(requestedEdition);
  const clubsIdList = playersRaw.map((player) => player.idClub);
  const clubs = await getClubsFromCacheOrFetch(teamService, clubsIdList);
  const players = parseRawPlayers(playersRaw, teams, clubs);
  setPlayersCache(players);
  return [...players];
};

export const getConfederationsFromCacheOrFetch = async (teamService: TeamService): Promise<IConfederation[]> => {
  const cachedConfederations: IConfederation[] | undefined = cachedInfo.get(CACHE_KEYS.CONFEDERATIONS);

  if (cachedConfederations) {
    console.log("Returning confederations from cache");
    return cachedConfederations;
  }

  const confederations = await teamService.getConfederations();
  setConfederationsCache(confederations);
  return [...confederations];
};

const parseClubs = (clubsRaw: IClubRaw[]): IClub[] => {
  return clubsRaw.map((club) => ({
    country: {
      abbreviation: club.countryAbbreviation,
      abbreviationEn: club.countryAbbreviationEn,
      id: club.countryId,
      isoCode: club.countryIsoCode,
      name: club.countryName,
      nameEn: club.countryNameEn,
    },
    id: club.id,
    name: club.name,
  }));
};

const parseRawPlayers = (playersRaw: IPlayerRaw[], teams: ITeam[], clubs: IClub[]): IPlayer[] => {
  return playersRaw.map((player) => {
    const team = teams.find((t) => t.id === player.idTeam);
    const club = clubs.find((c) => c.id === player.idClub);

    return {
      club: club ?? null,
      dateOfBirth: player.dateOfBirth,
      fifa: {
        id: player.idFifa,
        pictureId: player.idFifaPicture,
      },
      height: player.height,
      id: player.id,
      name: player.name,
      number: player.number,
      position: {
        abbreviation: player.positionAbbreviation,
        abbreviationEn: player.positionAbbreviationEn,
        description: player.positionDescription,
        descriptionEn: player.positionDescriptionEn,
        id: player.idPosition,
      },
      team: team ?? null,
    };
  });
};

export const setClubsCache = (clubs: IClub[]): void => {
  cachedInfo.set(CACHE_KEYS.CLUBS, clubs, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setTeamsCache = (teams: ITeam[]): void => {
  cachedInfo.set(CACHE_KEYS.TEAMS, teams, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setConfederationsCache = (confederations: IConfederation[]): void => {
  cachedInfo.set(CACHE_KEYS.CONFEDERATIONS, confederations, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setPlayersCache = (players: IPlayer[]): void => {
  cachedInfo.set(CACHE_KEYS.PLAYERS, players, 60 * 60 * 24 * 14); // Cache for 14 days
};
