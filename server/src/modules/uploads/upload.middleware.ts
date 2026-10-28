import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';

const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_IMAGE_MB * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
}).single('file');

export const handleSingleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Image must be smaller than ${env.MAX_IMAGE_MB}MB`,
          },
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'INVALID_FILE',
          message: err.message || 'File upload failed',
        },
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'No image file uploaded',
        },
      });
      return;
    }
    next();
  });
};
