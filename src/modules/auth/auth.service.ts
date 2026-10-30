import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User, { IUser } from "../../models/user.model.js";
import Department from "../../models/department.model.js";
import StaffRequest from "../../models/staffRequest.model.js";
import Session from "../../models/session.model.js";
import VerificationCode from "../../models/verificationCode.model.js";
import AppError from "../../error/AppError.js";
import {
  generateAccessToken,
  generateSecurityToken,
  hashToken,
} from "../../utils/jwt.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendStaffPendingNotificationToOwner,
} from "../../services/email.service.js";
import env from "../../config/env.js";

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string | null;
  departmentPosition?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  staffApprovalStatus?: string | null;
  phone?: string | null;
  createdAt: Date;
}

export function mapUserResponse(user: IUser): UserResponseDto {
  return {
    id: (user._id as Types.ObjectId).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
    departmentPosition: user.departmentPosition || null,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    staffApprovalStatus: user.staffApprovalStatus || null,
    phone: user.phone || null,
    createdAt: user.createdAt,
  };
}

export async function registerCitizen(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    throw new AppError(
      409,
      "EMAIL_EXISTS",
      "An account with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    env.BCRYPT_SALT_ROUNDS,
  );

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: "CITIZEN",
    isActive: true,
    isEmailVerified: false,
    phone: data.phone || null,
  });

  await sendVerificationEmail(user.email, user._id, user.name);

  return {
    message: "Citizen registered successfully. Please verify your email.",
    user: mapUserResponse(user),
  };
}

export async function registerStaff(data: {
  name: string;
  email: string;
  password: string;
  departmentId: string;
  phone?: string;
}) {
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  const isRejectedStaffReapplying =
    existingUser &&
    existingUser.role === "STAFF" &&
    existingUser.staffApprovalStatus === "REJECTED" &&
    !existingUser.isActive;

  if (existingUser && !isRejectedStaffReapplying) {
    throw new AppError(
      409,
      "EMAIL_EXISTS",
      "An account with this email already exists",
    );
  }

  const department = await Department.findOne({
    _id: data.departmentId,
    isActive: true,
  });
  if (!department) {
    throw new AppError(
      404,
      "DEPARTMENT_NOT_FOUND",
      "Selected active department not found",
    );
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    env.BCRYPT_SALT_ROUNDS,
  );

  let user: any;
  if (isRejectedStaffReapplying && existingUser) {
    existingUser.name = data.name;
    existingUser.password = hashedPassword;
    existingUser.departmentId = department._id;
    existingUser.departmentPosition = "MEMBER";
    existingUser.staffApprovalStatus = "PENDING";
    existingUser.isActive = false;
    existingUser.phone = data.phone || null;
    await existingUser.save();
    user = existingUser;
  } else {
    user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: "STAFF",
      departmentId: department._id,
      departmentPosition: "MEMBER",
      isActive: false,
      staffApprovalStatus: "PENDING",
      isEmailVerified: false,
      phone: data.phone || null,
    });
  }

  await StaffRequest.create({
    applicantId: user._id,
    departmentId: department._id,
    status: "PENDING",
  });

  await sendVerificationEmail(user.email, user._id, user.name);

  if (department.ownerId) {
    const owner = await User.findById(department.ownerId);
    if (owner && owner.email) {
      await sendStaffPendingNotificationToOwner(
        owner.email,
        owner.name,
        user.name,
        user.email,
        department.name,
      );
    }
  }

  return {
    message:
      "Staff registration request submitted successfully. Awaiting department owner approval.",
    user: mapUserResponse(user),
  };
}

export async function verifyEmail(token: string) {
  const hashedToken = hashToken(token);
  const tokenRecord = await VerificationCode.findOne({
    token: hashedToken,
    type: "email_verification",
    expiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new AppError(
      400,
      "INVALID_TOKEN",
      "Invalid or expired email verification token",
    );
  }

  const user = await User.findById(tokenRecord.userId);
  if (!user) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User associated with verification token not found",
    );
  }

  if (user.isEmailVerified) {
    return { message: "Email is already verified" };
  }

  user.isEmailVerified = true;
  await user.save();

  await VerificationCode.deleteMany({
    userId: user._id,
    type: "email_verification",
  });

  return { message: "Email verified successfully" };
}

export async function resendVerification(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && !user.isEmailVerified) {
    await sendVerificationEmail(user.email, user._id, user.name);
  }

  return {
    message:
      "If an unverified account exists, a verification email has been sent.",
  };
}

