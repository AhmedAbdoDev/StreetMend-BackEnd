import { z } from "zod";
import {
  objectIdRegex,
  paginationQuerySchema,
} from "../../utils/validation.js";

export const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

export const latitudeSchema = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
  .refine(
    (val) => !isNaN(val) && val >= -90 && val <= 90,
    "Latitude must be between -90 and 90",
  );

export const longitudeSchema = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
  .refine(
    (val) => !isNaN(val) && val >= -180 && val <= 180,
    "Longitude must be between -180 and 180",
  );

export const issueStatusEnum = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
]);

export const issuePriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const issueIdParamSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
});

export const staffIssueIdParamSchema = issueIdParamSchema;

export const createIssueSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters")
      .max(100),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000),
    categoryId: z.string().regex(objectIdRegex, "Invalid category ID format"),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    address: z.string().trim().optional(),
    images: z.array(imageSchema).optional().default([]),
  }),
});

export const updateIssueSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(5).max(100).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    address: z.string().trim().optional(),
    images: z.array(imageSchema).optional(),
    removeImagePublicIds: z
      .union([
        z.array(z.string()),
        z.string().transform((val) => {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [val];
          } catch {
            return val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }),
      ])
      .optional(),
  }),
});

export const flagIssueSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(5, "Flag reason must be at least 5 characters")
      .max(500, "Flag reason cannot exceed 500 characters"),
  }),
});

export const listIssuesSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
    status: issueStatusEnum.optional(),
    categoryId: z.string().regex(objectIdRegex).optional(),
    departmentId: z.string().regex(objectIdRegex).optional(),
    search: z.string().trim().optional(),
    sortBy: z.enum(["createdAt", "supportCount", "priority"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    myReports: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === "true")),
  }),
});

export const assignIssueSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    assignedTo: z
      .string()
      .regex(objectIdRegex, "Invalid assignee user ID format"),
  }),
});

export const updatePrioritySchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    priority: issuePriorityEnum,
  }),
});

export const adminUpdateStatusSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    status: issueStatusEnum,
    reason: z
      .string()
      .trim()
      .min(5, "Administrative justification must be at least 5 characters")
      .max(500),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100),
    code: z
      .string()
      .trim()
      .min(2, "Category code must be at least 2 characters")
      .max(30)
      .toUpperCase(),
    departmentId: z
      .string()
      .regex(objectIdRegex, "Invalid department ID format"),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().regex(objectIdRegex, "Invalid category ID format"),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().min(2).max(30).toUpperCase().optional(),
    departmentId: z.string().regex(objectIdRegex).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listAdminIssuesSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
    status: issueStatusEnum.optional(),
    departmentId: z.string().regex(objectIdRegex).optional(),
    categoryId: z.string().regex(objectIdRegex).optional(),
    priority: issuePriorityEnum.optional(),
    isFlagged: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === "true")),
    search: z.string().trim().optional(),
  }),
});

export const listStaffIssuesSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,
    status: issueStatusEnum.optional(),
    assignedTo: z.string().regex(objectIdRegex).optional(),
    priority: issuePriorityEnum.optional(),
  }),
});

export const updateIssueStatusSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z
    .object({
      status: issueStatusEnum,
      reason: z.string().trim().min(5).max(500).optional(),
    })
    .refine(
      (data) => {
        if (
          data.status === "REJECTED" &&
          (!data.reason || data.reason.trim().length < 5)
        ) {
          return false;
        }
        return true;
      },
      {
        message:
          "A rejection reason of at least 5 characters is required when rejecting a report",
        path: ["reason"],
      },
    ),
});

export const submitResolutionSchema = z.object({
  params: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
  body: z.object({
    notes: z
      .string()
      .trim()
      .min(5, "Resolution notes must be at least 5 characters")
      .max(2000),
    resolutionImages: z.array(imageSchema).optional().default([]),
  }),
});
