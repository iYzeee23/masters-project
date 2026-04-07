import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6).max(100),
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

    const { username, email, password } = parsed.data;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, passwordHash });

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
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

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
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
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