export async function login(data: { email: string; password: string }) {
  const user = await User.findOne({ email: data.email.toLowerCase() }).select(
    "+password",
  );
  if (!user || !user.password) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (!user.isActive) {
    if (user.role === "STAFF" && user.staffApprovalStatus === "PENDING") {
      throw new AppError(
        403,
        "STAFF_PENDING_APPROVAL",
        "Your staff account is currently pending approval by the department owner",
      );
    }
    if (user.role === "STAFF" && user.staffApprovalStatus === "REJECTED") {
      throw new AppError(
        403,
        "STAFF_REGISTRATION_REJECTED",
        `Your staff registration was rejected. Reason: ${user.rejectionReason || "Not specified"}`,
      );
    }
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "Your account has been deactivated",
    );
  }

  if (!user.isEmailVerified) {
    await sendVerificationEmail(user.email, user._id, user.name);
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email address before logging in",
    );
  }

  const { rawToken, hashedToken } = generateSecurityToken();
  const session = await Session.create({
    userId: user._id,
    refreshToken: hashedToken,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_MS),
  });

  const accessToken = generateAccessToken({
    userId: (user._id as Types.ObjectId).toString(),
    role: user.role,
    departmentId: user.departmentId ? user.departmentId.toString() : undefined,
    departmentPosition: user.departmentPosition || undefined,
    sessionId: (session._id as Types.ObjectId).toString(),
  });

  return {
    accessToken,
    refreshToken: rawToken,
    user: mapUserResponse(user),
  };
}

export async function refreshAuthToken(refreshTokenRaw: string) {
  const hashedToken = hashToken(refreshTokenRaw);
  const session = await Session.findOne({ refreshToken: hashedToken });

  if (!session) {
    throw new AppError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Invalid or expired refresh token",
    );
  }

  if (session.revokedAt !== null && session.revokedAt !== undefined) {
    await Session.updateMany(
      { userId: session.userId, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw new AppError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Invalid or expired refresh token",
    );
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Invalid or expired refresh token",
    );
  }

  const user = await User.findById(session.userId);
  if (!user || !user.isActive) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "User account not found or deactivated",
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email address",
    );
  }

  const { rawToken, hashedToken: newHashedToken } = generateSecurityToken();

  session.refreshToken = newHashedToken;
  session.expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_MS);
  session.lastUsedAt = new Date();
  await session.save();

  const accessToken = generateAccessToken({
    userId: (user._id as Types.ObjectId).toString(),
    role: user.role,
    departmentId: user.departmentId ? user.departmentId.toString() : undefined,
    departmentPosition: user.departmentPosition || undefined,
    sessionId: (session._id as Types.ObjectId).toString(),
  });

  return {
    accessToken,
    refreshToken: rawToken,
    user: mapUserResponse(user),
  };
}

export async function logout(sessionId?: string, refreshTokenRaw?: string) {
  if (sessionId) {
    await Session.updateOne(
      { _id: new Types.ObjectId(sessionId), revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  if (refreshTokenRaw) {
    const hashed = hashToken(refreshTokenRaw);
    await Session.updateOne(
      { refreshToken: hashed, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  return { message: "Logged out successfully" };
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({
    email: email.toLowerCase(),
    isActive: true,
  });

  if (user) {
    await sendPasswordResetEmail(user.email, user._id, user.name);
  }

  return {
    message:
      "If an account exists for this email, a password reset email has been sent.",
  };
}

export async function verifyPasswordResetToken(token: string) {
  const hashedToken = hashToken(token);
  const exists = await VerificationCode.exists({
    token: hashedToken,
    type: "password_reset",
    expiresAt: { $gt: new Date() },
  });

  if (!exists) {
    throw new AppError(
      400,
      "INVALID_TOKEN",
      "Invalid or expired password reset token",
    );
  }

  return { message: "Password reset token is valid" };
}

export async function submitNewPassword(token: string, newPassword: string) {
  const hashedToken = hashToken(token);
  const tokenRecord = await VerificationCode.findOne({
    token: hashedToken,
    type: "password_reset",
    expiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new AppError(
      400,
      "INVALID_TOKEN",
      "Invalid or expired password reset token",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await User.updateOne(
    { _id: tokenRecord.userId },
    { password: hashedPassword },
  );

  await Session.updateMany(
    { userId: tokenRecord.userId, revokedAt: null },
    { revokedAt: new Date() },
  );

  await VerificationCode.deleteMany({
    userId: tokenRecord.userId,
    type: "password_reset",
  });

  return { message: "Password updated successfully" };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User profile not found");
  }
  if (!user.isActive) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Your account is deactivated");
  }
  return mapUserResponse(user);
}
