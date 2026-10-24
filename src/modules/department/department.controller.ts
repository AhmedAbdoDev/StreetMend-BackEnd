import { Request, Response } from "express";
import * as departmentService from "./department.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function handleGetMyStaffRequests(
  req: Request,
  res: Response,
): Promise<void> {
  const status = req.query.status as string | undefined;
  const requests = await departmentService.getMyStaffRequests(
    req.user!.id,
    status,
  );
  sendSuccess(
    res,
    200,
    "Pending staff requests retrieved successfully",
    requests,
  );
}

export async function handleApproveStaffRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const requestId = req.params.requestId as string;
  const result = await departmentService.approveStaffRequest(
    requestId,
    req.user!.id,
    req.user!.role,
  );
  sendSuccess(res, 200, result.message, result);
}

export async function handleRejectStaffRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const requestId = req.params.requestId as string;
  const { reason } = req.body;
  const result = await departmentService.rejectStaffRequest(
    requestId,
    reason,
    req.user!.id,
    req.user!.role,
  );
  sendSuccess(res, 200, result.message, result);
}

export async function handleGetMyMembers(
  req: Request,
  res: Response,
): Promise<void> {
  const page = (req.query.page as unknown as number) || 1;
  const limit = (req.query.limit as unknown as number) || 20;
  const { members, meta } = await departmentService.getMyDepartmentMembers(
    req.user!.id,
    page,
    limit,
  );
  sendSuccess(
    res,
    200,
    "Department members retrieved successfully",
    members,
    meta,
  );
}

export async function handleGetDepartments(
  req: Request,
  res: Response,
): Promise<void> {
  if (req.user?.role === "ADMIN") {
    const departments = await departmentService.listDepartments();
    sendSuccess(res, 200, "Departments retrieved successfully", departments);
  } else {
    const departments = await departmentService.getPublicDepartments();
    sendSuccess(
      res,
      200,
      "Active departments retrieved successfully",
      departments,
    );
  }
}

export async function handleGetPublicDepartments(
  _req: Request,
  res: Response,
): Promise<void> {
  const departments = await departmentService.getPublicDepartments();
  sendSuccess(
    res,
    200,
    "Active departments retrieved successfully",
    departments,
  );
}

export async function handleListDepartments(
  _req: Request,
  res: Response,
): Promise<void> {
  const departments = await departmentService.listDepartments();
  sendSuccess(res, 200, "Departments retrieved successfully", departments);
}

export async function handleCreateDepartment(
  req: Request,
  res: Response,
): Promise<void> {
  const department = await departmentService.createDepartment(req.body);
  sendSuccess(res, 201, "Department created successfully", department);
}

export async function handleUpdateDepartment(
  req: Request,
  res: Response,
): Promise<void> {
  const department = await departmentService.updateDepartment(
    req.params.departmentId as string,
    req.body,
  );
  sendSuccess(res, 200, "Department updated successfully", department);
}

export async function handleSetDepartmentOwner(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await departmentService.setDepartmentOwner(
    req.params.departmentId as string,
    req.body.ownerId,
  );
  sendSuccess(res, 200, "Department owner appointed successfully", result);
}

export async function handleListGlobalStaffRequests(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const requests = await departmentService.listGlobalStaffRequests({
    status: query.status,
    departmentId: query.departmentId,
  });
  sendSuccess(
    res,
    200,
    "Global staff requests retrieved successfully",
    requests,
  );
}
