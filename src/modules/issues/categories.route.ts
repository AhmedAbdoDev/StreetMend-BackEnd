import { Router } from "express";
import * as issuesController from "./issues.controller.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./issues.validation.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware.js";

const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  optionalAuthenticate,
  issuesController.handleGetCategories,
);

categoriesRouter.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCategorySchema),
  issuesController.handleCreateCategory,
);

categoriesRouter.patch(
  "/:categoryId",
  authenticate,
  authorize("ADMIN"),
  validate(updateCategorySchema),
  issuesController.handleUpdateCategory,
);

export default categoriesRouter;
