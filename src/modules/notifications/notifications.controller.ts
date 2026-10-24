import { Request, Response } from "express";
import * as notificationsService from "./notifications.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function handleListNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit, isRead } = req.query as any;
  const result = await notificationsService.listUserNotifications(
    req.user!.id,
    {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      isRead,
    },
  );
  sendSuccess(
    res,
    200,
    "Notifications retrieved successfully",
    result.notifications,
    result.meta,
  );
}

export async function handleMarkAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  const notification = await notificationsService.markNotificationAsRead(
    req.params.notificationId as string,
    req.user!.id,
  );
  sendSuccess(res, 200, "Notification marked as read", notification);
}

export async function handleMarkAllAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await notificationsService.markAllNotificationsAsRead(
    req.user!.id,
  );
  sendSuccess(res, 200, result.message, {
    modifiedCount: result.modifiedCount,
  });
}

export async function handleGetUnreadCount(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await notificationsService.getUnreadCount(req.user!.id);
  sendSuccess(res, 200, "Unread notifications count retrieved", result);
}
