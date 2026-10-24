import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

const isTest = process.env.NODE_ENV === "test";

function createLimiter(windowMs: number, max: number, customMessage: string) {
  return rateLimit({
    windowMs,
    max: isTest ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    message: {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: customMessage,
        details: [],
      },
    },
  });
}

/**
 * Sensitive auth limiter: login and registration attempts
 * 20 attempts per 15 minutes
 */
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many authentication attempts from this IP, please try again in 15 minutes",
);

/**
 * Strict email dispatch limiter: forgot password & resend verification code
 * 5 attempts per 15 minutes
 */
export const passwordResetLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many email verification or password reset requests. Please wait 15 minutes before trying again",
);

/**
 * Issue creation limiter: prevents automated flood of civic reports
 * 30 reports per 15 minutes
 */
export const issueCreationLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many issue reports submitted from this IP, please try again later",
);
