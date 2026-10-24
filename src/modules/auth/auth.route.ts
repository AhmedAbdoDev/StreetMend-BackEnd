import { Router } from "express";
import * as authController from "./auth.controller.js";
import {
  registerSchema,
  staffRegisterSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyResetPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../../middlewares/rateLimiter.middleware.js";

const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.handleRegister,
);

authRouter.post(
  "/staff-register",
  authLimiter,
  validate(staffRegisterSchema),
  authController.handleStaffRegister,
);

authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  authController.handleVerifyEmail,
);

authRouter.post(
  "/resend-verification",
  passwordResetLimiter,
  validate(resendVerificationSchema),
  authController.handleResendVerification,
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.handleLogin,
);

authRouter.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.handleRefreshToken,
);

authRouter.post("/logout", optionalAuthenticate, authController.handleLogout);

authRouter.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.handleForgotPassword,
);

authRouter.get(
  "/password-reset/verify",
  validate(verifyResetPasswordSchema),
  authController.handleVerifyResetPasswordToken,
);

authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.handleResetPassword,
);

authRouter.get("/me", authenticate, authController.handleGetMe);

export default authRouter;
