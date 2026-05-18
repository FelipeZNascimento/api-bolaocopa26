import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  BASE_URL: z.url(),
  SMTP_FROM: isProduction ? z.email() : z.email().optional(),
  SMTP_HOST: isProduction ? z.string() : z.string().optional(),
  SMTP_PASSWORD: isProduction ? z.string() : z.string().optional(),
  SMTP_PORT: isProduction ? z.string().transform(Number) : z.string().transform(Number).optional(),
  SMTP_USER: isProduction ? z.string() : z.string().optional(),
});

export const ENV = envSchema.parse(process.env);

// Add validation for production environment
if (isProduction) {
  const requiredFields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];

  requiredFields.forEach((field) => {
    if (!process.env[field]) {
      throw new Error(`Missing required env variable: ${field}`);
    }
  });
}
