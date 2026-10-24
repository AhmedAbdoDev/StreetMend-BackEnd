import { Router } from "express";
import * as notificationsController from "./notifications.controller.js";
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from "./notifications.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  validate(listNotificationsSchema),
  notificationsController.handleListNotifications,
);

notificationsRouter.get(
  "/unread-count",
  notificationsController.handleGetUnreadCount,
);

notificationsRouter.patch(
  "/read-all",
  notificationsController.handleMarkAllAsRead,
);

notificationsRouter.patch(
  "/:notificationId/read",
  validate(notificationIdParamSchema),
  notificationsController.handleMarkAsRead,
);

export default notificationsRouter;
