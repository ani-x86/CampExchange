/**
 * upload.service.ts
 * Image processing pipeline: multer → sharp (MIME check, 5 MB cap, EXIF strip, WebP)
 * → Cloudinary (if configured) or local /uploads (fallback).
 *
 * Payment proofs are stored as 'private' on Cloudinary so they are never
 * publicly accessible. Proof URLs are served via /api/orders/:id/proof-url
 * which checks buyer/seller authorisation before generating a signed URL.
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env, cloudinaryEnabled } from '../../config/env.js';
import { uploadToCloudinary } from './cloudinary.service.js';

export interface ProcessedUpload {
  /** Full-resolution URL (Cloudinary secure_url or local path) */
  url: string;
  /** 400 px thumbnail URL */
  thumbUrl: string;
  /**
   * Cloudinary public_id when stored there; null for local uploads.
   * Needed to generate signed proof URLs later.
   */
  cloudinaryPublicId: string | null;
  /** Where the file ended up */
  storage: 'cloudinary' | 'local';
}

const CLOUDINARY_FOLDERS: Record<string, string> = {
  listing: 'camp-exchange/listings',
  avatar: 'camp-exchange/avatars',
  proof: 'camp-exchange/proofs',
};

export const processImage = async (
  buffer: Buffer,
  kind: 'listing' | 'avatar' | 'proof' = 'listing'
): Promise<ProcessedUpload> => {
  // ── 1. Sharp pipeline (always runs) ────────────────────────────────────────
  // Full image: max 1200 px, WebP quality 80, EXIF stripped (sharp default)
  const fullBuffer = await sharp(buffer)
    .rotate() // auto-orient before stripping EXIF
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Thumbnail: max 400 px, WebP quality 75
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  // ── 2a. Cloudinary path ────────────────────────────────────────────────────
  if (cloudinaryEnabled) {
    try {
      const folder = CLOUDINARY_FOLDERS[kind] ?? 'camp-exchange/other';
      const delivery = kind === 'proof' ? 'private' : 'upload';

      // Upload full image
      const { url, publicId } = await uploadToCloudinary(fullBuffer, folder, delivery);

      // Upload thumbnail separately so we have an independent URL
      // (for proofs the thumb is also private)
      const thumbResult = await uploadToCloudinary(
        thumbBuffer,
        `${folder}/thumbs`,
        delivery
      );

      return {
        url,
        thumbUrl: thumbResult.url,
        cloudinaryPublicId: publicId,
        storage: 'cloudinary',
      };
    } catch (err) {
      // Cloudinary error → fall through to local storage
      console.error('[upload] Cloudinary upload failed, falling back to local storage:', (err as Error).message);
    }
  }

  // ── 2b. Local fallback ─────────────────────────────────────────────────────
  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileId = crypto.randomUUID();
  const fullFilename = `${fileId}.webp`;
  const thumbFilename = `${fileId}_thumb.webp`;
  const fullPath = path.join(uploadDir, fullFilename);
  const thumbPath = path.join(uploadDir, thumbFilename);

  await fs.promises.writeFile(fullPath, fullBuffer);
  await fs.promises.writeFile(thumbPath, thumbBuffer);

  return {
    url: `/uploads/${fullFilename}`,
    thumbUrl: `/uploads/${thumbFilename}`,
    cloudinaryPublicId: null,
    storage: 'local',
  };
};
