import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import AppError from "../error/AppError.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "CITIZEN" | "STAFF" | "ADMIN";
        departmentId?: string;
        departmentPosition?: "OWNER" | "MEMBER";
        sessionId?: string;
      };
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required. Please provide a valid Bearer token.",
      ),
    );
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      departmentId: decoded.departmentId,
      departmentPosition: decoded.departmentPosition,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    return next(
      new AppError(401, "INVALID_TOKEN", "Invalid or expired access token"),
    );
  }
}

export function authorize(
  ...allowedRoles: Array<"CITIZEN" | "STAFF" | "ADMIN">
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          `Forbidden. Access restricted to: ${allowedRoles.join(", ")}`,
        ),
      );
    }

    next();
  };
}

export function requireDepartmentOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  if (req.user.role === "ADMIN") {
    return next();
  }

  if (req.user.role === "STAFF" && req.user.departmentPosition === "OWNER") {
    return next();
  }

  return next(
    new AppError(
      403,
      "FORBIDDEN",
      "Forbidden. Only Department Owners or Administrators can perform this action",
    ),
  );
}

export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      departmentId: decoded.departmentId,
      departmentPosition: decoded.departmentPosition,
      sessionId: decoded.sessionId,
    };
  } catch (error) {}
  next();
}
