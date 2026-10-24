import multer, { FileFilterCallback } from "multer";
import { Request, Response, NextFunction } from "express";
import AppError from "../error/AppError.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(
      new AppError(
        400,
        "INVALID_FILE_TYPE",
        `Invalid file type (${file.mimetype}). Allowed types: JPG, JPEG, PNG, WEBP`,
      ) as unknown as null,
      false,
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadSingleImage = (fieldname: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const singleUpload = upload.single(fieldname);

    singleUpload(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new AppError(
                400,
                "FILE_TOO_LARGE",
                "Uploaded file exceeds maximum allowed size of 5MB",
              ),
            );
          }
          return next(new AppError(400, "MULTER_UPLOAD_ERROR", err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

export const uploadMultipleImages = (
  fieldname: string,
  maxCount: number = 5,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const arrayUpload = upload.array(fieldname, maxCount);

    arrayUpload(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new AppError(
                400,
                "FILE_TOO_LARGE",
                "One or more uploaded files exceed maximum allowed size of 5MB",
              ),
            );
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return next(
              new AppError(
                400,
                "TOO_MANY_FILES",
                `Exceeded maximum allowed files count (${maxCount})`,
              ),
            );
          }
          return next(new AppError(400, "MULTER_UPLOAD_ERROR", err.message));
        }
        return next(err);
      }
      next();
    });
  };
};
