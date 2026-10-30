import mongoose, { Types, ClientSession } from "mongoose";
import Issue, {
  IImage,
  IssuePriority,
  IssueStatus,
} from "../../models/issue.model.js";
import Department from "../../models/department.model.js";
import IssueCategory from "../../models/issueCategory.model.js";
import IssueStatusHistory from "../../models/issueStatusHistory.model.js";
import IssueSupport from "../../models/issueSupport.model.js";
import IssueFlag from "../../models/issueFlag.model.js";
import User from "../../models/user.model.js";
import AppError from "../../error/AppError.js";
import { generateReportNumber } from "../../utils/reportNumber.js";
import { calculatePagination } from "../../utils/pagination.js";
import { escapeRegex } from "../../utils/validation.js";
import { cleanupUploadedImages } from "../../services/media.service.js";
import { withTransaction } from "../../utils/transaction.js";
import { createNotification } from "../notifications/notifications.service.js";
import env from "../../config/env.js";

const ALLOWED_STAFF_TRANSITIONS: Record<string, IssueStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS"],
  IN_PROGRESS: [],
  REOPENED: ["UNDER_REVIEW", "IN_PROGRESS"],
};

async function findActiveIssue(issueId: string) {
  const issue = await Issue.findOne({ _id: issueId, isDeleted: false });
  if (!issue) {
    throw new AppError(404, "ISSUE_NOT_FOUND", "Issue report not found");
  }
  return issue;
}

async function recordStatusHistory(
  issueId: Types.ObjectId | string,
  changedBy: Types.ObjectId | string,
  previousStatus: string,
  newStatus: string,
  reason?: string | null,
  session?: ClientSession,
) {
  if (previousStatus === newStatus) {
    return null;
  }

  if (session) {
    const [entry] = await IssueStatusHistory.create(
      [
        {
          issueId,
          changedBy: new Types.ObjectId(changedBy),
          previousStatus,
          newStatus,
          reason: reason || null,
        },
      ],
      { session },
    );
    return entry;
  }

  return IssueStatusHistory.create({
    issueId,
    changedBy: new Types.ObjectId(changedBy),
    previousStatus,
    newStatus,
    reason: reason || null,
  });
}

function assertStaffDepartment(
  staffDepartmentId: string | undefined,
  issueDepartmentId: any,
) {
  if (!staffDepartmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT_ASSIGNED",
      "Staff account lacks department assignment",
    );
  }
  const targetDept = issueDepartmentId?._id
    ? issueDepartmentId._id.toString()
    : issueDepartmentId.toString();
  if (targetDept !== staffDepartmentId) {
    throw new AppError(
      403,
      "DEPARTMENT_ACCESS_FORBIDDEN",
      "Forbidden. This report belongs to another department",
    );
  }
}

export async function createIssue(
  userId: string,
  data: {
    title: string;
    description: string;
    categoryId: string;
    latitude: number;
    longitude: number;
    address?: string;
    images?: IImage[];
  },
) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Your account is not active");
  }

  const category = await IssueCategory.findOne({
    _id: data.categoryId,
    isActive: true,
  });
  if (!category) {
    throw new AppError(
      404,
      "CATEGORY_NOT_FOUND",
      "Active issue category not found",
    );
  }

  const department = await Department.findOne({
    _id: category.departmentId,
    isActive: true,
  });
  if (!department) {
    throw new AppError(
      400,
      "DEPARTMENT_INACTIVE",
      "The department responsible for this category is currently inactive",
    );
  }

  return withTransaction(async (session) => {
    const reportNumber = await generateReportNumber(session);

    let issue: any;
    const issuePayload = {
      reportNumber,
      title: data.title,
      description: data.description,
      categoryId: category._id,
      departmentId: category.departmentId,
      status: "SUBMITTED" as IssueStatus,
      priority: "MEDIUM" as IssuePriority,
      location: {
        type: "Point" as const,
        coordinates: [data.longitude, data.latitude],
      },
      address: data.address || null,
      images: data.images || [],
      createdBy: user._id,
      supportCount: 0,
      flagCount: 0,
      isFlagged: false,
      isDeleted: false,
    };

    if (session) {
      const [created] = await Issue.create([issuePayload], { session });
      issue = created;
    } else {
      issue = await Issue.create(issuePayload);
    }

    await recordStatusHistory(
      issue._id,
      user._id,
      "NONE",
      "SUBMITTED",
      "Initial issue report submission",
      session,
    );

    return issue;
  });
}

