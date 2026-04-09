import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User, Run, MapModel, PlaygroundAttempt } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Rate limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  username: z.string().min(3).max(30).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6).max(100),
  firstName: z.string().max(50).trim().optional().default(''),
  lastName: z.string().max(50).trim().optional().default(''),
});

const loginSchema = z.object({
  username: z.string().min(3).trim(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const { username, email, password, firstName, lastName } = parsed.data;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, firstName, lastName, passwordHash });

    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ error: 'Server misconfiguration' }); return; }
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { username, password } = parsed.data;
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ error: 'Server misconfiguration' }); return; }
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [runs, maps, scoreAgg] = await Promise.all([
      Run.countDocuments({ userId: req.userId }),
      MapModel.countDocuments({ userId: req.userId }),
      PlaygroundAttempt.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
        { $group: { _id: null, totalScore: { $sum: '$score' } } },
      ]),
    ]);

    res.json({
      runs,
      maps,
      score: scoreAgg.length > 0 ? scoreAgg[0].totalScore : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
