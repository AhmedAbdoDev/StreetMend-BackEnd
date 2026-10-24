import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/streetmend"),
  JWT_SECRET: z
    .string()
    .min(8, "JWT_SECRET must be at least 8 characters")
    .default("streetmend_super_secret_jwt_key_2026"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z
    .string()
    .default("10")
    .transform((val) => parseInt(val, 10)),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  ADMIN_EMAIL: z.string().email().default("admin@streetmend.gov"),
  ADMIN_PASSWORD: z.string().default("Admin@123456"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_MS: z
    .string()
    .default(String(7 * 24 * 60 * 60 * 1000))
    .transform((val) => parseInt(val, 10)),
  EMAIL_VERIFICATION_EXPIRES_IN_MS: z
    .string()
    .default(String(24 * 60 * 60 * 1000))
    .transform((val) => parseInt(val, 10)),
  PASSWORD_RESET_EXPIRES_IN_MS: z
    .string()
    .default(String(15 * 60 * 1000))
    .transform((val) => parseInt(val, 10)),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z
    .string()
    .default(
      "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
    ),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z
    .string()
    .default("587")
    .transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("noreply@streetmend.gov"),
  FLAG_THRESHOLD: z
    .string()
    .default("3")
    .transform((val) => parseInt(val, 10)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Environment configuration validation failed:");
  parsedEnv.error.issues.forEach((issue) => {
    console.error(` - [${issue.path.join(".")}]: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
export default env;
