import { Request, Response } from "express";
import * as issuesService from "./issues.service.js";
import { uploadMultipleImages } from "../../services/media.service.js";
import { sendSuccess } from "../../utils/response.js";
import AppError from "../../error/AppError.js";

async function processUploadedImages(
  files: any,
  folder: string,
  existingImages: any[] = [],
) {
  if (files && Array.isArray(files) && files.length > 0) {
    const fileBuffers = files.map((f: Express.Multer.File) => f.buffer);
    const uploaded = await uploadMultipleImages(fileBuffers, folder);
    return [...existingImages, ...uploaded];
  }
  return existingImages;
}

export async function handleCreateIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const images = await processUploadedImages(
    req.files,
    "streetmend/issues",
    req.body.images || [],
  );

  const payload = {
    ...req.body,
    images,
  };

  const issue = await issuesService.createIssue(req.user!.id, payload);
  sendSuccess(res, 201, "Civic issue reported successfully", issue);
}

export async function handleListIssues(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { issues, meta } = await issuesService.listIssues({
    page: query.page || 1,
    limit: query.limit || 20,
    status: query.status,
    categoryId: query.categoryId,
    departmentId: query.departmentId,
    search: query.search,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
    myReports: query.myReports,
    userId: req.user?.id,
  });
  sendSuccess(res, 200, "Issues retrieved successfully", issues, meta);
}

export async function handleGetIssueById(
  req: Request,
  res: Response,
): Promise<void> {
  let issue;
  if (req.user?.role === "STAFF") {
    issue = await issuesService.getStaffIssueById(
      req.params.issueId as string,
      req.user.departmentId,
    );
  } else {
    issue = await issuesService.getIssueById(req.params.issueId as string);
  }
  sendSuccess(res, 200, "Issue details retrieved successfully", issue);
}

export async function handleUpdateIssue(
  req: Request,
  res: Response,
): Promise<void> {
  let images = req.body.images;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    images = await processUploadedImages(
      req.files,
      "streetmend/issues",
      images || [],
    );
  }

  const updates = {
    ...req.body,
    ...(images !== undefined && { images }),
  };

  const updatedIssue = await issuesService.updateIssue(
    req.params.issueId as string,
    req.user!.id,
    updates,
  );
  sendSuccess(res, 200, "Issue updated successfully", updatedIssue);
}

export async function handleWithdrawIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await issuesService.withdrawIssue(
    req.params.issueId as string,
    req.user!.id,
    req.user!.role,
  );
  sendSuccess(res, 200, result.message);
}

export async function handleSupportIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await issuesService.supportIssue(
    req.params.issueId as string,
    req.user!.id,
  );
  sendSuccess(res, 200, result.message, { supportCount: result.supportCount });
}

export async function handleRemoveSupportIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await issuesService.removeSupportIssue(
    req.params.issueId as string,
    req.user!.id,
  );
  sendSuccess(res, 200, result.message, { supportCount: result.supportCount });
}

export async function handleFlagIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await issuesService.flagIssue(
    req.params.issueId as string,
    req.user!.id,
    req.body.reason,
  );
  sendSuccess(res, 201, result.message, { flagCount: result.flagCount });
}

export async function handleGetIssueHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const history = await issuesService.getIssueHistory(
    req.params.issueId as string,
  );
  sendSuccess(res, 200, "Issue status history retrieved successfully", history);
}

export async function handleGetActiveCategories(
  _req: Request,
  res: Response,
): Promise<void> {
  const categories = await issuesService.getActiveCategories();
  sendSuccess(
    res,
    200,
    "Active issue categories retrieved successfully",
    categories,
  );
}

export async function handleGetMyReports(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { issues, meta } = await issuesService.listIssues({
    page: query.page || 1,
    limit: query.limit || 20,
    status: query.status,
    sortBy: "createdAt",
    sortOrder: "desc",
    myReports: true,
    userId: req.user!.id,
  });
  sendSuccess(res, 200, "My reports retrieved successfully", issues, meta);
}

export async function handleListAllIssues(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { issues, meta } = await issuesService.listAllIssues({
    page: query.page || 1,
    limit: query.limit || 20,
    status: query.status,
    departmentId: query.departmentId,
    categoryId: query.categoryId,
    priority: query.priority,
    isFlagged: query.isFlagged,
    search: query.search,
  });
  sendSuccess(res, 200, "Issues retrieved successfully", issues, meta);
}

