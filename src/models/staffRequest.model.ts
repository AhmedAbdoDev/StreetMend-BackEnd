import mongoose, { Schema, Document, Types } from "mongoose";

export type StaffRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IStaffRequest extends Document {
  _id: Types.ObjectId;
  applicantId: Types.ObjectId;
  departmentId: Types.ObjectId;
  status: StaffRequestStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

const staffRequestSchema = new Schema<IStaffRequest>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

staffRequestSchema.index({ departmentId: 1, status: 1 });

export const StaffRequest = mongoose.model<IStaffRequest>(
  "StaffRequest",
  staffRequestSchema,
);
export default StaffRequest;
