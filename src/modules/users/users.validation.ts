import { z } from "zod";
import {
  objectIdRegex,
  paginationQuerySchema,
} from "../../utils/validation.js";

export const listUsersSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
    role: z.enum(["CITIZEN", "STAFF", "ADMIN"]).optional(),
    departmentId: z.string().regex(objectIdRegex).optional(),
    isActive: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === "true")),
    search: z.string().trim().optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
  body: z.object({
    role: z.enum(["CITIZEN", "STAFF", "ADMIN"]),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const updateUserDepartmentSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
  body: z.object({
    departmentId: z
      .string()
      .regex(objectIdRegex, "Invalid department ID format"),
  }),
});
