import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { MapModel, Run, Trace } from '../models';
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

    const parsedLimit = parseInt(limit as string, 10);
    const safeLimit = Number.isNaN(parsedLimit) ? 50 : Math.min(parsedLimit, 200);

    const runs = await Run.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('mapId', 'name rows cols');
    res.json(runs);
  } catch (err) {
    console.error('[runs]', err);
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

    // Validate mapId belongs to user or is public
    if (parsed.data.mapId) {
      if (!mongoose.Types.ObjectId.isValid(parsed.data.mapId)) {
        res.status(400).json({ error: 'Invalid mapId format' });
        return;
      }
      const map = await MapModel.findById(parsed.data.mapId);
      if (!map) {
        res.status(404).json({ error: 'Map not found' });
        return;
      }
      if (!map.isPublic && map.userId.toString() !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const run = await Run.create({
      ...parsed.data,
      userId: req.userId,
    });
    res.status(201).json(run);
  } catch (err) {
    console.error('[runs:create]', err);
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
    if (!mongoose.Types.ObjectId.isValid(String(mapId))) {
      res.status(400).json({ error: 'Invalid mapId format' });
      return;
    }

    const runs = await Run.find({ mapId: String(mapId), userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(runs);
  } catch (err) {
    console.error('[runs]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/runs/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const result = await Run.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    // Cascade: delete associated trace
    await Trace.deleteMany({ runId: req.params.id });
    res.json({ message: 'Run deleted' });
  } catch (err) {
    console.error('[runs]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/runs/:id/trace — save trace for a run
router.post('/:id/trace', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const run = await Run.findOne({ _id: req.params.id, userId: req.userId });
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    const { events, totalSteps } = req.body;
    if (!Array.isArray(events) || typeof totalSteps !== 'number') {
      res.status(400).json({ error: 'events (array) and totalSteps (number) required' });
      return;
    }

    // Limit trace size to prevent abuse (max 50k events)
    const limitedEvents = events.slice(0, 50000);

    const trace = await Trace.create({
      runId: run._id,
      userId: req.userId,
      events: limitedEvents,
      totalSteps,
    });
    res.status(201).json({ id: trace._id, totalSteps });
  } catch (err) {
    console.error('[runs]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/runs/:id/trace — retrieve trace for a run
router.get('/:id/trace', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      res.status(400).json({ error: 'Invalid id format' });
      return;
    }
    const trace = await Trace.findOne({ runId: req.params.id, userId: req.userId });
    if (!trace) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    res.json(trace);
  } catch (err) {
    console.error('[runs]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