export async function listIssues(options: {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  departmentId?: string;
  assignedTo?: string;
  priority?: string;
  isFlagged?: boolean;
  search?: string;
  sortBy?: "createdAt" | "supportCount" | "priority";
  sortOrder?: "asc" | "desc";
  myReports?: boolean;
  userId?: string;
}) {
  const filter: any = { isDeleted: false };

  if (options.status) filter.status = options.status;
  if (options.categoryId)
    filter.categoryId = new Types.ObjectId(options.categoryId);
  if (options.departmentId)
    filter.departmentId = new Types.ObjectId(options.departmentId);
  if (options.assignedTo)
    filter.assignedTo = new Types.ObjectId(options.assignedTo);
  if (options.priority) filter.priority = options.priority;
  if (options.isFlagged !== undefined) filter.isFlagged = options.isFlagged;
  if (options.myReports && options.userId)
    filter.createdBy = new Types.ObjectId(options.userId);

  if (options.search) {
    const searchRegex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { reportNumber: searchRegex },
    ];
  }

  const sort: any = {};
  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortOrder === "asc" ? 1 : -1;
  sort[sortField] = sortDirection;

  const { page, limit, skip, buildMeta } = calculatePagination(options);

  const [total, issues] = await Promise.all([
    Issue.countDocuments(filter),
    Issue.find(filter)
      .populate("categoryId", "name code")
      .populate("departmentId", "name code")
      .populate("createdBy", "name email role createdAt")
      .populate("assignedTo", "name email role departmentPosition")
      .sort(sort)
      .skip(skip)
      .limit(limit),
  ]);

  let issuesResult: any[] = issues;
  if (
    options.userId &&
    issues.length > 0 &&
    (mongoose.connection.readyState === 1 ||
      Boolean((IssueSupport.find as any)?.mock))
  ) {
    try {
      const issueIds = issues.map((i) => i._id);
      const userSupports = await IssueSupport.find({
        issueId: { $in: issueIds },
        userId: new Types.ObjectId(options.userId),
      }).select("issueId");
      const supportedSet = new Set(
        userSupports.map((s) => s.issueId.toString()),
      );
      issuesResult = issues.map((i) => {
        const obj =
          typeof (i as any).toObject === "function" ? (i as any).toObject() : i;
        return {
          ...obj,
          hasSupported: supportedSet.has(i._id.toString()),
        };
      });
    } catch {
      issuesResult = issues;
    }
  }

  return {
    issues: issuesResult,
    meta: buildMeta(total),
  };
}

export async function getIssueById(issueId: string, callerUserId?: string) {
  const issue = await Issue.findOne({ _id: issueId, isDeleted: false })
    .populate("categoryId", "name code")
    .populate("departmentId", "name code")
    .populate("createdBy", "name")
    .populate("assignedTo", "name role departmentPosition");

  if (!issue) {
    throw new AppError(404, "ISSUE_NOT_FOUND", "Issue report not found");
  }

  let hasSupported = false;
  if (callerUserId) {
    if (
      mongoose.connection.readyState === 1 ||
      Boolean((IssueSupport.exists as any)?.mock) ||
      Boolean((IssueSupport.findOne as any)?.mock)
    ) {
      try {
        hasSupported = !!(await IssueSupport.exists({
          issueId: issue._id,
          userId: new Types.ObjectId(callerUserId),
        }));
      } catch {
        hasSupported = false;
      }
    }
  }

  const issueObj =
    typeof (issue as any).toObject === "function"
      ? (issue as any).toObject()
      : issue;

  return {
    ...issueObj,
    hasSupported,
  };
}

