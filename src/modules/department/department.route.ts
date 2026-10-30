import { Router } from "express";
import * as departmentController from "./department.controller.js";
import {
  approveStaffSchema,
  rejectStaffSchema,
  listMembersSchema,
  listStaffRequestsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  setDepartmentOwnerSchema,
} from "./department.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
  requireDepartmentOwner,
} from "../../middlewares/auth.middleware.js";

const departmentRouter = Router();

departmentRouter.get(
  "/",
  optionalAuthenticate,
  departmentController.handleGetDepartments,
);

departmentRouter.get(
  "/staff-requests",
  authenticate,
  authorize("ADMIN"),
  departmentController.handleListGlobalStaffRequests,
);

departmentRouter.get(
  "/me/staff-requests",
  authenticate,
  authorize("STAFF"),
  requireDepartmentOwner,
  validate(listStaffRequestsSchema),
  departmentController.handleGetMyStaffRequests,
);

departmentRouter.patch(
  "/staff-requests/:requestId/approve",
  authenticate,
  authorize("STAFF", "ADMIN"),
  requireDepartmentOwner,
  validate(approveStaffSchema),
  departmentController.handleApproveStaffRequest,
);

departmentRouter.patch(
  "/staff-requests/:requestId/reject",
  authenticate,
  authorize("STAFF", "ADMIN"),
  requireDepartmentOwner,
  validate(rejectStaffSchema),
  departmentController.handleRejectStaffRequest,
);

departmentRouter.get(
  "/me/members",
  authenticate,
  authorize("STAFF"),
  requireDepartmentOwner,
  validate(listMembersSchema),
  departmentController.handleGetMyMembers,
);

departmentRouter.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createDepartmentSchema),
  departmentController.handleCreateDepartment,
);

departmentRouter.patch(
  "/:departmentId",
  authenticate,
  authorize("ADMIN"),
  validate(updateDepartmentSchema),
  departmentController.handleUpdateDepartment,
);

departmentRouter.patch(
  "/:departmentId/owner",
  authenticate,
  authorize("ADMIN"),
  validate(setDepartmentOwnerSchema),
  departmentController.handleSetDepartmentOwner,
);

export default departmentRouter;