export async function handleAssignIssue(
  req: Request,
  res: Response,
): Promise<void> {
  const { assignedTo } = req.body;
  const updated = await issuesService.assignIssue(
    req.params.issueId as string,
    assignedTo,
    req.user!.id,
    req.user!.role,
  );
  sendSuccess(res, 200, "Issue assigned successfully", updated);
}

export async function handleUpdatePriority(
  req: Request,
  res: Response,
): Promise<void> {
  const { priority } = req.body;
  const updated = await issuesService.updateIssuePriority(
    req.params.issueId as string,
    priority,
    req.user!.id,
  );
  sendSuccess(res, 200, "Issue priority updated successfully", updated);
}

export async function handleAdminUpdateStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { status, reason } = req.body;
  const updated = await issuesService.adminUpdateIssueStatus(
    req.params.issueId as string,
    status,
    reason,
    req.user!.id,
  );
  sendSuccess(res, 200, "Issue status administratively updated", updated);
}

export async function handleUpdateIssueStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { status, reason } = req.body;
  let updated;
  if (req.user!.role === "ADMIN") {
    updated = await issuesService.adminUpdateIssueStatus(
      req.params.issueId as string,
      status,
      reason || "Administrative status transition",
      req.user!.id,
    );
  } else if (req.user!.role === "STAFF") {
    updated = await issuesService.updateStaffIssueStatus(
      req.params.issueId as string,
      req.user!.id,
      req.user!.departmentId,
      status,
      reason,
    );
  } else {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Forbidden. You do not have permission to update issue status",
    );
  }
  sendSuccess(res, 200, "Issue status updated successfully", updated);
}

export async function handleGetCategories(
  req: Request,
  res: Response,
): Promise<void> {
  if (req.user?.role === "ADMIN") {
    const categories = await issuesService.listCategories();
    sendSuccess(res, 200, "Categories retrieved successfully", categories);
  } else {
    const categories = await issuesService.getActiveCategories();
    sendSuccess(
      res,
      200,
      "Active categories retrieved successfully",
      categories,
    );
  }
}

export async function handleListCategories(
  _req: Request,
  res: Response,
): Promise<void> {
  const categories = await issuesService.listCategories();
  sendSuccess(res, 200, "Categories retrieved successfully", categories);
}

export async function handleCreateCategory(
  req: Request,
  res: Response,
): Promise<void> {
  const category = await issuesService.createCategory(req.body);
  sendSuccess(res, 201, "Category created successfully", category);
}

export async function handleUpdateCategory(
  req: Request,
  res: Response,
): Promise<void> {
  const category = await issuesService.updateCategory(
    req.params.categoryId as string,
    req.body,
  );
  sendSuccess(res, 200, "Category updated successfully", category);
}

export async function handleListStaffIssues(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { issues, meta } = await issuesService.listStaffIssues(
    req.user!.departmentId,
    {
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status,
      assignedTo: query.assignedTo,
      priority: query.priority,
    },
  );
  sendSuccess(
    res,
    200,
    "Department issues retrieved successfully",
    issues,
    meta,
  );
}

export async function handleGetStaffIssueById(
  req: Request,
  res: Response,
): Promise<void> {
  const issue = await issuesService.getStaffIssueById(
    req.params.issueId as string,
    req.user!.departmentId,
  );
  sendSuccess(
    res,
    200,
    "Department issue details retrieved successfully",
    issue,
  );
}

export async function handleUpdateStaffIssueStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { status, reason } = req.body;
  const updated = await issuesService.updateStaffIssueStatus(
    req.params.issueId as string,
    req.user!.id,
    req.user!.departmentId,
    status,
    reason,
  );
  sendSuccess(res, 200, "Issue status updated successfully", updated);
}

export async function handleSubmitResolution(
  req: Request,
  res: Response,
): Promise<void> {
  const resolutionImages = await processUploadedImages(
    req.files,
    "streetmend/resolutions",
    req.body.resolutionImages || [],
  );

  const resolved = await issuesService.submitResolution(
    req.params.issueId as string,
    req.user!.id,
    req.user!.departmentId,
    req.body.notes,
    resolutionImages,
  );

  sendSuccess(res, 200, "Resolution submitted successfully", resolved);
}

export async function handleGetMyAssignments(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { issues, meta } = await issuesService.getMyAssignments(req.user!.id, {
    page: query.page || 1,
    limit: query.limit || 20,
    status: query.status,
  });
  sendSuccess(res, 200, "Assigned issues retrieved successfully", issues, meta);
}
