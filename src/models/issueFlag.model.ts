import mongoose, { Schema, Document, Types } from "mongoose";

export interface IIssueFlag extends Document {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  userId: Types.ObjectId;
  reason: string;
  createdAt: Date;
}

const issueFlagSchema = new Schema<IIssueFlag>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

issueFlagSchema.index({ issueId: 1, userId: 1 }, { unique: true });

export const IssueFlag = mongoose.model<IIssueFlag>(
  "IssueFlag",
  issueFlagSchema,
);
export default IssueFlag;
