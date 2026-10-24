import { Types } from "mongoose";
import Notification, {
  NotificationType,
} from "../../models/notification.model.js";
import AppError from "../../error/AppError.js";
import { calculatePagination } from "../../utils/pagination.js";

export async function createNotification(data: {
  recipientId: Types.ObjectId | string;
  issueId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  try {
    const notification = await Notification.create({
      recipientId: new Types.ObjectId(data.recipientId.toString()),
      ...(data.issueId && {
        issueId: new Types.ObjectId(data.issueId.toString()),
      }),
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
    });
    return notification;
  } catch (err) {
    console.error("[Notification Service] Error creating notification:", err);
    return null;
  }
}

export async function listUserNotifications(
  userId: string,
  options: { page?: number; limit?: number; isRead?: boolean },
) {
  const filter: any = { recipientId: new Types.ObjectId(userId) };
  if (options.isRead !== undefined) {
    filter.isRead = options.isRead;
  }

  const { skip, buildMeta } = calculatePagination(options);

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .populate("issueId", "reportNumber title status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit || 20),
  ]);

  return {
    notifications,
    meta: buildMeta(total),
  };
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    recipientId: new Types.ObjectId(userId),
  });

  if (!notification) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }

  notification.isRead = true;
  await notification.save();
  return notification;
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await Notification.updateMany(
    { recipientId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } },
  );
  return {
    message: "All notifications marked as read",
    modifiedCount: result.modifiedCount,
  };
}

export async function getUnreadCount(userId: string) {
  const count = await Notification.countDocuments({
    recipientId: new Types.ObjectId(userId),
    isRead: false,
  });
  return { unreadCount: count };
}
