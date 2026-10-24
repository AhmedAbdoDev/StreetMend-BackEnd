import { z } from "zod";
import {
  objectIdRegex,
  paginationQuerySchema,
} from "../../utils/validation.js";

export const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: z
      .string()
      .regex(objectIdRegex, "Invalid notification ID format"),
  }),
});

export const listNotificationsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
    isRead: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === "true")),
  }),
});
