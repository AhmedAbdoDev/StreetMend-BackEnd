import { PaginationMeta } from "./response.js";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function calculatePagination(options?: PaginationOptions) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(100, options?.limit || 20));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    buildMeta: (total: number): PaginationMeta => ({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }),
  };
}
