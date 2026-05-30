import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  nickname: z.string().trim().min(4).max(12),
  password: z.string().min(6),
});

export const updatePasswordFromTokenSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(6),
  token: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateFavoritesSchema = z.object({
  favorites: z.array(z.number().int().nonnegative()),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  nickname: z.string().trim().min(4).max(12),
});

export const updateLocaleSchema = z.object({
  locale: z.string().min(2).max(10),
});

export const subscribePushNotificationSchema = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});
