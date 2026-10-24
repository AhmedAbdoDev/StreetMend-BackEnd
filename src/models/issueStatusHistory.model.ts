import mongoose, { Schema, Document, Types } from "mongoose";

export interface IIssueStatusHistory extends Document {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  changedBy: Types.ObjectId;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  createdAt: Date;
}

const issueStatusHistorySchema = new Schema<IIssueStatusHistory>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    reason: {
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

export const IssueStatusHistory = mongoose.model<IIssueStatusHistory>(
  "IssueStatusHistory",
  issueStatusHistorySchema,
);
export default IssueStatusHistory;
