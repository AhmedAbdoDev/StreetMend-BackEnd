import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "CITIZEN" | "STAFF" | "ADMIN";
export type DepartmentPosition = "OWNER" | "MEMBER";
export type StaffApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  departmentId?: Types.ObjectId | null;
  departmentPosition?: DepartmentPosition | null;
  isActive: boolean;
  isEmailVerified: boolean;
  staffApprovalStatus?: StaffApprovalStatus | null;
  rejectionReason?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["CITIZEN", "STAFF", "ADMIN"],
      default: "CITIZEN",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    departmentPosition: {
      type: String,
      enum: ["OWNER", "MEMBER"],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    staffApprovalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ departmentId: 1, role: 1, isActive: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
export default User;
