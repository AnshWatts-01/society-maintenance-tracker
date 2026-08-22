import { prisma } from "@/lib/db/prisma";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES } from "@/lib/utils/constants";

export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoValidationError";
  }
}

/**
 * Content sniffing: the stored MIME type is derived from the file's actual
 * magic bytes, never from the client-declared Content-Type — so a script
 * renamed to `.jpg` is rejected here regardless of what the browser claims.
 */
export function sniffImageMime(bytes: Uint8Array): (typeof ALLOWED_PHOTO_MIME_TYPES)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function storePhoto(uploaderId: string, bytes: Uint8Array) {
  if (bytes.length === 0) throw new PhotoValidationError("The uploaded file is empty");
  if (bytes.length > MAX_PHOTO_SIZE_BYTES) {
    throw new PhotoValidationError(
      `Photo must be smaller than ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB`
    );
  }

  const mimeType = sniffImageMime(bytes);
  if (!mimeType) {
    throw new PhotoValidationError("Only JPEG, PNG, or WebP images are accepted");
  }

  return prisma.complaintPhoto.create({
    data: { uploaderId, mimeType, sizeBytes: bytes.length, data: Buffer.from(bytes) },
    select: { id: true, mimeType: true, sizeBytes: true },
  });
}

/**
 * Authorization for viewing: the uploader always may; an admin always may;
 * any other resident may not — photos can show flat interiors.
 */
export async function getPhotoForViewer(photoId: string, viewer: { id: string; role: string }) {
  const photo = await prisma.complaintPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return null;
  if (viewer.role !== "ADMIN" && photo.uploaderId !== viewer.id) return null;
  return photo;
}
