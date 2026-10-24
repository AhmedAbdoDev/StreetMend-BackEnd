import { Request, Response, NextFunction } from "express";
import AppError from "../error/AppError.js";

export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_IDENTIFIER",
        message: `Invalid format for field: ${err.path || "id"}`,
        details: [],
      },
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "resource";
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_RESOURCE",
        message: `A record with this ${field} already exists`,
        details: [],
      },
    });
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e: any) => ({
      path: [e.path],
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details,
      },
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format in request body",
        details: [],
      },
    });
  }

  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred",
      details: [],
    },
  });
}
