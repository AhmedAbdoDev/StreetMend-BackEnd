import { Types } from "mongoose";
import Department from "../../models/department.model.js";
import StaffRequest from "../../models/staffRequest.model.js";
import User from "../../models/user.model.js";
import AppError from "../../error/AppError.js";
import { mapUserResponse } from "../auth/auth.service.js";
import { calculatePagination } from "../../utils/pagination.js";
import {
  sendStaffApprovedEmail,
  sendStaffRejectedEmail,
} from "../../services/email.service.js";
import { withTransaction } from "../../utils/transaction.js";
import { createNotification } from "../notifications/notifications.service.js";

export async function getDepartmentForOwner(ownerId: string) {
  const department = await Department.findOne({
    ownerId: new Types.ObjectId(ownerId),
    isActive: true,
  });
  if (!department) {
    throw new AppError(
      403,
      "NOT_A_DEPARTMENT_OWNER",
      "Authenticated user is not registered as an active Department Owner",
    );
  }
  return department;
}

async function getPendingStaffRequest(
  requestId: string,
  callerId: string,
  callerRole: string,
) {
  const request = await StaffRequest.findById(requestId);
  if (!request) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Staff registration request not found",
    );
  }

  if (request.status !== "PENDING") {
    throw new AppError(
      400,
      "REQUEST_ALREADY_PROCESSED",
      `Staff registration request is already ${request.status}`,
    );
  }

  let deptName = "Municipal Department";
  if (callerRole !== "ADMIN") {
    const department = await Department.findOne({
      _id: request.departmentId,
      ownerId: new Types.ObjectId(callerId),
    });
    if (!department) {
      throw new AppError(
        403,
        "DEPARTMENT_ACCESS_FORBIDDEN",
        "You can only process staff registration requests for your own department",
      );
    }
    deptName = department.name || deptName;
  }

  return { request, deptName };
}

export async function getMyStaffRequests(
  ownerId: string,
  statusFilter?: string,
) {
  const department = await getDepartmentForOwner(ownerId);

  const query: any = { departmentId: department._id };
  if (statusFilter) {
    query.status = statusFilter;
  }

  const requests = await StaffRequest.find(query)
    .populate(
      "applicantId",
      "name email phone role departmentPosition staffApprovalStatus createdAt",
    )
    .sort({ createdAt: -1 });

  return requests;
}

export async function approveStaffRequest(
  requestId: string,
  callerId: string,
  callerRole: string,
) {
  const { request, deptName } = await getPendingStaffRequest(
    requestId,
    callerId,
    callerRole,
  );

  const applicant = await User.findById(request.applicantId);
  if (!applicant) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "Applicant user record not found",
    );
  }

  await withTransaction(async (session) => {
    request.status = "APPROVED";
    request.reviewedBy = new Types.ObjectId(callerId);
    request.reviewedAt = new Date();
    await request.save({ session });

    applicant.isActive = true;
    applicant.staffApprovalStatus = "APPROVED";
    applicant.rejectionReason = undefined;
    await applicant.save({ session });
  });

  await sendStaffApprovedEmail(applicant.email, applicant.name, deptName);

  createNotification({
    recipientId: applicant._id.toString(),
    type: "STAFF_REQUEST_APPROVED",
    title: "Staff Registration Approved",
    message: `Congratulations! Your staff registration for ${deptName} has been approved.`,
  }).catch(() => {});

  return {
    message: "Staff registration approved successfully",
    request,
    user: mapUserResponse(applicant),
  };
}

