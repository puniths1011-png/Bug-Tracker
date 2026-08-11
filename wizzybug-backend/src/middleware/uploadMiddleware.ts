import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const optionalUpload = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.headers['content-type'] as string | undefined;
  if (contentType && contentType.includes('multipart/form-data')) {
    upload.single('image')(req, res, next);
    return;
  }
  next();
};
