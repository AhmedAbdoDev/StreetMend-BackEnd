import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";
const isDevelopment = process.env.NODE_ENV === "development" || isTest;

function createLimiter(windowMs: number, max: number, customMessage: string) {
  return rateLimit({
    windowMs,
    max: isDevelopment ? 10000 : max,
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

export const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many authentication attempts from this IP, please try again in 15 minutes",
);

export const passwordResetLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many email verification or password reset requests. Please wait 15 minutes before trying again",
);

export const issueCreationLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many issue reports submitted from this IP, please try again later",
);
