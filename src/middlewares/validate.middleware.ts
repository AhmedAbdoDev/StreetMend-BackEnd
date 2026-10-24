import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, ZodIssue } from "zod";
import AppError from "../error/AppError.js";

export function validate(schema: ZodSchema) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = {
        body: req.body,
        params: req.params,
        query: req.query,
      };

      let parsed: any;
      try {
        parsed = await schema.parseAsync(input);
      } catch (err) {
        if (err instanceof ZodError) {
          try {
            parsed = { body: await schema.parseAsync(req.body) };
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.query !== undefined) {
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, parsed.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            "Invalid request data",
            details,
          ),
        );
      }
      return next(error as Error);
    }
  };
}

export default validate;
