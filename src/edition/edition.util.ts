import { logger } from "#logger/logger.service.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { EditionService } from "./edition.service";
import { TEditionInfo } from "./edition.types";

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
