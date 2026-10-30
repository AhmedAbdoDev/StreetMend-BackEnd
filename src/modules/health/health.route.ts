import { Router } from "express";
import * as healthController from "./health.controller.js";

const healthRouter = Router();

healthRouter.get("/", healthController.handleGetHealth);

export default healthRouter;
