import type { IMatch, IMatchRaw } from "#match/match.types.js";
import type { IReferee, IStadium, ITeam } from "#team/team.types.js";

import { IBet } from "#bet/bet.types.js";
import { MATCH_STATUS, MatchStatus } from "#match/match.constants.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";

import { MatchService } from "./match.service";

export const isMatchEnded = (status: MatchStatus) => {
  return status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME || status === MATCH_STATUS.CANCELLED;
};

export const parseMatchQueryResponse = (
  match: IMatchRaw,
  teams: ITeam[],
  stadiums: IStadium[],
  referees: IReferee[],
) => {
  const parsedMatch: IMatch = {
    awayTeam: teams.find((team) => team.id === match.idAway) ?? null,
    bets: [],
    homeTeam: teams.find((team) => team.id === match.idHome) ?? null,
    id: match.id,
    idFifa: match.idFifa,
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

// export const parseMatchQueryResponse = (match: IMatchRaw, homeTeam: ITeam, awayTeam: ITeam) => {
//   return {
//     away: {
//       alias: awayTeam.alias,
//       background: awayTeam.background,
//       code: awayTeam.code,
//       foreground: awayTeam.foreground,
//       id: awayTeam.id,
//       name: awayTeam.name,
//       possession: match.possession === "away",
//       score: match.awayScore,
//     },
//     clock: match.clock,
//     home: {
//       alias: homeTeam.alias,
//       background: homeTeam.background,
//       code: homeTeam.code,
//       foreground: homeTeam.foreground,
//       id: homeTeam.id,
//       name: homeTeam.name,
//       possession: match.possession === "home",
//       score: match.homeScore,
//     },
//     homeTeamOdds: match.homeTeamOdds,
//     id: match.id,
//     overUnder: match.overUnder,
//     status: match.status,
//     timestamp: match.timestamp,
//   };
// };

// export const mergeBetsToMatches = (matches: IMatch[], bets: IBet[], userBets: IBet[], userId: null | number = null) => {
//   const normalizedMatches: IMatch[] = matches.map((match) => {
//     let loggedUserBetsObject = null;

//     // Filter logged user bets
//     if (userBets.length > 0) {
//       loggedUserBetsObject = userBets
//         .filter((bet) => bet.matchId === match.id && bet.user.id === userId)
//         .map((bet) => ({
//           goalsAway: bet.goalsAway,
//           goalsHome: bet.goalsHome,
//           id: bet.id,
//           matchId: bet.matchId,
//           timestamp: bet.timestamp,
//           user: {
//             id: bet.user.id,
//             nickname: bet.user.nickname,
//           },
//         }))[0];
//     }

//     const allBetsObject = bets
//       .filter((bet) => bet.matchId === match.id && bet.user.id !== userId)
//       .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname))
//       .map((bet) => ({
//         goalsAway: bet.goalsAway,
//         goalsHome: bet.goalsHome,
//         id: bet.id,
//         matchId: bet.matchId,
//         timestamp: bet.timestamp,
//         user: {
//           id: bet.user.id,
//           nickname: bet.user.nickname,
//         },
//       }));

//     const normalizedMatch: IMatch = {
//       ...match,
//       bets: allBetsObject,
//       loggedUserBets: loggedUserMatchBets,
//     };
//     return normalizedMatch;
//   });

//   return normalizedMatches;
// };

export const formatMatches = (
  matches: IMatch[],
  bets: IBet[],
  userBets: IBet[],
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

    match.bets = matchBets;
    match.loggedUserBets = loggedUserMatchBets;

    return match;
  });
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
