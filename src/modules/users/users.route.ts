import { Router } from "express";
import * as usersController from "./users.controller.js";
import {
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateUserDepartmentSchema,
} from "./users.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const usersRouter = Router();

usersRouter.use(authenticate, authorize("ADMIN"));

usersRouter.get(
  "/",
  validate(listUsersSchema),
  usersController.handleListUsers,
);

usersRouter.patch(
  "/:userId/role",
  validate(updateUserRoleSchema),
  usersController.handleUpdateUserRole,
);

usersRouter.patch(
  "/:userId/status",
  validate(updateUserStatusSchema),
  usersController.handleUpdateUserStatus,
);

usersRouter.patch(
  "/:userId/department",
  validate(updateUserDepartmentSchema),
  usersController.handleUpdateUserDepartment,
);

export default usersRouter;
