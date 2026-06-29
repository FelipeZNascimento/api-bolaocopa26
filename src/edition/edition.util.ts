import { logger } from "#logger/logger.service.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { EditionService } from "./edition.service";
import { IReferee, IStadium, TEditionInfo } from "./edition.types";

/**
 * getEditionInfoFromCacheOrFetch - Returns edition info from cache or fetches from database if not present in cache.
 *
 * @editionService: Instantiated EditionService to fetch edition data.
 *
 * @return: Edition info.
 */
export const getEditionInfoFromCacheOrFetch = async (editionService: EditionService): Promise<TEditionInfo> => {
  const cachedEditionInfo: TEditionInfo | undefined = cachedInfo.get(CACHE_KEYS.EDITION_INFO);

  if (cachedEditionInfo) {
    logger.debug("Returning edition info from cache");
    return cachedEditionInfo;
  }

  const edition = process.env.EDITION;
  const editionId = edition ? parseInt(edition) : null;

  const [currentRound, editionStart] = editionId
    ? await Promise.all([editionService.getCurrentRound(editionId), editionService.getEditionStart(editionId)])
    : [null, null];

  return {
    currentEdition: editionId,
    currentRound,
    editionStart,
  };
};

export const getStadiumsFromCacheOrFetch = async (
  editionService: EditionService,
  requestedEdition: number,
  currentEdition: number,
): Promise<IStadium[]> => {
  const cachedStadiums: IStadium[] | undefined = cachedInfo.get(CACHE_KEYS.STADIUMS);

  if (cachedStadiums && requestedEdition === currentEdition) {
    logger.debug("Returning stadiums from cache");
    return cachedStadiums;
  }

  logger.debug("Fetching stadiums from database");
  const stadiums = await editionService.getStadiums(requestedEdition);

  if (requestedEdition === currentEdition) {
    setStadiumsCache(stadiums);
  }
  return [...stadiums];
};

export const setStadiumsCache = (stadiums: IStadium[]): void => {
  cachedInfo.set(CACHE_KEYS.STADIUMS, stadiums, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const setRefereesCache = (referees: IReferee[]): void => {
  cachedInfo.set(CACHE_KEYS.REFEREES, referees, 60 * 60 * 24 * 14); // Cache for 14 days
};

export const getRefereesFromCacheOrFetch = async (
  editionService: EditionService,
  requestedEdition: number,
  currentEdition: number,
): Promise<IReferee[]> => {
  const cachedReferees: IReferee[] | undefined = cachedInfo.get(CACHE_KEYS.REFEREES);

  if (cachedReferees && requestedEdition === currentEdition) {
    logger.debug("Returning referees from cache");
    return cachedReferees;
  }

  logger.debug("Fetching referees from database");
  const referees = await editionService.getReferees(requestedEdition);

  if (requestedEdition === currentEdition) {
    setRefereesCache(referees);
  }
  return [...referees];
};
