import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import env from "./config/env.js";

import errorHandler from "./middlewares/errorHandler.js";
import authRouter from "./modules/auth/auth.route.js";
import usersRouter from "./modules/users/users.route.js";
import issuesRouter from "./modules/issues/issues.route.js";
import categoriesRouter from "./modules/issues/categories.route.js";
import departmentRouter from "./modules/department/department.route.js";
import analyticsRouter from "./modules/analytics/analytics.route.js";
import notificationsRouter from "./modules/notifications/notifications.route.js";
import AppError from "./error/AppError.js";

export function createApp(): Express {
  const app = express();

  const allowedOrigins = Array.from(
    new Set([
      ...env.CORS_ORIGIN.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      env.FRONTEND_URL.trim(),
    ]),
  );

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, postman, curl) or matching origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(
          new AppError(
            403,
            "CORS_FORBIDDEN",
            `Origin ${origin} is not allowed by CORS policy`,
          ),
        );
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    exposedHeaders: ["set-cookie"],
    maxAge: 86400,
  };

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  if (process.env.NODE_ENV !== "test") {
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests from this IP, please try again later",
          details: [],
        },
      },
    });
    app.use("/api/", globalLimiter);
  }

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "StreetMend API",
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/issues", issuesRouter);
  app.use("/api/v1/departments", departmentRouter);
  app.use("/api/v1/department", departmentRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/notifications", notificationsRouter);

  app.use((req: Request, _res: Response, next) => {
    next(
      new AppError(
        404,
        "NOT_FOUND",
        `Cannot ${req.method} ${req.originalUrl} - Route not found`,
      ),
    );
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
