import { Router } from "express";
import * as issuesController from "./issues.controller.js";
import {
  createIssueSchema,
  updateIssueSchema,
  issueIdParamSchema,
  flagIssueSchema,
  listIssuesSchema,
  assignIssueSchema,
  updatePrioritySchema,
  updateIssueStatusSchema,
  submitResolutionSchema,
  listStaffIssuesSchema,
} from "./issues.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
  requireDepartmentOwner,
} from "../../middlewares/auth.middleware.js";
import { uploadMultipleImages } from "../../middlewares/upload.middleware.js";
import { issueCreationLimiter } from "../../middlewares/rateLimiter.middleware.js";

const issuesRouter = Router();

issuesRouter.get(
  "/me/reports",
  authenticate,
  authorize("CITIZEN"),
  issuesController.handleGetMyReports,
);

issuesRouter.get(
  "/me/assignments",
  authenticate,
  authorize("STAFF"),
  issuesController.handleGetMyAssignments,
);

issuesRouter.get(
  "/department",
  authenticate,
  authorize("STAFF"),
  validate(listStaffIssuesSchema),
  issuesController.handleListStaffIssues,
);

issuesRouter.get(
  "/department/:issueId",
  authenticate,
  authorize("STAFF"),
  validate(issueIdParamSchema),
  issuesController.handleGetDepartmentIssueById,
);

issuesRouter.post(
  "/",
  issueCreationLimiter,
  authenticate,
  authorize("CITIZEN"),
  uploadMultipleImages("images", 5),
  validate(createIssueSchema),
  issuesController.handleCreateIssue,
);

issuesRouter.get(
  "/",
  optionalAuthenticate,
  validate(listIssuesSchema),
  issuesController.handleListIssues,
);

issuesRouter.get(
  "/:issueId",
  optionalAuthenticate,
  validate(issueIdParamSchema),
  issuesController.handleGetIssueById,
);

issuesRouter.patch(
  "/:issueId",
  authenticate,
  authorize("CITIZEN"),
  uploadMultipleImages("images", 5),
  validate(updateIssueSchema),
  issuesController.handleUpdateIssue,
);

issuesRouter.delete(
  "/:issueId",
  authenticate,
  authorize("CITIZEN", "ADMIN"),
  validate(issueIdParamSchema),
  issuesController.handleWithdrawIssue,
);

issuesRouter.post(
  "/:issueId/support",
  authenticate,
  authorize("CITIZEN"),
  validate(issueIdParamSchema),
  issuesController.handleSupportIssue,
);

issuesRouter.delete(
  "/:issueId/support",
  authenticate,
  authorize("CITIZEN"),
  validate(issueIdParamSchema),
  issuesController.handleRemoveSupportIssue,
);

issuesRouter.post(
  "/:issueId/flags",
  authenticate,
  authorize("CITIZEN"),
  validate(flagIssueSchema),
  issuesController.handleFlagIssue,
);

issuesRouter.get(
  "/:issueId/history",
  validate(issueIdParamSchema),
  issuesController.handleGetIssueHistory,
);

issuesRouter.patch(
  "/:issueId/assign",
  authenticate,
  authorize("ADMIN", "STAFF"),
  requireDepartmentOwner,
  validate(assignIssueSchema),
  issuesController.handleAssignIssue,
);

issuesRouter.patch(
  "/:issueId/priority",
  authenticate,
  authorize("ADMIN"),
  validate(updatePrioritySchema),
  issuesController.handleUpdatePriority,
);

issuesRouter.patch(
  "/:issueId/status",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validate(updateIssueStatusSchema),
  issuesController.handleUpdateIssueStatus,
);

issuesRouter.patch(
  "/:issueId/resolution",
  authenticate,
  authorize("STAFF"),
  uploadMultipleImages("resolutionImages", 5),
  validate(submitResolutionSchema),
  issuesController.handleSubmitResolution,
);

export default issuesRouter;
