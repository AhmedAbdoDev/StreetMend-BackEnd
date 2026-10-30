import { Request, Response } from "express";
import * as healthService from "./health.service.js";

export async function handleGetHealth(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await healthService.getHealthStatus();
  const statusCode = result.status === "UP" ? 200 : 503;
  res.status(statusCode).json(result);
}
