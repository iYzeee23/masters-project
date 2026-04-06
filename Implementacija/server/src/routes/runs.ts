import { Router, Response } from 'express';
import { z } from 'zod';
import { Run } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const createRunSchema = z.object({
  mapId: z.string(),
  algorithm: z.string(),
  options: z.object({
    heuristic: z.string(),
    neighborMode: z.number(),
    swarmWeight: z.number().optional(),
  }),
  metrics: z.object({
    expandedNodes: z.number(),
    maxFrontierSize: z.number(),
    pathCost: z.number().nullable(),
    pathLength: z.number().nullable(),
    totalSteps: z.number(),
    executionTimeMs: z.number(),
    foundPath: z.boolean(),
  }),
});

// GET /api/runs — list user's runs
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mapId, algorithm, limit = '50' } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };
    if (mapId) filter.mapId = String(mapId);
    if (algorithm) filter.algorithm = String(algorithm);

    const runs = await Run.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit as string, 10), 200))
      .populate('mapId', 'name rows cols');
    res.json(runs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/runs
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createRunSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const run = await Run.create({
      ...parsed.data,
      userId: req.userId,
    });
    res.status(201).json(run);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/runs/compare?mapId=xxx
router.get('/compare', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mapId } = req.query;
    if (!mapId) {
      res.status(400).json({ error: 'mapId required' });
      return;
    }

    const runs = await Run.find({ mapId: String(mapId), userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(runs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/runs/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await Run.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json({ message: 'Run deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
