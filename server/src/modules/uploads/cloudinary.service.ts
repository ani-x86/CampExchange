/**
 * cloudinary.service.ts
 * Wraps the Cloudinary SDK. Only initialised when all three keys are present.
 * If keys are missing the module exports null and callers fall back to local storage.
 */
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env, cloudinaryEnabled } from '../../config/env.js';

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type DeliveryType = 'upload' | 'private';

export interface CloudinaryUploadResult {
  url: string;
  thumbUrl: string;
  publicId: string;
}

/**
 * Upload a processed image Buffer to Cloudinary.
 *
 * @param buffer   Sharp-processed WebP buffer (EXIF already stripped)
 * @param folder   Cloudinary folder path (e.g. "listings", "proofs", "avatars")
 * @param delivery 'upload' for public, 'private' for payment proofs
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  delivery: DeliveryType = 'upload'
): Promise<CloudinaryUploadResult> => {
  if (!cloudinaryEnabled) {
    throw new Error('Cloudinary not configured');
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        type: delivery,
        // Strip any remaining metadata
        invalidate: true,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve(result);
      }
    );
    stream.end(buffer);
  });

  // Generate a 400px wide thumbnail via Cloudinary URL transformation
  const thumbUrl = cloudinary.url(result.public_id, {
    width: 400,
    crop: 'limit',
    format: 'webp',
    quality: 'auto',
    type: delivery,
    secure: true,
  });

  const fullUrl =
    delivery === 'private'
      ? cloudinary.url(result.public_id, {
          type: 'private',
          secure: true,
        })
      : result.secure_url;

  return {
    url: fullUrl,
    thumbUrl,
    publicId: result.public_id,
  };
};

/**
 * Generate a short-lived signed URL for a private Cloudinary asset.
 * Use this when serving payment proof to buyer/seller instead of exposing the stored URL.
 */
export const generatePrivateUrl = (publicId: string, expiresInSeconds = 300): string => {
  if (!cloudinaryEnabled) throw new Error('Cloudinary not configured');

  return cloudinary.url(publicId, {
    type: 'private',
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
};
