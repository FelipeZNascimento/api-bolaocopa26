import { z } from "zod";

export const deleteFromEditionSchema = z.object({
  userId: z.number().int().positive(),
});

export const updateActiveStatusSchema = z.object({
  newStatus: z.boolean(),
  userId: z.number().int().positive(),
});