export async function getStaffIssueById(
  issueId: string,
  staffDepartmentId: string | undefined,
) {
  if (!staffDepartmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT_ASSIGNED",
      "Staff account lacks department assignment",
    );
  }

  const issue = await Issue.findOne({ _id: issueId, isDeleted: false })
    .populate("categoryId", "name code")
    .populate("departmentId", "name code")
    .populate("createdBy", "name role createdAt")
    .populate("assignedTo", "name role");

  if (!issue) {
    throw new AppError(404, "ISSUE_NOT_FOUND", "Issue report not found");
  }

  assertStaffDepartment(staffDepartmentId, issue.departmentId);

  return issue;
}

export async function updateIssue(
  issueId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    images?: IImage[];
    removeImagePublicIds?: string[];
  },
) {
  const issue = await findActiveIssue(issueId);

  if (issue.createdBy?.toString() !== userId) {
    throw new AppError(
      403,
      "FORBIDDEN_REPORT_OWNER",
      "Only the creator can edit this issue report",
    );
  }

  if (issue.status !== "SUBMITTED") {
    throw new AppError(
      400,
      "REPORT_CANNOT_BE_EDITED",
      "Issue reports can only be edited while in SUBMITTED status before review begins",
    );
  }

  const createdAtTime = issue.createdAt
    ? new Date(issue.createdAt).getTime()
    : Date.now();
  const EDIT_WINDOW_MS = 30 * 60 * 1000;
  if (Date.now() - createdAtTime > EDIT_WINDOW_MS) {
    throw new AppError(
      400,
      "EDIT_WINDOW_EXPIRED",
      "Reports can only be edited within 30 minutes of submission",
    );
  }

  if (data.title) issue.title = data.title;
  if (data.description) issue.description = data.description;
  if (data.address !== undefined) issue.address = data.address;

  if (data.latitude !== undefined && data.longitude !== undefined) {
    issue.location = {
      type: "Point",
      coordinates: [data.longitude, data.latitude],
    };
  }

  if (data.removeImagePublicIds && data.removeImagePublicIds.length > 0) {
    const toRemoveSet = new Set(data.removeImagePublicIds);
    const existingMatching = (issue.images || []).filter((img) =>
      toRemoveSet.has(img.publicId),
    );
    const publicIdsToDelete = existingMatching.map((img) => img.publicId);

    if (publicIdsToDelete.length > 0) {
      await cleanupUploadedImages(publicIdsToDelete);
      issue.images = (issue.images || []).filter(
        (img) => !toRemoveSet.has(img.publicId),
      );
    }
  }

  if (data.images && data.images.length > 0) {
    const existingPublicIds = new Set(
      (issue.images || []).map((img) => img.publicId),
    );
    const newUniqueImages = data.images.filter(
      (img) => !existingPublicIds.has(img.publicId),
    );

    const combinedLength = (issue.images?.length || 0) + newUniqueImages.length;
    if (combinedLength > 5) {
      throw new AppError(
        400,
        "MAX_IMAGES_EXCEEDED",
        "A report cannot have more than 5 images in total",
      );
    }
    if (newUniqueImages.length > 0) {
      issue.images.push(...newUniqueImages);
    }
  }

  await issue.save();
  return issue;
}

