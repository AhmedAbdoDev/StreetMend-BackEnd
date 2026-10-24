import mongoose, { Schema, Document, Types } from "mongoose";

export type VerificationTokenType = "email_verification" | "password_reset";

export interface IVerificationCode extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: VerificationTokenType;
  token: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const verificationCodeSchema = new Schema<IVerificationCode>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode = mongoose.model<IVerificationCode>(
  "VerificationCode",
  verificationCodeSchema,
);
export default VerificationCode;
