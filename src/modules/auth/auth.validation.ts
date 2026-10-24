import { z } from "zod";
import { objectIdRegex } from "../../utils/validation.js";

export { objectIdRegex };

const baseUserCredentials = {
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().trim().optional(),
};

export const registerSchema = z.object({
  body: z.object({
    ...baseUserCredentials,
  }),
});

export const staffRegisterSchema = z.object({
  body: z.object({
    ...baseUserCredentials,
    departmentId: z
      .string()
      .regex(objectIdRegex, "Invalid department ID format"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
    password: z.string().min(1, "Password is required"),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
  }),
});

export const verifyResetPasswordSchema = z.object({
  query: z.object({
    token: z.string().min(1, "Token is required"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  }),
});
