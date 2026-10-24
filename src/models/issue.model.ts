import mongoose, { Schema, Document, Types } from "mongoose";

export type IssueStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface IImage {
  url: string;
  publicId: string;
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface IIssue extends Document {
  _id: Types.ObjectId;
  reportNumber: string;
  title: string;
  description: string;
  categoryId: Types.ObjectId;
  departmentId: Types.ObjectId;
  status: IssueStatus;
  priority: IssuePriority;
  location: IGeoPoint;
  address?: string;
  images: IImage[];
  resolutionNotes?: string;
  resolutionImages: IImage[];
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  supportCount: number;
  flagCount: number;
  isFlagged: boolean;
  isDeleted: boolean;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const issueSchema = new Schema<IIssue>(
  {
    reportNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "IssueCategory",
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
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
      ],
      default: "SUBMITTED",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    resolutionNotes: {
      type: String,
      trim: true,
      default: null,
    },
    resolutionImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    supportCount: {
      type: Number,
      default: 0,
      index: true,
    },
    flagCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ isDeleted: 1, departmentId: 1, status: 1, createdAt: -1 });
issueSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });
issueSchema.index({ isDeleted: 1, resolvedAt: 1 });

export const Issue = mongoose.model<IIssue>("Issue", issueSchema);
export default Issue;