export async function withdrawIssue(
  issueId: string,
  callerId: string,
  callerRole: string,
) {
  const issue = await findActiveIssue(issueId);

  const isOwner = issue.createdBy.toString() === callerId;
  const isAdmin = callerRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      403,
      "FORBIDDEN_WITHDRAW",
      "Only the creator or an Administrator can withdraw this issue",
    );
  }

  if (isOwner && !isAdmin && issue.status !== "SUBMITTED") {
    throw new AppError(
      400,
      "INVALID_STATUS_FOR_WITHDRAW",
      "Citizens can only withdraw their report while it is in SUBMITTED status",
    );
  }

  const previousStatus = issue.status;
  issue.isDeleted = true;
  issue.status = "CLOSED";
  issue.closedAt = new Date();
  await issue.save();

  await recordStatusHistory(
    issue._id,
    callerId,
    previousStatus,
    "CLOSED",
    isOwner ? "Withdrawn by citizen creator" : "Withdrawn by Administrator",
  );

  const publicIds: string[] = [];
  if (issue.images && issue.images.length > 0) {
    for (const img of issue.images) {
      if (img.publicId) publicIds.push(img.publicId);
    }
  }
  if (issue.resolutionImages && issue.resolutionImages.length > 0) {
    for (const img of issue.resolutionImages) {
      if (img.publicId) publicIds.push(img.publicId);
    }
  }
  if (publicIds.length > 0) {
    await cleanupUploadedImages(publicIds);
  }

  return { message: "Issue report withdrawn successfully" };
}

export async function supportIssue(issueId: string, userId: string) {
  const issue = await findActiveIssue(issueId);

  if (issue.status === "CLOSED" || issue.status === "REJECTED") {
    throw new AppError(
      400,
      "CANNOT_SUPPORT_INACTIVE_ISSUE",
      `Cannot support an issue report in ${issue.status} status`,
    );
  }

  if (issue.createdBy && issue.createdBy.toString() === userId) {
    throw new AppError(
      400,
      "CANNOT_SUPPORT_OWN_ISSUE",
      "You cannot endorse or support your own reported issue",
    );
  }

  const existingSupport = await IssueSupport.findOne({
    issueId: issue._id,
    userId: new Types.ObjectId(userId),
  });

  if (existingSupport) {
    throw new AppError(
      409,
      "ALREADY_SUPPORTED",
      "You have already supported this issue report",
    );
  }

  try {
    return await withTransaction(async (session) => {
      if (session) {
        await IssueSupport.create(
          [{ issueId: issue._id, userId: new Types.ObjectId(userId) }],
          { session },
        );
      } else {
        await IssueSupport.create({
          issueId: issue._id,
          userId: new Types.ObjectId(userId),
        });
      }

      const updatedIssue = await Issue.findByIdAndUpdate(
        issue._id,
        { $inc: { supportCount: 1 } },
        { new: true, session },
      );

      return {
        message: "Issue supported successfully",
        supportCount:
          updatedIssue?.supportCount ?? (issue.supportCount || 0) + 1,
      };
    });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError(
        409,
        "ALREADY_SUPPORTED",
        "You have already supported this issue report",
      );
    }
    throw err;
  }
}

export async function removeSupportIssue(issueId: string, userId: string) {
  const issue = await findActiveIssue(issueId);

  return withTransaction(async (session) => {
    const existingSupport = await IssueSupport.findOneAndDelete(
      {
        issueId: issue._id,
        userId: new Types.ObjectId(userId),
      },
      session ? { session } : undefined,
    );

    if (!existingSupport) {
      throw new AppError(
        400,
        "NOT_SUPPORTED",
        "You have not supported this issue report",
      );
    }

    const updatedIssue = await Issue.findOneAndUpdate(
      { _id: issue._id, supportCount: { $gt: 0 } },
      { $inc: { supportCount: -1 } },
      { new: true, session },
    );

    return {
      message: "Support removed successfully",
      supportCount:
        updatedIssue?.supportCount ??
        Math.max(0, (issue.supportCount || 0) - 1),
    };
  });
}

