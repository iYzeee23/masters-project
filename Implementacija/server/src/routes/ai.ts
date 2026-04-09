import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { callAI } from '../services/ai';

const router = Router();

// Rate limit: max 20 AI requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later' },
});

router.use(aiLimiter);

const tutorSchema = z.object({
  algorithm: z.string().min(1).max(50),
  mapSummary: z.record(z.string(), z.unknown()),
  metrics: z.record(z.string(), z.unknown()).optional(),
  traceHighlights: z.array(z.unknown()).optional(),
});

const generateSchema = z.object({
  description: z.string().min(1).max(2000),
  rows: z.number().int().min(5).max(200).optional(),
  cols: z.number().int().min(5).max(200).optional(),
});

const recommendSchema = z.object({
  mapSummary: z.record(z.string(), z.unknown()),
});

const explainSchema = z.object({
  context: z.string().min(1).max(5000),
  question: z.string().min(1).max(2000),
});

const compareInsightSchema = z.object({
  results: z.array(z.unknown()).min(1),
  mapSummary: z.record(z.string(), z.unknown()),
});

// POST /api/ai/tutor — Key moments from trace
router.post('/tutor', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = tutorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { algorithm, mapSummary, metrics, traceHighlights } = parsed.data;

    const prompt = `You are an educational assistant for a pathfinding visualizer. 
Analyze the execution of the ${algorithm} algorithm and identify the 3-5 most significant moments.

Map info: ${JSON.stringify(mapSummary)}
Metrics: ${JSON.stringify(metrics)}
Key trace events (sampled): ${JSON.stringify(traceHighlights?.slice(0, 20))}

For each key moment, provide:
- stepIndex: the approximate step number
- explanation: a brief (1-2 sentence) explanation of why this moment is significant

Respond in JSON format: { "keyMoments": [{ "stepIndex": number, "explanation": string }] }
Only respond with valid JSON, no markdown.`;

    const result = await callAI(prompt);
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(aiResponse);
  } catch (err) {
    console.error('[AI tutor]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/generate — Generate map from description
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { description, rows = 25, cols = 50 } = parsed.data;

    const prompt = `You are a map generator for a pathfinding visualizer on a ${rows}x${cols} grid.
The user wants: "${description}"

Generate a grid with walls and weighted cells that match this description.
Rules:
- Grid is ${rows} rows x ${cols} cols (0-indexed)
- Start is at [${Math.floor(rows/2)}, ${Math.floor(cols/4)}], goal at [${Math.floor(rows/2)}, ${Math.floor(3*cols/4)}]
- Don't place walls on start or goal
- Weights are integers 2-10 (1 is default/normal)
- Be creative but ensure the map matches the description

Respond in JSON format:
{
  "walls": [[row, col], ...],
  "weights": [{"pos": [row, col], "weight": number}, ...],
  "description": "brief description of what you generated"
}
Only respond with valid JSON, no markdown.`;

    const result = await callAI(prompt);
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json({
      rows,
      cols,
      start: [Math.floor(rows/2), Math.floor(cols/4)],
      goal: [Math.floor(rows/2), Math.floor(3*cols/4)],
      ...aiResponse,
    });
  } catch (err) {
    console.error('[AI generate]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/recommend — Recommend best/worst algorithm for a map
router.post('/recommend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = recommendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { mapSummary } = parsed.data;

    const prompt = `You are an algorithm advisor for a pathfinding visualizer.
Given this map configuration, predict which algorithm will perform BEST and which will perform WORST.

Map info: ${JSON.stringify(mapSummary)}

Available algorithms: BFS, DFS, Dijkstra, A*, Greedy Best-First, Swarm, Convergent Swarm, 0-1 BFS

Consider: number of expanded nodes, path optimality, and execution speed.

Respond in JSON format:
{
  "best": { "algorithm": string, "reason": string, "confidence": number },
  "worst": { "algorithm": string, "reason": string, "confidence": number }
}
Confidence is 0-100. Only respond with valid JSON, no markdown.`;

    const result = await callAI(prompt);
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(aiResponse);
  } catch (err) {
    console.error('[AI recommend]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/explain — Contextual explanation
router.post('/explain', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = explainSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { context, question } = parsed.data;

    const prompt = `You are an educational assistant for a pathfinding visualizer.
The user is looking at: ${context}
Their question/click context: ${question}

Provide a brief (2-3 sentences) educational explanation. Be specific about the numbers and algorithms involved.
Respond in JSON format: { "explanation": string }
Only respond with valid JSON, no markdown.`;

    const result = await callAI(prompt);
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(aiResponse);
  } catch (err) {
    console.error('[AI explain]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/compare-insight — Summary after compare run
router.post('/compare-insight', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = compareInsightSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { results, mapSummary } = parsed.data;

    const prompt = `You are an educational assistant for a pathfinding visualizer.
The user ran multiple algorithms on the same map and got these results:

Map: ${JSON.stringify(mapSummary)}
Results: ${JSON.stringify(results)}

Write a brief (3-5 sentences) comparative analysis explaining:
- Why certain algorithms performed better/worse
- The trade-off between speed (expanded nodes) and path quality (cost)
- Any surprising results

Respond in JSON format: { "insight": string }
Only respond with valid JSON, no markdown.`;

    const result = await callAI(prompt);
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(aiResponse);
  } catch (err) {
    console.error('[AI compare-insight]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

export default router;
