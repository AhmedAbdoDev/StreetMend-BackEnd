import mongoose, { Schema, Document, Types } from "mongoose";

export interface IIssueCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  departmentId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const issueCategorySchema = new Schema<IIssueCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const IssueCategory = mongoose.model<IIssueCategory>(
  "IssueCategory",
  issueCategorySchema,
);
export default IssueCategory;
