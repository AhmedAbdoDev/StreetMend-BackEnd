import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";

export interface JwtUserPayload {
  userId: string;
  role: "CITIZEN" | "STAFF" | "ADMIN";
  departmentId?: string;
  departmentPosition?: "OWNER" | "MEMBER";
  sessionId?: string;
}

export function generateAccessToken(payload: JwtUserPayload): string {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn:
      env.ACCESS_TOKEN_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const secret: Secret = env.JWT_SECRET;
  return jwt.verify(token, secret) as JwtUserPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSecurityToken(): {
  rawToken: string;
  hashedToken: string;
} {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
}
