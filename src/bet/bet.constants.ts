export const EXTRA_TYPE_CHAMPION = 0;
export const EXTRA_TYPE_TOP_SCORER = 1;
export const EXTRA_TYPE_OFFENSE = 2;
export const EXTRA_TYPE_DEFENSE = 3;
export const EXTRA_TYPE_BEST_PLAYER = 4;

export const EXTRA_TYPES: Record<number, string> = {
  [EXTRA_TYPE_BEST_PLAYER]: "Best Player",
  [EXTRA_TYPE_CHAMPION]: "Champion",
  [EXTRA_TYPE_DEFENSE]: "Defense",
  [EXTRA_TYPE_OFFENSE]: "Offense",
  [EXTRA_TYPE_TOP_SCORER]: "Top Scorer",
};

export enum STAGE_ID {
  BEFORE_START = 1,
  GROUP_STAGE = 2,
  BEFORE_QUARTERFINALS = 3,
  QUARTERFINALS = 4,
  SEMIFINALS = 5,
  FINAL = 6,
  WINNER = 7,
}
