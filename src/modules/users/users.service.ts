import { Types } from "mongoose";
import Department from "../../models/department.model.js";
import User, { UserRole } from "../../models/user.model.js";
import AppError from "../../error/AppError.js";
import { mapUserResponse } from "../auth/auth.service.js";
import { calculatePagination } from "../../utils/pagination.js";
import { escapeRegex } from "../../utils/validation.js";

async function findUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }
  return user;
}

async function ensureNotLastActiveAdmin(
  user: any,
  action: "demote" | "deactivate",
) {
  if (user.role === "ADMIN") {
    const adminCount = await User.countDocuments({
      role: "ADMIN",
      isActive: true,
    });
    if (adminCount <= 1) {
      const code =
        action === "demote"
          ? "CANNOT_DEMOTE_LAST_ADMIN"
          : "CANNOT_DEACTIVATE_LAST_ADMIN";
      const message =
        action === "demote"
          ? "Cannot demote the only remaining active Administrator"
          : "Cannot deactivate the only remaining active Administrator";
      throw new AppError(400, code, message);
    }
  }
}

export async function listUsers(options: {
  page?: number;
  limit?: number;
  role?: string;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
}) {
  const filter: any = {};

  if (options.role) filter.role = options.role;
  if (options.departmentId)
    filter.departmentId = new Types.ObjectId(options.departmentId);
  if (options.isActive !== undefined) filter.isActive = options.isActive;

  if (options.search) {
    const searchRegex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const { page, limit, skip, buildMeta } = calculatePagination(options);

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .populate("departmentId", "name code")
      .select(
        "name email role departmentId departmentPosition isActive staffApprovalStatus phone createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    users,
    meta: buildMeta(total),
  };
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  const user = await findUserById(userId);

  if (newRole !== "ADMIN") {
    await ensureNotLastActiveAdmin(user, "demote");
  }

  if (newRole !== "STAFF") {
    await Department.updateMany(
      { ownerId: user._id },
      { $set: { ownerId: null } },
    );
    user.departmentId = null;
    user.departmentPosition = null;
    user.staffApprovalStatus = null;
  }

  user.role = newRole;
  await user.save();

  return mapUserResponse(user);
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const user = await findUserById(userId);

  if (!isActive) {
    await ensureNotLastActiveAdmin(user, "deactivate");
    if (user.departmentPosition === "OWNER") {
      await Department.updateMany(
        { ownerId: user._id },
        { $set: { ownerId: null } },
      );
      user.departmentPosition = "MEMBER";
    }
  }

  user.isActive = isActive;
  await user.save();

  return mapUserResponse(user);
}

export async function updateUserDepartment(
  userId: string,
  departmentId: string,
) {
  const user = await findUserById(userId);

  if (user.role !== "STAFF") {
    throw new AppError(
      400,
      "INVALID_USER_ROLE",
      "Only staff members can be assigned to a department",
    );
  }

  const department = await Department.findOne({
    _id: departmentId,
    isActive: true,
  });
  if (!department) {
    throw new AppError(
      404,
      "DEPARTMENT_NOT_FOUND",
      "Active department not found",
    );
  }

  await Department.updateMany(
    { ownerId: user._id },
    { $set: { ownerId: null } },
  );

  user.departmentId = department._id;
  user.departmentPosition = "MEMBER";
  await user.save();

  return mapUserResponse(user);
}
