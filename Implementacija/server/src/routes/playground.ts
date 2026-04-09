import { Router, Response } from 'express';
import { z } from 'zod';
import { PlaygroundAttempt } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const createAttemptSchema = z.object({
  mapId: z.string().optional(),
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

/** Recalculate score server-side to prevent tampering */
function validateScore(data: z.infer<typeof createAttemptSchema>): number {
  const { breakdown, userDeclaredNoPath, optimalCost, userCost } = data;

  // Clamp breakdown values to valid ranges
  const costPenalty = Math.max(0, Math.min(50, breakdown.costPenalty));
  const invalidMovePenalty = Math.max(0, Math.min(50, breakdown.invalidMovePenalty));
  const speedBonus = Math.max(0, Math.min(10, breakdown.speedBonus));

  if (userDeclaredNoPath && optimalCost === null) {
    // Correctly declared no path
    return Math.min(100, 100 + speedBonus);
  }
  if (userDeclaredNoPath && optimalCost !== null) {
    // Wrongly declared no path
    return 0;
  }

  return Math.max(0, Math.min(100, 100 - costPenalty - invalidMovePenalty + speedBonus));
}

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
  } catch (err) {
    console.error('[playground]', err);
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

    // Recalculate score server-side
    const validatedScore = validateScore(parsed.data);

    const attempt = await PlaygroundAttempt.create({
      ...parsed.data,
      score: validatedScore,
      breakdown: {
        costPenalty: Math.max(0, Math.min(50, parsed.data.breakdown.costPenalty)),
        invalidMovePenalty: Math.max(0, Math.min(50, parsed.data.breakdown.invalidMovePenalty)),
        speedBonus: Math.max(0, Math.min(10, parsed.data.breakdown.speedBonus)),
      },
      userId: req.userId,
    });

    // Emit leaderboard update via Socket.io
    req.app.locals.io?.emit('leaderboard:update', {
      userId: req.userId,
      score: validatedScore,
    });

    res.status(201).json(attempt);
  } catch (err) {
    console.error('[playground]', err);
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
  } catch (err) {
    console.error('[playground]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
