import { Request, Response } from "express";
import * as usersService from "./users.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function handleListUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as any;
  const { users, meta } = await usersService.listUsers({
    page: query.page || 1,
    limit: query.limit || 20,
    role: query.role,
    departmentId: query.departmentId,
    isActive: query.isActive,
    search: query.search,
  });
  sendSuccess(res, 200, "Users retrieved successfully", users, meta);
}

export async function handleUpdateUserRole(
  req: Request,
  res: Response,
): Promise<void> {
  const updated = await usersService.updateUserRole(
    req.params.userId as string,
    req.body.role,
  );
  sendSuccess(res, 200, "User role updated successfully", updated);
}

export async function handleUpdateUserStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const updated = await usersService.updateUserStatus(
    req.params.userId as string,
    req.body.isActive,
  );
  sendSuccess(res, 200, "User status updated successfully", updated);
}

export async function handleUpdateUserDepartment(
  req: Request,
  res: Response,
): Promise<void> {
  const updated = await usersService.updateUserDepartment(
    req.params.userId as string,
    req.body.departmentId,
  );
  sendSuccess(res, 200, "User department updated successfully", updated);
}
