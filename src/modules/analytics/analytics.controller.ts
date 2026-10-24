import { Request, Response } from "express";
import * as analyticsService from "./analytics.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function handleGetAnalyticsOverview(
  _req: Request,
  res: Response,
): Promise<void> {
  const data = await analyticsService.getAnalyticsOverview();
  sendSuccess(res, 200, "Analytics overview retrieved successfully", data);
}

export async function handleGetAnalyticsCategories(
  _req: Request,
  res: Response,
): Promise<void> {
  const data = await analyticsService.getAnalyticsCategories();
  sendSuccess(res, 200, "Category analytics retrieved successfully", data);
}

export async function handleGetAnalyticsResolutionTime(
  _req: Request,
  res: Response,
): Promise<void> {
  const data = await analyticsService.getAnalyticsResolutionTime();
  sendSuccess(
    res,
    200,
    "Resolution time analytics retrieved successfully",
    data,
  );
}
