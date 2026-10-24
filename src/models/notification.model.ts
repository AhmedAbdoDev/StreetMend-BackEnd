import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationType =
  | "ISSUE_STATUS_UPDATED"
  | "ISSUE_ASSIGNED"
  | "STAFF_REQUEST_APPROVED"
  | "STAFF_REQUEST_REJECTED"
  | "SYSTEM_ALERT";

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  issueId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "ISSUE_STATUS_UPDATED",
        "ISSUE_ASSIGNED",
        "STAFF_REQUEST_APPROVED",
        "STAFF_REQUEST_REJECTED",
        "SYSTEM_ALERT",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
export default Notification;
