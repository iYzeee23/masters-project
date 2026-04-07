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

// Configure Cloudinary (lazy — env vars loaded by dotenv before routes are used)
let cloudinaryConfigured = false;
function ensureCloudinary() {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
  }
}

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

      ensureCloudinary();

      // Upload to Cloudinary
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'pathfinder-avatars',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            ],
            resource_type: 'image',
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
      console.error('Avatar upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

export default router;
