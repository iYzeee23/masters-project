import { Router, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload/avatar
router.post(
  '/avatar',
  authMiddleware,
  upload.single('avatar'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Upload to Cloudinary
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'pathfinder-avatars',
            transformation: [
              { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve(result);
          },
        );
        stream.end(req.file!.buffer);
      });

      // Update user avatar URL
      await User.findByIdAndUpdate(req.userId, { avatarUrl: result.secure_url });

      res.json({ avatarUrl: result.secure_url });
    } catch (err) {
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

export default router;
