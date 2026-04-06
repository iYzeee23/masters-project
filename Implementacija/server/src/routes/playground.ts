import { Router, Response } from 'express';
import { z } from 'zod';
import { PlaygroundAttempt } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { io } from '../index';

const router = Router();

const createAttemptSchema = z.object({
  mapId: z.string(),
  userPath: z.array(z.tuple([z.number(), z.number()])),
  userDeclaredNoPath: z.boolean(),
  optimalCost: z.number().nullable(),
  userCost: z.number().nullable(),
  score: z.number(),
  breakdown: z.object({
    costPenalty: z.number(),
    invalidMovePenalty: z.number(),
    speedBonus: z.number(),
  }),
  timeSpentMs: z.number(),
});

// GET /api/playground/leaderboard
router.get('/leaderboard', async (_req, res: Response) => {
  try {
    const leaderboard = await PlaygroundAttempt.aggregate([
      {
        $group: {
          _id: '$userId',
          totalScore: { $sum: '$score' },
          attempts: { $sum: 1 },
          bestScore: { $max: '$score' },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.username',
          avatarUrl: '$user.avatarUrl',
          totalScore: 1,
          attempts: 1,
          bestScore: 1,
          avgScore: { $round: ['$avgScore', 1] },
        },
      },
    ]);
    res.json(leaderboard);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/playground/attempts
router.post('/attempts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const attempt = await PlaygroundAttempt.create({
      ...parsed.data,
      userId: req.userId,
    });

    // Emit leaderboard update via Socket.io
    io.emit('leaderboard:update', {
      userId: req.userId,
      score: parsed.data.score,
    });

    res.status(201).json(attempt);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/playground/my-attempts
router.get('/my-attempts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await PlaygroundAttempt.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('mapId', 'name');
    res.json(attempts);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
