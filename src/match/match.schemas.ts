import { z } from "zod";

const matchUpdateItemSchema = z.object({
  awayScore: z.number().int().min(0).optional(),
  fifaId: z.number().int().positive().optional(),
  gametime: z.string(),
  homeScore: z.number().int().min(0).optional(),
  status: z.number().int().min(0),
});

export const updateMatchesSchema = z.object({
  updatedMatches: z.array(matchUpdateItemSchema).min(1),
});
