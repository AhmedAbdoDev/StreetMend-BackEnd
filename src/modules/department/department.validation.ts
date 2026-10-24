import { z } from "zod";
import {
  objectIdRegex,
  paginationQuerySchema,
} from "../../utils/validation.js";

export const approveStaffSchema = z.object({
  params: z.object({
    requestId: z.string().regex(objectIdRegex, "Invalid request ID format"),
  }),
});

export const rejectStaffSchema = z.object({
  params: z.object({
    requestId: z.string().regex(objectIdRegex, "Invalid request ID format"),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(5, "Rejection reason must be at least 5 characters")
      .max(500, "Rejection reason cannot exceed 500 characters"),
  }),
});

export const listMembersSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
  }),
});

export const listStaffRequestsSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  }),
});

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Department name must be at least 2 characters")
      .max(100),
    code: z
      .string()
      .trim()
      .min(2, "Department code must be at least 2 characters")
      .max(20)
      .toUpperCase(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    departmentId: z
      .string()
      .regex(objectIdRegex, "Invalid department ID format"),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().min(2).max(20).toUpperCase().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const setDepartmentOwnerSchema = z.object({
  params: z.object({
    departmentId: z
      .string()
      .regex(objectIdRegex, "Invalid department ID format"),
  }),
  body: z.object({
    ownerId: z.string().regex(objectIdRegex, "Invalid owner user ID format"),
  }),
});
