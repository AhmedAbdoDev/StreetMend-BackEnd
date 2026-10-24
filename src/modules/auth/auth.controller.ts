import { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function handleRegister(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.registerCitizen(req.body);
  sendSuccess(res, 201, result.message, result.user);
}

export async function handleStaffRegister(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.registerStaff(req.body);
  sendSuccess(res, 201, result.message, result.user);
}

export async function handleVerifyEmail(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.verifyEmail(req.body.token);
  sendSuccess(res, 200, result.message);
}

export async function handleResendVerification(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.resendVerification(req.body.email);
  sendSuccess(res, 200, result.message);
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  sendSuccess(res, 200, "Login successful", result);
}

export async function handleRefreshToken(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.refreshAuthToken(req.body.refreshToken);
  sendSuccess(res, 200, "Token refreshed successfully", result);
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const sessionId = req.user?.sessionId;
  const refreshToken = req.body?.refreshToken;
  const result = await authService.logout(sessionId, refreshToken);
  sendSuccess(res, 200, result.message);
}

export async function handleForgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.requestPasswordReset(req.body.email);
  sendSuccess(res, 200, result.message);
}

export async function handleVerifyResetPasswordToken(
  req: Request,
  res: Response,
): Promise<void> {
  const token = req.query.token as string;
  const result = await authService.verifyPasswordResetToken(token);
  sendSuccess(res, 200, result.message);
}

export async function handleResetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await authService.submitNewPassword(
    req.body.token,
    req.body.newPassword,
  );
  sendSuccess(res, 200, result.message);
}

export async function handleGetMe(req: Request, res: Response): Promise<void> {
  const profile = await authService.getMe(req.user!.id);
  sendSuccess(res, 200, "Profile retrieved successfully", profile);
}