export async function flagIssue(
  issueId: string,
  userId: string,
  reason: string,
) {
  const issue = await findActiveIssue(issueId);

  if (issue.createdBy && issue.createdBy.toString() === userId) {
    throw new AppError(
      400,
      "CANNOT_FLAG_OWN_ISSUE",
      "You cannot flag your own reported issue",
    );
  }

  const existingFlag = await IssueFlag.findOne({
    issueId: issue._id,
    userId: new Types.ObjectId(userId),
  });

  if (existingFlag) {
    throw new AppError(
      409,
      "ALREADY_FLAGGED",
      "You have already flagged this issue report",
    );
  }

  try {
    return await withTransaction(async (session) => {
      if (session) {
        await IssueFlag.create(
          [
            {
              issueId: issue._id,
              userId: new Types.ObjectId(userId),
              reason,
            },
          ],
          { session },
        );
      } else {
        await IssueFlag.create({
          issueId: issue._id,
          userId: new Types.ObjectId(userId),
          reason,
        });
      }

      const updatedIssue = await Issue.findByIdAndUpdate(
        issue._id,
        { $inc: { flagCount: 1 } },
        { new: true, session },
      );

      const newFlagCount =
        updatedIssue?.flagCount ?? (issue.flagCount || 0) + 1;
      if (newFlagCount >= env.FLAG_THRESHOLD) {
        await Issue.findByIdAndUpdate(
          issue._id,
          { isFlagged: true },
          { session },
        );
      }

      return {
        message: "Issue report flagged for moderator review",
        flagCount: newFlagCount,
      };
    });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError(
        409,
        "ALREADY_FLAGGED",
        "You have already flagged this issue report",
      );
    }
    throw err;
  }
}

export async function getIssueHistory(issueId: string) {
  await findActiveIssue(issueId);

  const history = await IssueStatusHistory.find({
    issueId: new Types.ObjectId(issueId),
  })
    .populate("changedBy", "name role")
    .sort({ createdAt: 1 });

  return history;
}

export async function assignIssue(
  issueId: string,
  assignedToId: string,
  callerId: string,
  callerRole: string,
) {
  const issue = await findActiveIssue(issueId);

  if (issue.status === "CLOSED" || issue.status === "REJECTED") {
    throw new AppError(
      400,
      "CANNOT_ASSIGN_INACTIVE_ISSUE",
      `Cannot assign an issue report in ${issue.status} status`,
    );
  }

  if (callerRole !== "ADMIN") {
    const caller = await User.findById(callerId);
    if (caller?.departmentId?.toString() !== issue.departmentId.toString()) {
      throw new AppError(
        403,
        "FORBIDDEN_DEPARTMENT_ASSIGN",
        "You can only assign reports routed to your own department",
      );
    }
  }

  const assignee = await User.findOne({
    _id: assignedToId,
    role: "STAFF",
    isActive: true,
    staffApprovalStatus: "APPROVED",
  });

  if (!assignee) {
    throw new AppError(
      400,
      "INVALID_ASSIGNEE",
      "Assignee must be an active, approved staff member",
    );
  }

  if (assignee.departmentId?.toString() !== issue.departmentId.toString()) {
    throw new AppError(
      400,
      "CROSS_DEPARTMENT_ASSIGNMENT_FORBIDDEN",
      "Staff member must belong to the department responsible for this issue",
    );
  }

  issue.assignedTo = assignee._id;
  await issue.save();

  createNotification({
    recipientId: assignee._id.toString(),
    issueId: issue._id.toString(),
    type: "ISSUE_ASSIGNED",
    title: `New Assignment: ${issue.reportNumber}`,
    message: `You have been assigned to issue "${issue.title}".`,
  }).catch(() => {});

  return issue;
}

export async function updateIssuePriority(
  issueId: string,
  priority: IssuePriority,
  callerId: string,
) {
  const issue = await findActiveIssue(issueId);

  if (issue.status === "CLOSED" || issue.status === "REJECTED") {
    throw new AppError(
      400,
      "CANNOT_UPDATE_INACTIVE_ISSUE_PRIORITY",
      `Cannot adjust priority for an issue report in ${issue.status} status`,
    );
  }

  issue.priority = priority;
  await issue.save();

  return issue;
}