export async function rejectStaffRequest(
  requestId: string,
  reason: string,
  callerId: string,
  callerRole: string,
) {
  const { request, deptName } = await getPendingStaffRequest(
    requestId,
    callerId,
    callerRole,
  );

  const applicant = await User.findById(request.applicantId);

  await withTransaction(async (session) => {
    request.status = "REJECTED";
    request.rejectionReason = reason;
    request.reviewedBy = new Types.ObjectId(callerId);
    request.reviewedAt = new Date();
    await request.save({ session });

    if (applicant) {
      applicant.isActive = false;
      applicant.staffApprovalStatus = "REJECTED";
      applicant.rejectionReason = reason;
      await applicant.save({ session });
    }
  });

  if (applicant) {
    await sendStaffRejectedEmail(
      applicant.email,
      applicant.name,
      deptName,
      reason,
    );

    createNotification({
      recipientId: applicant._id.toString(),
      type: "STAFF_REQUEST_REJECTED",
      title: "Staff Registration Rejected",
      message: `Your staff registration for ${deptName} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    }).catch(() => {});
  }

  return {
    message: "Staff registration request rejected",
    request,
  };
}

export async function getMyDepartmentMembers(
  ownerId: string,
  page: number = 1,
  limit: number = 20,
) {
  const department = await getDepartmentForOwner(ownerId);

  const query = {
    departmentId: department._id,
    role: "STAFF",
    isActive: true,
  };

  const { skip, buildMeta } = calculatePagination({ page, limit });
  const [total, members] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select(
        "name email phone role departmentPosition staffApprovalStatus createdAt",
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
  ]);

  return {
    members,
    meta: buildMeta(total),
  };
}

export async function getPublicDepartments() {
  const departments = await Department.find({ isActive: true })
    .select("name code _id")
    .sort({ name: 1 });
  return departments;
}

export async function listDepartments() {
  const departments = await Department.find()
    .populate("ownerId", "name email phone")
    .sort({ name: 1 });

  const deptIds = departments.map((d) => d._id);

  const [staffCounts, pendingCounts] = await Promise.all([
    User.aggregate([
      {
        $match: {
          departmentId: { $in: deptIds },
          role: "STAFF",
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$departmentId",
          count: { $sum: 1 },
        },
      },
    ]),
    StaffRequest.aggregate([
      {
        $match: {
          departmentId: { $in: deptIds },
          status: "PENDING",
        },
      },
      {
        $group: {
          _id: "$departmentId",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const staffCountMap = new Map(
    staffCounts.map((item) => [item._id.toString(), item.count]),
  );
  const pendingCountMap = new Map(
    pendingCounts.map((item) => [item._id.toString(), item.count]),
  );

  return departments.map((dept) => ({
    ...dept.toObject(),
    staffCount: staffCountMap.get(dept._id.toString()) || 0,
    pendingRequestsCount: pendingCountMap.get(dept._id.toString()) || 0,
  }));
}

export async function createDepartment(data: { name: string; code: string }) {
  const existing = await Department.findOne({
    $or: [{ name: data.name }, { code: data.code.toUpperCase() }],
  });
  if (existing) {
    throw new AppError(
      409,
      "DEPARTMENT_EXISTS",
      "Department with this name or code already exists",
    );
  }

  const department = await Department.create({
    name: data.name,
    code: data.code.toUpperCase(),
    isActive: true,
  });

  return department;
}

export async function updateDepartment(
  departmentId: string,
  data: { name?: string; code?: string; isActive?: boolean },
) {
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
  }

  if (data.name || data.code) {
    const conflict = await Department.findOne({
      _id: { $ne: department._id },
      $or: [
        ...(data.name ? [{ name: data.name }] : []),
        ...(data.code ? [{ code: data.code.toUpperCase() }] : []),
      ],
    });
    if (conflict) {
      throw new AppError(
        409,
        "DEPARTMENT_EXISTS",
        "Department with this name or code already exists",
      );
    }
  }

  if (data.name) department.name = data.name;
  if (data.code) department.code = data.code.toUpperCase();
  if (data.isActive !== undefined) department.isActive = data.isActive;

  await department.save();
  return department;
}

export async function setDepartmentOwner(
  departmentId: string,
  ownerId: string,
) {
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
  }

  const user = await User.findOne({
    _id: ownerId,
    role: "STAFF",
    isActive: true,
    staffApprovalStatus: "APPROVED",
  });

  if (!user) {
    throw new AppError(
      400,
      "INVALID_OWNER",
      "Owner must be an active, approved staff member",
    );
  }

  if (user.departmentId?.toString() !== department._id.toString()) {
    throw new AppError(
      400,
      "DEPARTMENT_MISMATCH",
      "Staff member must belong to the department they are appointed to own",
    );
  }

  await withTransaction(async (session) => {
    if (department.ownerId) {
      await User.findByIdAndUpdate(
        department.ownerId,
        { departmentPosition: "MEMBER" },
        { session },
      );
    }

    user.departmentPosition = "OWNER";
    await user.save({ session });

    department.ownerId = user._id;
    await department.save({ session });
  });

  createNotification({
    recipientId: user._id.toString(),
    type: "SYSTEM_ALERT",
    title: "Appointed Department Owner",
    message: `You have been appointed as the Department Owner for ${department.name}.`,
  }).catch(() => {});

  return {
    department,
    owner: mapUserResponse(user),
  };
}

export async function listGlobalStaffRequests(options: {
  status?: string;
  departmentId?: string;
}) {
  const filter: any = {};
  if (options.status) filter.status = options.status;
  if (options.departmentId)
    filter.departmentId = new Types.ObjectId(options.departmentId);

  const requests = await StaffRequest.find(filter)
    .populate(
      "applicantId",
      "name email phone role departmentPosition staffApprovalStatus createdAt",
    )
    .populate("departmentId", "name code")
    .populate("reviewedBy", "name")
    .sort({ createdAt: -1 });

  return requests;
}
