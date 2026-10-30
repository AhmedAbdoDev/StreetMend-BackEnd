import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import AppError from "../error/AppError.js";
import env from "../config/env.js";

export interface UploadResult {
  url: string;
  publicId: string;
}

export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = url.split("?")[0].split("#")[0];
  const prefix = "/image/upload/";
  const index = cleanUrl.indexOf(prefix);
  if (index === -1) return null;
  let remainder = cleanUrl.substring(index + prefix.length);
  remainder = remainder.replace(/^v\d+\//, "");
  const lastDot = remainder.lastIndexOf(".");
  if (lastDot !== -1) {
    remainder = remainder.substring(0, lastDot);
  }
  return remainder || null;
}

export async function uploadImage(
  fileBuffer: Buffer,
  folder: string = "streetmend/issues",
): Promise<UploadResult> {
  if (!fileBuffer || !fileBuffer.length) {
    throw new AppError(
      400,
      "INVALID_FILE_BUFFER",
      "File buffer is empty or invalid",
    );
  }

  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    const mockId = `${folder}/mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
      url: `https://res.cloudinary.com/streetmend/image/upload/v1/${mockId}.jpg`,
      publicId: mockId,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new AppError(
              500,
              "CLOUDINARY_UPLOAD_ERROR",
              error?.message || "Failed to upload image to Cloudinary",
            ),
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

export async function uploadMultipleImages(
  fileBuffers: Buffer[],
  folder: string = "streetmend/issues",
): Promise<UploadResult[]> {
  if (!fileBuffers || fileBuffers.length === 0) {
    return [];
  }

  const uploadedResults: UploadResult[] = [];

  try {
    const uploadPromises = fileBuffers.map((buf) => uploadImage(buf, folder));
    const results = await Promise.all(uploadPromises);
    uploadedResults.push(...results);
    return results;
  } catch (error) {
    if (uploadedResults.length > 0) {
      await cleanupUploadedImages(uploadedResults.map((r) => r.publicId));
    }
    throw error;
  }
}

export async function deleteImage(publicIdOrUrl: string): Promise<void> {
  if (!publicIdOrUrl) return;

  const publicId = publicIdOrUrl.includes("http")
    ? extractPublicIdFromUrl(publicIdOrUrl)
    : publicIdOrUrl;

  if (!publicId) return;

  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err: any) {
    console.error(`[Media Service] Failed to delete image ${publicId}:`, err);
  }
}

export async function cleanupUploadedImages(
  publicIds: string[],
): Promise<void> {
  if (!publicIds || publicIds.length === 0) return;
  await Promise.allSettled(publicIds.map((id) => deleteImage(id)));
}
