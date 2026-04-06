import { Router, Response } from 'express';
import { z } from 'zod';
import { MapModel } from '../models';
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/maps/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const map = await MapModel.findById(req.params.id);
    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.json(map);
  } catch {
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

    const map = await MapModel.create({
      ...parsed.data,
      userId: req.userId,
    });
    res.status(201).json(map);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/maps/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
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

    Object.assign(map, parsed.data);
    await map.save();
    res.json(map);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/maps/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await MapModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.json({ message: 'Map deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
