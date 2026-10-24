import Issue from "../../models/issue.model.js";
import User from "../../models/user.model.js";

export async function getAnalyticsOverview() {
  const [totalIssues, statusBreakdown, totalUsers, staffCount, flaggedCount] =
    await Promise.all([
      Issue.countDocuments({ isDeleted: false }),
      Issue.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "STAFF", isActive: true }),
      Issue.countDocuments({ isFlagged: true, isDeleted: false }),
    ]);

  const statusCounts: Record<string, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
  };

  statusBreakdown.forEach((group: any) => {
    if (statusCounts[group._id] !== undefined) {
      statusCounts[group._id] = group.count;
    }
  });

  const openIssues =
    statusCounts.SUBMITTED +
    statusCounts.UNDER_REVIEW +
    statusCounts.ACCEPTED +
    statusCounts.IN_PROGRESS +
    statusCounts.REOPENED;

  return {
    totalIssues,
    openIssues,
    resolvedIssues: statusCounts.RESOLVED + statusCounts.CLOSED,
    rejectedIssues: statusCounts.REJECTED,
    statusBreakdown: statusCounts,
    totalActiveUsers: totalUsers,
    totalActiveStaff: staffCount,
    flaggedIssuesCount: flaggedCount,
  };
}

export async function getAnalyticsCategories() {
  const [byCategory, byDepartment] = await Promise.all([
    Issue.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "issuecategories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$category.name", "Uncategorized"] },
          code: { $ifNull: ["$category.code", "UNKNOWN"] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),
    Issue.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$department.name", "Unassigned"] },
          code: { $ifNull: ["$department.code", "UNKNOWN"] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    byCategory,
    byDepartment,
  };
}

export async function getAnalyticsResolutionTime() {
  const result = await Issue.aggregate([
    {
      $match: {
        isDeleted: false,
        resolvedAt: { $ne: null },
      },
    },
    {
      $project: {
        departmentId: 1,
        durationHours: {
          $divide: [
            { $subtract: ["$resolvedAt", "$createdAt"] },
            1000 * 60 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        averageResolutionHours: { $avg: "$durationHours" },
        totalResolved: { $sum: 1 },
      },
    },
  ]);

  const departmentResult = await Issue.aggregate([
    {
      $match: {
        isDeleted: false,
        resolvedAt: { $ne: null },
      },
    },
    {
      $project: {
        departmentId: 1,
        durationHours: {
          $divide: [
            { $subtract: ["$resolvedAt", "$createdAt"] },
            1000 * 60 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$departmentId",
        averageResolutionHours: { $avg: "$durationHours" },
        resolvedCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "department",
      },
    },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        departmentName: { $ifNull: ["$department.name", "Unassigned"] },
        departmentCode: { $ifNull: ["$department.code", "UNKNOWN"] },
        averageResolutionHours: { $round: ["$averageResolutionHours", 2] },
        resolvedCount: 1,
      },
    },
    { $sort: { averageResolutionHours: 1 } },
  ]);

  const overallAvg =
    result.length > 0 && result[0].averageResolutionHours
      ? Math.round(result[0].averageResolutionHours * 100) / 100
      : 0;
  const totalResolved = result.length > 0 ? result[0].totalResolved : 0;

  return {
    overallAverageResolutionHours: overallAvg,
    totalResolvedReportsCount: totalResolved,
    byDepartment: departmentResult,
  };
}
