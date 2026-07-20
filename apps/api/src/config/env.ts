import 'dotenv/config';
import { z } from 'zod';

const optionalEnvironmentValue = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: optionalEnvironmentValue,
  CLOUDINARY_API_KEY: optionalEnvironmentValue,
  CLOUDINARY_API_SECRET: optionalEnvironmentValue,

  STRIPE_SECRET_KEY: optionalEnvironmentValue,
  STRIPE_WEBHOOK_SECRET: optionalEnvironmentValue,
  STRIPE_SUCCESS_URL: z.string().url().default('http://localhost:5173/payments/success'),
  STRIPE_CANCEL_URL: z.string().url().default('http://localhost:5173/payments/cancel'),
});

export const env = envSchema.parse(process.env);
