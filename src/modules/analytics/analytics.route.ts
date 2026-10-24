import { Router } from "express";
import * as analyticsController from "./analytics.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const analyticsRouter = Router();

analyticsRouter.use(authenticate, authorize("ADMIN"));

analyticsRouter.get(
  "/overview",
  analyticsController.handleGetAnalyticsOverview,
);

analyticsRouter.get(
  "/categories",
  analyticsController.handleGetAnalyticsCategories,
);

analyticsRouter.get(
  "/resolution-time",
  analyticsController.handleGetAnalyticsResolutionTime,
);

export default analyticsRouter;
