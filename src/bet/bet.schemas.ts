import { z } from "zod";

export const updateBetSchema = z.object({
  awayScore: z.number().int().min(0).nullable(),
  homeScore: z.number().int().min(0).nullable(),
  matchId: z.number().int().positive(),
});

export const updateExtraBetSchema = z.object({
  extraType: z.number().int().min(0).max(4),
  playerId: z.number().int().nonnegative().optional(),
  teamId: z.number().int().positive(),
});