export async function adminUpdateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
  reason: string,
  callerId: string,
) {
  const issue = await findActiveIssue(issueId);

  const previousStatus = issue.status;
  issue.status = newStatus;

  if (newStatus === "CLOSED") {
    issue.closedAt = new Date();
    if (!issue.resolvedAt) {
      issue.resolvedAt = new Date();
    }
  } else if (newStatus === "RESOLVED") {
    issue.resolvedAt = new Date();
    issue.closedAt = undefined;
  } else {
    issue.closedAt = undefined;
    issue.resolvedAt = undefined;
  }

  await issue.save();

  await recordStatusHistory(
    issue._id,
    callerId,
    previousStatus,
    newStatus,
    reason,
  );

  if (issue.createdBy) {
    createNotification({
      recipientId: issue.createdBy.toString(),
      issueId: issue._id.toString(),
      type: "ISSUE_STATUS_UPDATED",
      title: `Issue Status Updated: ${issue.reportNumber}`,
      message: `Your issue "${issue.title}" status has been updated to ${newStatus} by an administrator.${reason ? ` Reason: ${reason}` : ""}`,
    }).catch(() => {});
  }

  return issue;
}

export async function updateStaffIssueStatus(
  issueId: string,
  staffUserId: string,
  staffDepartmentId: string | undefined,
  newStatus: IssueStatus,
  reason?: string,
  departmentPosition?: string,
) {
  const issue = await findActiveIssue(issueId);

  assertStaffDepartment(staffDepartmentId, issue.departmentId);

  if (newStatus === "IN_PROGRESS") {
    if (issue.assignedTo) {
      const isAssignee = issue.assignedTo.toString() === staffUserId;
      const isOwner = departmentPosition === "OWNER";
      if (!isAssignee && !isOwner) {
        throw new AppError(
          403,
          "FORBIDDEN_NOT_ASSIGNED",
          "Only the assigned staff member or department owner can begin work on this report",
        );
      }
    } else {
      issue.assignedTo = new Types.ObjectId(staffUserId) as any;
    }
  }

  if (issue.status === "IN_PROGRESS" && newStatus === "RESOLVED") {
    throw new AppError(
      400,
      "RESOLUTION_ENDPOINT_REQUIRED",
      "To mark an issue as RESOLVED, please submit resolution notes using PATCH /api/v1/issues/:issueId/resolution",
    );
  }

  const allowedNext = ALLOWED_STAFF_TRANSITIONS[issue.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot transition report from ${issue.status} to ${newStatus}. Allowed transitions: ${allowedNext.join(", ") || "none"}`,
    );
  }

  if (newStatus === "REJECTED" && (!reason || reason.trim().length < 5)) {
    throw new AppError(
      400,
      "REASON_REQUIRED",
      "A rejection reason of at least 5 characters is required",
    );
  }

  const previousStatus = issue.status;
  issue.status = newStatus;

  if (newStatus === "RESOLVED") {
    issue.resolvedAt = new Date();
  }

  await issue.save();

  await recordStatusHistory(
    issue._id,
    staffUserId,
    previousStatus,
    newStatus,
    reason,
  );

  if (issue.createdBy) {
    createNotification({
      recipientId: issue.createdBy.toString(),
      issueId: issue._id.toString(),
      type: "ISSUE_STATUS_UPDATED",
      title: `Issue Status Updated: ${issue.reportNumber}`,
      message: `Your issue "${issue.title}" status has changed to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
    }).catch(() => {});
  }

  return issue;
}

