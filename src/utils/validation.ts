import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const paginationQuerySchema = {
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20,
    ),
};

export function objectIdParamSchema(
  paramName: string = "id",
  message: string = "Invalid ID format",
) {
  return z.object({
    params: z.object({
      [paramName]: z.string().regex(objectIdRegex, message),
    }),
  });
}

export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
