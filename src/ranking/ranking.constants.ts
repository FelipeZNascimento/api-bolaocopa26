import { STAGE_ID } from "#bet/bet.constants.js";
import { TStageId } from "#bet/bet.types.js";

export const AWARD_POINTS = {
  exactScore: 5,
  extraChampion: 40,
  extraDefense: 10,
  extraOffense: 10,
  extraTopSorer: 10,
  oneScore: 3,
  winnerOnly: 2,
};

export const AWARD_POINTS_2026 = {
  exactScore: 10,
  extraBestPlayer: 15,
  extraChampion: 50,
  extraDefense: 10,
  extraOffense: 10,
  extraTopScorer: 15,
  oneScore: 6,
  winnerOnly: 4,
};

export const EXTRAS_FACTORS_ON_CHANGE: Record<TStageId, number> = {
  [STAGE_ID.BEFORE_QUARTERFINALS]: 0.3,
  [STAGE_ID.BEFORE_START]: 1,
  [STAGE_ID.FINAL]: 0,
  [STAGE_ID.GROUP_STAGE]: 0.6,
  [STAGE_ID.QUARTERFINALS]: 0,
  [STAGE_ID.SEMIFINALS]: 0,
  [STAGE_ID.WINNER]: 0,
};

export const EXTRAS_PROGRESSIVE_FACTORS: Record<TStageId, number> = {
  [STAGE_ID.BEFORE_QUARTERFINALS]: 0,
  [STAGE_ID.BEFORE_START]: 0,
  [STAGE_ID.FINAL]: 0.6,
  [STAGE_ID.GROUP_STAGE]: 0,
  [STAGE_ID.QUARTERFINALS]: 0.2,
  [STAGE_ID.SEMIFINALS]: 0.4,
  [STAGE_ID.WINNER]: 1,
};

export const ROUND_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
};

export const ROUND_MULTIPLIERS_2026: Record<number, number> = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 3,
  5: 4,
  6: 2,
  7: 5,
};

export const DEFAULT_ROUND_MULTIPLIER = 1;
