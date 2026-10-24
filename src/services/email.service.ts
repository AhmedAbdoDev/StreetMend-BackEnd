import nodemailer, { Transporter } from "nodemailer";
import { Types } from "mongoose";
import env from "../config/env.js";
import VerificationCode, {
  VerificationTokenType,
} from "../models/verificationCode.model.js";
import { generateSecurityToken } from "../utils/jwt.js";

let transporterInstance: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporterInstance) {
    return transporterInstance;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporterInstance = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return transporterInstance;
  }

  return null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error("Nodemailer sendMail failed:", error);
      return false;
    }
  }

  console.log(`[Email Service Mock] To: ${to} | Subject: ${subject}`);
  return true;
}

export async function issueVerificationToken(
  userId: Types.ObjectId | string,
  type: VerificationTokenType,
  expiresInMs: number,
): Promise<string> {
  await VerificationCode.deleteMany({
    userId: new Types.ObjectId(userId.toString()),
    type,
  });

  const { rawToken, hashedToken } = generateSecurityToken();

  await VerificationCode.create({
    userId: new Types.ObjectId(userId.toString()),
    type,
    token: hashedToken,
    expiresAt: new Date(Date.now() + expiresInMs),
  });

  return rawToken;
}

export async function sendVerificationEmail(
  to: string,
  userId: Types.ObjectId | string,
  name: string = "Citizen",
): Promise<string> {
  const token = await issueVerificationToken(
    userId,
    "email_verification",
    env.EMAIL_VERIFICATION_EXPIRES_IN_MS,
  );
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Verify Your StreetMend Account Email",
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for registering with StreetMend Civic Issue Reporting Platform.</p>
      <p>Please click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}" target="_blank">${verifyUrl}</a></p>
      <p>Or submit this verification token directly: <strong>${token}</strong></p>
      <p>This verification link will expire in 24 hours.</p>
    `,
  });

  return token;
}

export async function sendPasswordResetEmail(
  to: string,
  userId: Types.ObjectId | string,
  name: string = "User",
): Promise<string> {
  const token = await issueVerificationToken(
    userId,
    "password_reset",
    env.PASSWORD_RESET_EXPIRES_IN_MS,
  );
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: "Reset Your StreetMend Password",
    html: `
      <h2>Hello ${name},</h2>
      <p>We received a request to reset your StreetMend account password.</p>
      <p>Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <p>Or use your reset token: <strong>${token}</strong></p>
      <p>This token is valid for 15 minutes. If you did not request this, please ignore this email.</p>
    `,
  });

  return token;
}

export async function sendStaffPendingNotificationToOwner(
  ownerEmail: string,
  ownerName: string,
  applicantName: string,
  applicantEmail: string,
  deptName: string,
): Promise<boolean> {
  return sendEmail({
    to: ownerEmail,
    subject: `New Staff Registration Request Pending Approval - ${deptName}`,
    html: `
      <h2>Hello ${ownerName},</h2>
      <p>A new applicant has registered for staff onboarding in <strong>${deptName}</strong>.</p>
      <p><strong>Applicant Name:</strong> ${applicantName}</p>
      <p><strong>Applicant Email:</strong> ${applicantEmail}</p>
      <p>Please log in to your StreetMend department dashboard to review and approve or reject this request.</p>
    `,
  });
}

export async function sendStaffApprovedEmail(
  applicantEmail: string,
  applicantName: string,
  deptName: string,
): Promise<boolean> {
  return sendEmail({
    to: applicantEmail,
    subject: `Your Staff Registration has been Approved - ${deptName}`,
    html: `
      <h2>Congratulations ${applicantName}!</h2>
      <p>Your staff account request for <strong>${deptName}</strong> has been approved by the department owner.</p>
      <p>You can now log in to the StreetMend platform to triage, assign, and resolve civic defect reports in your department.</p>
    `,
  });
}

export async function sendStaffRejectedEmail(
  applicantEmail: string,
  applicantName: string,
  deptName: string,
  reason: string,
): Promise<boolean> {
  return sendEmail({
    to: applicantEmail,
    subject: `Staff Registration Decision - ${deptName}`,
    html: `
      <h2>Hello ${applicantName},</h2>
      <p>Your staff onboarding request for <strong>${deptName}</strong> was reviewed by the department owner.</p>
      <p>Unfortunately, your request could not be approved at this time.</p>
      <p><strong>Reason for decision:</strong> ${reason}</p>
    `,
  });
}
