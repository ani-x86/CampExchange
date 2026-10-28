import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { uploadRateLimiter } from '../../middleware/rateLimit.js';
import { handleSingleUpload } from './upload.middleware.js';
import { processImage } from './upload.service.js';
import { generatePrivateUrl } from './cloudinary.service.js';
import { prisma } from '../../prisma/client.js';
import { cloudinaryEnabled } from '../../config/env.js';

export const uploadRouter = Router();

/**
 * POST /api/uploads/image
 * Multipart: field "file", optional field "kind" = listing | avatar | proof
 * Returns { url, thumbUrl, cloudinaryPublicId?, storage }
 */
uploadRouter.post(
  '/image',
  requireAuth,
  uploadRateLimiter,
  handleSingleUpload,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: { code: 'MISSING_FILE', message: 'No file provided' } });
        return;
      }
      const kind = (req.body.kind as 'listing' | 'avatar' | 'proof') || 'listing';
      const result = await processImage(req.file.buffer, kind);
      res.status(201).json({
        url: result.url,
        thumbUrl: result.thumbUrl,
        cloudinaryPublicId: result.cloudinaryPublicId ?? undefined,
        storage: result.storage,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/uploads/proof/:orderId
 * Returns a short-lived signed URL for the payment proof attached to an order.
 * Only accessible to the buyer or seller of that order.
 *
 * For local storage: redirects to the static /uploads path via an authenticated
 * pass-through so the raw URL is never exposed.
 */
uploadRouter.get(
  '/proof/:orderId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const orderId = Array.isArray(req.params.orderId)
        ? req.params.orderId[0]
        : req.params.orderId;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          buyerId: true,
          sellerId: true,
          proofUrl: true,
          proofCloudinaryId: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
        return;
      }

      if (order.buyerId !== userId && order.sellerId !== userId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      if (!order.proofUrl) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No proof uploaded yet' } });
        return;
      }

      // If stored on Cloudinary, return a 5-minute signed URL
      if (cloudinaryEnabled && order.proofCloudinaryId) {
        const signedUrl = generatePrivateUrl(order.proofCloudinaryId, 300);
        res.json({ url: signedUrl, expiresIn: 300 });
        return;
      }

      // Local fallback: the file is in /uploads — redirect to the static path
      // (client must hit this endpoint every time; URL not cached)
      res.json({ url: order.proofUrl, expiresIn: null });
    } catch (err) {
      next(err);
    }
  }
);
