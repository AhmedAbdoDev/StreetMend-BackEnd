import mongoose, { Schema, Document, Types } from "mongoose";

export interface IIssueSupport extends Document {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const issueSupportSchema = new Schema<IIssueSupport>(
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

issueSupportSchema.index({ issueId: 1, userId: 1 }, { unique: true });

export const IssueSupport = mongoose.model<IIssueSupport>(
  "IssueSupport",
  issueSupportSchema,
);
export default IssueSupport;