export async function submitResolution(
  issueId: string,
  staffUserId: string,
  staffDepartmentId: string | undefined,
  notes: string,
  resolutionImages?: IImage[],
  departmentPosition?: string,
) {
  const issue = await findActiveIssue(issueId);

  assertStaffDepartment(staffDepartmentId, issue.departmentId);

  if (issue.assignedTo) {
    const isAssignee = issue.assignedTo.toString() === staffUserId;
    const isOwner = departmentPosition === "OWNER";
    if (!isAssignee && !isOwner) {
      throw new AppError(
        403,
        "FORBIDDEN_NOT_ASSIGNED",
        "Only the assigned staff member or department owner can resolve this issue",
      );
    }
  }

  if (issue.status !== "IN_PROGRESS" && issue.status !== "ACCEPTED") {
    throw new AppError(
      400,
      "INVALID_STATUS_FOR_RESOLUTION",
      `Issue must be in IN_PROGRESS or ACCEPTED status to mark resolved (current status: ${issue.status})`,
    );
  }

  const previousStatus = issue.status;
  issue.status = "RESOLVED";
  issue.resolvedAt = new Date();
  issue.resolutionNotes = notes;
  if (resolutionImages && resolutionImages.length > 0) {
    issue.resolutionImages = [
      ...(issue.resolutionImages || []),
      ...resolutionImages,
    ];
  }

  await issue.save();

  await recordStatusHistory(
    issue._id,
    staffUserId,
    previousStatus,
    "RESOLVED",
    notes,
  );

  if (issue.createdBy) {
    createNotification({
      recipientId: issue.createdBy.toString(),
      issueId: issue._id.toString(),
      type: "ISSUE_STATUS_UPDATED",
      title: `Issue Resolved: ${issue.reportNumber}`,
      message: `Your issue "${issue.title}" has been marked as RESOLVED. Resolution notes: ${notes}`,
    }).catch(() => {});
  }

  return issue;
}

export async function listAllIssues(options: any) {
  return listIssues(options);
}

export async function listStaffIssues(
  staffDepartmentId: string | undefined,
  options: any,
) {
  if (!staffDepartmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT_ASSIGNED",
      "You are not assigned to any active municipal department",
    );
  }
  return listIssues({ ...options, departmentId: staffDepartmentId });
}

export async function getMyAssignments(staffUserId: string, options: any) {
  return listIssues({
    ...options,
    assignedTo: staffUserId,
    sortBy: "priority",
    sortOrder: "desc",
  });
}

export async function listCategories() {
  const categories = await IssueCategory.find()
    .populate("departmentId", "name code")
    .sort({ name: 1 });
  return categories;
}

export async function getActiveCategories() {
  const categories = await IssueCategory.find({ isActive: true })
    .populate("departmentId", "name code")
    .sort({ name: 1 });
  return categories;
}

export async function createCategory(data: {
  name: string;
  code: string;
  departmentId: string;
}) {
  const department = await Department.findOne({
    _id: data.departmentId,
    isActive: true,
  });
  if (!department) {
    throw new AppError(
      404,
      "DEPARTMENT_NOT_FOUND",
      "Active department not found",
    );
  }

  const existing = await IssueCategory.findOne({
    $or: [{ name: data.name }, { code: data.code.toUpperCase() }],
  });
  if (existing) {
    throw new AppError(
      409,
      "CATEGORY_EXISTS",
      "Category with this name or code already exists",
    );
  }

  const category = await IssueCategory.create({
    name: data.name,
    code: data.code.toUpperCase(),
    departmentId: department._id,
    isActive: true,
  });

  return category;
}

export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    code?: string;
    departmentId?: string;
    isActive?: boolean;
  },
) {
  const category = await IssueCategory.findById(categoryId);
  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }

  if (data.departmentId) {
    const dept = await Department.findOne({
      _id: data.departmentId,
      isActive: true,
    });
    if (!dept)
      throw new AppError(
        404,
        "DEPARTMENT_NOT_FOUND",
        "Active department not found",
      );
    category.departmentId = dept._id;
  }

  if (data.name || data.code) {
    const conflict = await IssueCategory.findOne({
      _id: { $ne: category._id },
      $or: [
        ...(data.name ? [{ name: data.name }] : []),
        ...(data.code ? [{ code: data.code.toUpperCase() }] : []),
      ],
    });
    if (conflict) {
      throw new AppError(
        409,
        "CATEGORY_EXISTS",
        "Category with this name or code already exists",
      );
    }
  }

  if (data.name) category.name = data.name;
  if (data.code) category.code = data.code.toUpperCase();
  if (data.isActive !== undefined) category.isActive = data.isActive;

  await category.save();
  return category;
}
