import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MapModel, Run, Trace, PlaygroundAttempt } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const createMapSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  rows: z.number().int().min(5).max(200),
  cols: z.number().int().min(5).max(200),
  gridData: z.object({
    walls: z.array(z.tuple([z.number(), z.number()])),
    weights: z.array(z.object({
      pos: z.tuple([z.number(), z.number()]),
      weight: z.number().min(0).max(10),
    })),
    start: z.tuple([z.number(), z.number()]),
    goal: z.tuple([z.number(), z.number()]),
  }),
  isPublic: z.boolean().optional(),
  generatorType: z.string().optional(),
  generatorParams: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/maps — list user's maps
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const maps = await MapModel.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('-gridData')
      .limit(100);
    res.json(maps);
  } catch (err) {
    console.error('[maps]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/maps/public — list public maps
router.get('/public', async (_req, res: Response) => {
  try {
    const maps = await MapModel.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .select('-gridData')
      .limit(50)
      .populate('userId', 'username');
    res.json(maps);
  } catch (err) {
    console.error('[maps]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/maps/:id — owner or public only
router.get('/:id', async (req, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const map = await MapModel.findById(req.params.id);
    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    if (!map.isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) { res.status(500).json({ error: 'Server misconfiguration' }); return; }
        const decoded = jwt.verify(authHeader.slice(7), secret) as { userId: string };
        if (decoded.userId !== map.userId.toString()) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    res.json(map);
  } catch (err) {
    console.error('[maps]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/maps
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createMapSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    // Validate grid bounds
    const { rows, cols, gridData } = parsed.data;
    for (const [r, c] of gridData.walls) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) {
        res.status(400).json({ error: 'Wall position outside grid bounds' });
        return;
      }
    }
    for (const { pos: [r, c] } of gridData.weights) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) {
        res.status(400).json({ error: 'Weight position outside grid bounds' });
        return;
      }
    }
    const [sr, sc] = gridData.start;
    const [gr, gc] = gridData.goal;
    if (sr < 0 || sr >= rows || sc < 0 || sc >= cols || gr < 0 || gr >= rows || gc < 0 || gc >= cols) {
      res.status(400).json({ error: 'Start/goal position outside grid bounds' });
      return;
    }

    const map = await MapModel.create({
      ...parsed.data,
      userId: req.userId,
    });
    res.status(201).json(map);
  } catch (err) {
    console.error('[maps]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/maps/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const map = await MapModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    const parsed = createMapSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    // Validate grid bounds if gridData is provided
    if (parsed.data.gridData) {
      const finalRows = parsed.data.rows ?? map.rows;
      const finalCols = parsed.data.cols ?? map.cols;
      const { gridData } = parsed.data as { gridData: { walls: [number, number][]; weights: { pos: [number, number]; weight: number }[]; start: [number, number]; goal: [number, number] } };
      for (const [r, c] of gridData.walls) {
        if (r < 0 || r >= finalRows || c < 0 || c >= finalCols) {
          res.status(400).json({ error: 'Wall position outside grid bounds' });
          return;
        }
      }
      for (const { pos: [r, c] } of gridData.weights) {
        if (r < 0 || r >= finalRows || c < 0 || c >= finalCols) {
          res.status(400).json({ error: 'Weight position outside grid bounds' });
          return;
        }
      }
      const [sr, sc] = gridData.start;
      const [gr, gc] = gridData.goal;
      if (sr < 0 || sr >= finalRows || sc < 0 || sc >= finalCols || gr < 0 || gr >= finalRows || gc < 0 || gc >= finalCols) {
        res.status(400).json({ error: 'Start/goal position outside grid bounds' });
        return;
      }
    }

    Object.assign(map, parsed.data);
    await map.save();
    res.json(map);
  } catch (err) {
    console.error('[maps]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/maps/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const result = await MapModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    // Cascade: delete associated runs and their traces
    const runs = await Run.find({ mapId: req.params.id });
    const runIds = runs.map(r => r._id);
    if (runIds.length > 0) {
      await Trace.deleteMany({ runId: { $in: runIds } });
      await Run.deleteMany({ mapId: req.params.id });
    }
    // Cascade: delete associated playground attempts
    await PlaygroundAttempt.deleteMany({ mapId: req.params.id });
    res.json({ message: 'Map deleted' });
  } catch (err) {
    console.error('[maps:delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
