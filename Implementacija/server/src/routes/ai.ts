import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { callAI } from '../services/ai';
import { generateMap, gridToWireFormat, benchmarkGrid, gridFromWireFormat, createVariant, ALGO_LABELS, GeneratorType, AlgoName, ALL_ALGOS } from '../services/generators';

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
  language: z.enum(['sr', 'en']).optional(),
});

const generateSchema = z.object({
  description: z.string().min(1).max(2000),
  rows: z.number().int().min(5).max(200).optional(),
  cols: z.number().int().min(5).max(200).optional(),
  language: z.enum(['sr', 'en']).optional(),
});

const recommendSchema = z.object({
  mapSummary: z.record(z.string(), z.unknown()),
  gridData: z.object({
    rows: z.number().int().min(2).max(200),
    cols: z.number().int().min(4).max(400),
    walls: z.array(z.array(z.number())),
    weights: z.array(z.object({ pos: z.array(z.number()), weight: z.number() })),
    start: z.array(z.number()),
    goal: z.array(z.number()),
  }).optional(),
  language: z.enum(['sr', 'en']).optional(),
});

const explainSchema = z.object({
  context: z.string().min(1).max(5000),
  question: z.string().min(1).max(2000),
});

const compareInsightSchema = z.object({
  results: z.array(z.unknown()).min(1),
  mapSummary: z.record(z.string(), z.unknown()),
  language: z.enum(['sr', 'en']).optional(),
});

const playgroundFeedbackSchema = z.object({
  algorithm: z.string().min(1).max(50),
  userPath: z.array(z.array(z.number())),
  userCost: z.number(),
  optimalCost: z.number().nullable(),
  optimalPath: z.array(z.array(z.number())).nullable(),
  score: z.number(),
  breakdown: z.object({
    costPenalty: z.number(),
    invalidMovePenalty: z.number(),
    speedBonus: z.number(),
    matchBonus: z.number(),
  }),
  mapSummary: z.record(z.string(), z.unknown()),
  language: z.enum(['sr', 'en']).optional(),
});

// POST /api/ai/tutor — Key moments from trace
router.post('/tutor', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = tutorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { algorithm, mapSummary, metrics, traceHighlights, language: tutorLang = 'en' } = parsed.data;

    const tutorLangInstruction = tutorLang === 'sr'
      ? '\nIMPORTANT: Write all explanations in Serbian (Latin script).'
      : '';

    // traceHighlights now contains programmatically-detected key moments with context
    const momentsCtx = (traceHighlights || []).map((m: any, i: number) =>
      `Moment ${i + 1} (step ${m.stepIndex}): ${m.context}`
    ).join('\n');

    const prompt = `You are a computer science professor explaining a ${algorithm} algorithm execution to a student.

The student ran ${algorithm} on a grid map. The system has identified these key moments from the ACTUAL execution trace:

${momentsCtx || 'No trace moments available.'}

MAP: ${JSON.stringify(mapSummary)}
METRICS: ${JSON.stringify(metrics)}

ALGORITHM BEHAVIOR REFERENCE:
- BFS: FIFO queue, explores layer by layer. Guarantees shortest path (unweighted). Expands many nodes uniformly.
- DFS: LIFO stack, goes deep first. Does NOT guarantee shortest path. May explore far from goal before backtracking.
- Dijkstra: Priority queue by g(n). Guarantees cheapest path. Expands in cost-order, not direction.
- A*: Priority queue by f(n)=g(n)+h(n). Heuristic guides toward goal → fewer expanded nodes than Dijkstra.
- Greedy: Priority queue by h(n) only. Very fast but NOT optimal. Gets trapped by concave walls.
- Swarm/Conv. Swarm: Weighted A* (w>1). More aggressive heuristic → faster but possibly suboptimal.
- 0-1 BFS: Deque-based, optimal for 0/1 weights. 0-cost edges go to front of deque.

For EACH moment above, write an educational explanation (2-3 sentences) that:
1. Describes what's happening at this specific step using the numbers provided
2. Explains WHY this matters for understanding how ${algorithm} works
3. Addresses the student directly ("Notice how...", "At this point...", "This shows that...")

Keep the EXACT same stepIndex values from the moments above. Do NOT invent new step numbers.

Respond ONLY with valid JSON: { "keyMoments": [{ "stepIndex": number, "explanation": string }] }${tutorLangInstruction}`;

    const result = await callAI(prompt, { maxTokens: 1000 });
    let aiResponse;
    try { aiResponse = JSON.parse(result); } catch { res.status(502).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(aiResponse);
  } catch (err) {
    console.error('[AI tutor]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/generate — 3-step pipeline: LLM intent → Server brute-force → LLM explain
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { description, rows = 25, cols = 50, language = 'en' } = parsed.data;

    // ═══ STEP 1: LLM extracts structured intent ═══
    const intentPrompt = `You are a pathfinding algorithm expert. Parse the student's request into a structured intent.

STUDENT'S REQUEST: "${description}"

AVAILABLE ALGORITHMS: bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs

Classify the request into ONE of these intent types:
1. "algo_excels" — Student wants a map where a specific algorithm performs WELL (few expanded nodes, finds optimal path efficiently)
2. "algo_struggles" — Student wants a map where a specific algorithm performs POORLY (many expanded nodes, or finds suboptimal path)
3. "algo_better_than" — Student wants a map where algorithm X clearly outperforms algorithm Y
4. "optimal_vs_fast" — Student wants to see the trade-off between an optimal algorithm (like Dijkstra/A*) and a faster but suboptimal algorithm (like Greedy/DFS) — show that faster isn't always better
5. "challenging" — Student wants a generally difficult/complex/interesting map for all algorithms

Respond ONLY with valid JSON:
{
  "intent": "algo_excels" | "algo_struggles" | "algo_better_than" | "optimal_vs_fast" | "challenging",
  "algorithms": ["algo_name", ...],
  "notes": "brief note about what the student wants"
}

Rules for "algorithms" array:
- "algo_excels": exactly 1 algorithm (the one that should excel)
- "algo_struggles": exactly 1 algorithm (the one that should struggle)
- "algo_better_than": exactly 2 algorithms [winner, loser]
- "optimal_vs_fast": exactly 2 algorithms [optimal_one, fast_one] (e.g. ["dijkstra", "greedy"])
- "challenging": empty array []`;

    const intentResult = await callAI(intentPrompt, { maxTokens: 200 });
    let intent;
    try { intent = JSON.parse(intentResult); } catch { res.status(502).json({ error: 'AI returned invalid intent JSON' }); return; }

    // Validate intent
    const validIntents = ['algo_excels', 'algo_struggles', 'algo_better_than', 'optimal_vs_fast', 'challenging'];
    if (!validIntents.includes(intent.intent)) intent.intent = 'challenging';
    const algos: AlgoName[] = (intent.algorithms || []).filter((a: string) => ALL_ALGOS.includes(a as AlgoName));

    // ═══ STEP 2: Server generates 30 candidate maps and benchmarks them ═══
    const generators: GeneratorType[] = ['random', 'maze', 'weighted', 'mixed', 'bottleneck', 'city', 'open'];
    const densities = [15, 25, 35, 45];
    const candidates: { grid: ReturnType<typeof generateMap>; results: Record<AlgoName, { expanded: number; pathCost: number | null; foundPath: boolean }>; score: number; genType: string }[] = [];

    for (const gen of generators) {
      const seedCount = gen === 'open' ? 1 : 4; // open always same, others vary
      for (let s = 0; s < seedCount; s++) {
        const density = densities[s % densities.length];
        const grid = generateMap(gen, rows, cols, { density, seed: Math.floor(Math.random() * 1000000) });
        const results = benchmarkGrid(grid);

        // Skip maps where no path exists for any requested algo
        const relevant = algos.length > 0 ? algos : ALL_ALGOS;
        const allFound = relevant.every(a => results[a].foundPath);
        if (!allFound && intent.intent !== 'challenging') continue;

        // Score based on intent
        let score = 0;
        switch (intent.intent) {
          case 'algo_excels': {
            if (algos.length < 1) break;
            const target = algos[0];
            if (!results[target].foundPath) { score = -Infinity; break; }
            // Target should have FEWER expanded nodes than average
            const others = ALL_ALGOS.filter(a => a !== target && results[a].foundPath);
            const avgOthers = others.length > 0 ? others.reduce((s, a) => s + results[a].expanded, 0) / others.length : 0;
            score = avgOthers - results[target].expanded;
            break;
          }
          case 'algo_struggles': {
            if (algos.length < 1) break;
            const target = algos[0];
            // Target should have MORE expanded nodes than average
            const others = ALL_ALGOS.filter(a => a !== target && results[a].foundPath);
            const avgOthers = others.length > 0 ? others.reduce((s, a) => s + results[a].expanded, 0) / others.length : 0;
            score = results[target].expanded - avgOthers;
            break;
          }
          case 'algo_better_than': {
            if (algos.length < 2) break;
            const [winner, loser] = algos;
            if (!results[winner].foundPath) { score = -Infinity; break; }
            // Winner should expand MUCH fewer nodes than loser
            score = results[loser].expanded - results[winner].expanded;
            break;
          }
          case 'optimal_vs_fast': {
            if (algos.length < 2) break;
            const [optimal, fast] = algos;
            if (!results[optimal].foundPath || !results[fast].foundPath) { score = -Infinity; break; }
            // Fast one should expand fewer nodes BUT find a more expensive path
            const expandedDiff = results[optimal].expanded - results[fast].expanded;
            const costDiff = (results[fast].pathCost ?? 0) - (results[optimal].pathCost ?? 0);
            // Both differences should be positive (fast expands less, but costs more)
            score = expandedDiff > 0 && costDiff > 0 ? expandedDiff + costDiff * 5 : -Infinity;
            break;
          }
          case 'challenging': {
            // Maximize average expanded nodes
            const found = ALL_ALGOS.filter(a => results[a].foundPath);
            score = found.length > 0 ? found.reduce((s, a) => s + results[a].expanded, 0) / found.length : 0;
            break;
          }
        }

        candidates.push({ grid, results, score, genType: gen });
      }
    }

    // Pick the best candidate
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best) {
      res.status(500).json({ error: 'Could not generate a suitable map' });
      return;
    }

    // ═══ STEP 3: LLM explains the verified results ═══
    const metricsStr = ALL_ALGOS
      .filter(a => best.results[a].foundPath)
      .map(a => `${ALGO_LABELS[a]}: ${best.results[a].expanded} expanded, cost=${best.results[a].pathCost ?? 'N/A'}`)
      .join('\n');
    const failedStr = ALL_ALGOS
      .filter(a => !best.results[a].foundPath)
      .map(a => ALGO_LABELS[a])
      .join(', ');

    const langInstruction = language === 'sr'
      ? 'IMPORTANT: Write your entire response in Serbian (Latin script). Use Serbian technical terms where appropriate.'
      : 'Write your response in English.';

    const altLangInstruction = language === 'sr'
      ? 'Write your response in English.'
      : 'IMPORTANT: Write your entire response in Serbian (Latin script). Use Serbian technical terms where appropriate.';

    const baseExplainPrompt = `You are a computer science professor explaining pathfinding results to a student.

The student asked: "${description}"

A ${best.genType} map (${rows}×${cols}) was generated and ALL algorithms were run. Here are the VERIFIED results:

${metricsStr}
${failedStr ? `No path found: ${failedStr}` : ''}

Write a 3-4 sentence educational explanation:
1. Directly answer the student's question with the actual numbers above
2. Explain WHY the relevant algorithm(s) performed that way on this specific map type
3. Give one insight the student should remember (e.g., "This demonstrates that heuristic-guided algorithms like A* expand fewer nodes when...")

Be specific — reference the exact numbers. Address the student directly.`;

    // Request both language variants in parallel
    const [primaryResult, altResult] = await Promise.all([
      callAI(`${baseExplainPrompt}\n${langInstruction}\n\nRespond ONLY with valid JSON: { "explanation": string }`, { maxTokens: 500 }),
      callAI(`${baseExplainPrompt}\n${altLangInstruction}\n\nRespond ONLY with valid JSON: { "explanation": string }`, { maxTokens: 500 }),
    ]);

    let explanationPrimary = '';
    let explanationAlt = '';
    try { explanationPrimary = JSON.parse(primaryResult).explanation || ''; } catch (e) { console.error('[AI explain primary parse]', e, primaryResult.substring(0, 200)); }
    try { explanationAlt = JSON.parse(altResult).explanation || ''; } catch (e) { console.error('[AI explain alt parse]', e, altResult.substring(0, 200)); }
    console.log(`[AI generate] intent=${intent.intent}, algos=${algos}, lang=${language}, explanation_sr=${(language === 'sr' ? explanationPrimary : explanationAlt).substring(0, 60)}...`);

    // Build response
    const wireData = gridToWireFormat(best.grid);
    const metricsResponse: Record<string, { expanded: number; pathCost: number | null; foundPath: boolean }> = {};
    for (const a of ALL_ALGOS) metricsResponse[a] = best.results[a];

    res.json({
      ...wireData,
      generator: best.genType,
      explanation: { [language]: explanationPrimary, [language === 'sr' ? 'en' : 'sr']: explanationAlt },
      metrics: metricsResponse,
      intent: intent.intent,
      intentAlgorithms: algos.map((a: AlgoName) => ALGO_LABELS[a] || a),
    });
  } catch (err) {
    console.error('[AI generate]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/recommend — Run all algorithms, find best/worst, explain with AI + "what if" variant
router.post('/recommend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = recommendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { mapSummary, gridData, language: recLang = 'en' } = parsed.data;

    // ═══ STEP 1: Run all 8 algorithms on the current map ═══
    let metrics: Record<AlgoName, { expanded: number; pathCost: number | null; foundPath: boolean }> | null = null;
    let variantMetrics: Record<AlgoName, { expanded: number; pathCost: number | null; foundPath: boolean }> | null = null;
    let variantDesc = '';

    if (gridData) {
      const grid = gridFromWireFormat(gridData as any);
      metrics = benchmarkGrid(grid);

      // ═══ STEP 2: Create a "what if" variant and benchmark it too ═══
      const variant = createVariant(grid);
      variantMetrics = benchmarkGrid(variant.grid);
      variantDesc = variant.description;
    }

    // ═══ STEP 3: LLM explains the verified results ═══
    const found = metrics ? Object.entries(metrics).filter(([, v]) => v.foundPath) : [];
    found.sort((a, b) => a[1].expanded - b[1].expanded);
    const bestAlgo = found[0]?.[0] || 'a_star';
    const worstAlgo = found[found.length - 1]?.[0] || 'dfs';

    const metricsStr = metrics
      ? ALL_ALGOS.filter(a => metrics![a].foundPath)
          .map(a => `${ALGO_LABELS[a]}: ${metrics![a].expanded} expanded, cost=${metrics![a].pathCost ?? 'N/A'}`)
          .join('\n')
      : 'No metrics available.';

    const variantStr = variantMetrics
      ? ALL_ALGOS.filter(a => variantMetrics![a].foundPath)
          .map(a => `${ALGO_LABELS[a]}: ${variantMetrics![a].expanded} expanded, cost=${variantMetrics![a].pathCost ?? 'N/A'}`)
          .join('\n')
      : '';

    const variantContext = variantDesc === 'removed_walls'
      ? 'We removed ~25% of the walls to open up paths.'
      : variantDesc === 'added_weights'
        ? 'We added weighted terrain (cost 3-10) to ~12% of empty cells.'
        : '';

    const basePrompt = `You are a computer science professor analyzing pathfinding algorithm performance.

All 8 algorithms were run on the student's map. Here are the VERIFIED results:

ORIGINAL MAP:
${metricsStr}

MAP PROPERTIES: ${JSON.stringify(mapSummary)}

${variantContext ? `We also tested a MODIFIED version of the map (${variantContext}):
${variantStr}` : ''}

Write a JSON response with three sections:

1. "bestWorst": Explain why ${ALGO_LABELS[bestAlgo as AlgoName]} performed best (${metrics?.[bestAlgo as AlgoName]?.expanded} nodes) and ${ALGO_LABELS[worstAlgo as AlgoName]} performed worst (${metrics?.[worstAlgo as AlgoName]?.expanded} nodes). Reference specific map properties. 2-3 sentences.

2. "tip": One practical tip — what should the student change on this map to make a specific algorithm perform better or worse? Be specific (e.g., "Add a vertical wall to force A* to explore more nodes" or "Remove weights to make BFS optimal again"). 1-2 sentences.

3. "whatIf": ${variantContext ? `The modified map shows what happens when the map is changed (${variantContext}). Compare the original vs modified results — which algorithm improved the most? Which got worse? Reference actual numbers. 2-3 sentences.` : '"No variant available."'}`;

    const langSr = 'IMPORTANT: Write ALL text in Serbian (Latin script).';
    const langEn = 'Write in English.';

    const [primaryResult, altResult] = await Promise.all([
      callAI(`${basePrompt}\n${recLang === 'sr' ? langSr : langEn}\n\nRespond ONLY with valid JSON:\n{ "bestWorst": string, "tip": string, "whatIf": string }`, { maxTokens: 800 }),
      callAI(`${basePrompt}\n${recLang === 'sr' ? langEn : langSr}\n\nRespond ONLY with valid JSON:\n{ "bestWorst": string, "tip": string, "whatIf": string }`, { maxTokens: 800 }),
    ]);

    let primary: any = {};
    let alt: any = {};
    try { primary = JSON.parse(primaryResult); } catch { /* empty */ }
    try { alt = JSON.parse(altResult); } catch { /* empty */ }

    const primaryLang = recLang;
    const altLang = recLang === 'sr' ? 'en' : 'sr';

    res.json({
      best: { algorithm: ALGO_LABELS[bestAlgo as AlgoName] || bestAlgo, expanded: metrics?.[bestAlgo as AlgoName]?.expanded ?? 0, pathCost: metrics?.[bestAlgo as AlgoName]?.pathCost },
      worst: { algorithm: ALGO_LABELS[worstAlgo as AlgoName] || worstAlgo, expanded: metrics?.[worstAlgo as AlgoName]?.expanded ?? 0, pathCost: metrics?.[worstAlgo as AlgoName]?.pathCost },
      metrics,
      variantMetrics: variantMetrics || null,
      variantType: variantDesc || null,
      explanation: { [primaryLang]: primary.bestWorst || '', [altLang]: alt.bestWorst || '' },
      tip: { [primaryLang]: primary.tip || '', [altLang]: alt.tip || '' },
      whatIf: { [primaryLang]: primary.whatIf || '', [altLang]: alt.whatIf || '' },
    });
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

    const prompt = `You are a friendly computer science tutor helping a student understand pathfinding algorithms through a visualization tool.

The student clicked on a metric or element and needs a clear, educational explanation.

CONTEXT: ${context}
WHAT THEY CLICKED / ASKED: ${question}

BACKGROUND KNOWLEDGE TO DRAW FROM:
- "Expanded nodes" = how many cells the algorithm visited. Lower is more efficient. BFS/DFS expand many nodes; A* with a good heuristic expands fewer.
- "Path cost" = total weight of the found path. Optimal algorithms (BFS unweighted, Dijkstra, A*) always find the minimum cost. Greedy/DFS may find more expensive paths.
- "Path length" = number of cells in the path. On unweighted graphs, shorter = cheaper. On weighted graphs, a longer path through light-weight cells can be cheaper than a short path through heavy cells.
- "Max frontier" = peak size of the open set (nodes waiting to be explored). Higher frontier = more memory usage.
- "Execution time" = wall-clock time. Affected by both algorithm complexity and implementation. On small grids, differences are tiny.

Write 2-3 sentences that are:
- Specific (reference the actual numbers from the context)
- Educational (explain WHY, not just WHAT)
- Encouraging (help the student build intuition)

Respond ONLY with valid JSON: { "explanation": string }`;

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
    const { results, mapSummary, language: ciLang = 'en' } = parsed.data;

    const basePrompt = `You are a computer science professor analyzing the results of a pathfinding algorithm comparison experiment.

A student ran multiple algorithms on the same map and got these results. Write an insightful educational analysis.

MAP PROPERTIES: ${JSON.stringify(mapSummary)}

RESULTS (each entry = one algorithm run):
${JSON.stringify(results, null, 2)}

WRITE YOUR ANALYSIS (4-6 sentences) covering:
1. **The winner and why**: Which algorithm found the best path with fewest expanded nodes? Explain how the map properties (density, weights, layout) favored this algorithm.
2. **Optimal vs. fast**: If some algorithms found cheaper paths but expanded more nodes, explain the trade-off.
3. **Surprising results**: Did any algorithm perform unexpectedly well or poorly?
4. **Key takeaway**: One sentence the student should remember.

Be specific: reference actual numbers from the results.`;

    const langSr = 'IMPORTANT: Write ALL text in Serbian (Latin script).';
    const langEn = 'Write in English.';

    const [primaryResult, altResult] = await Promise.all([
      callAI(`${basePrompt}\n${ciLang === 'sr' ? langSr : langEn}\n\nRespond ONLY with valid JSON: { "insight": string }`, { maxTokens: 600 }),
      callAI(`${basePrompt}\n${ciLang === 'sr' ? langEn : langSr}\n\nRespond ONLY with valid JSON: { "insight": string }`, { maxTokens: 600 }),
    ]);

    let primary = '', alt = '';
    try { primary = JSON.parse(primaryResult).insight || ''; } catch { /* empty */ }
    try { alt = JSON.parse(altResult).insight || ''; } catch { /* empty */ }

    const altLang = ciLang === 'sr' ? 'en' : 'sr';
    res.json({ insight: { [ciLang]: primary, [altLang]: alt } });
  } catch (err) {
    console.error('[AI compare-insight]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/playground-feedback — AI feedback on user's playground attempt
router.post('/playground-feedback', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = playgroundFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { algorithm, userPath, userCost, optimalCost, optimalPath, score, breakdown, mapSummary, language: lang = 'en' } = parsed.data;

    const userPathLen = userPath.length;
    const optPathLen = optimalPath?.length ?? 0;
    const costDiff = optimalCost !== null ? (userCost - optimalCost) : null;

    const basePrompt = `You are a computer science professor giving feedback to a student who tried to replicate a ${algorithm} path on a grid map.

STUDENT'S ATTEMPT:
- Algorithm to replicate: ${algorithm}
- User path length: ${userPathLen} cells, cost: ${userCost}
- Optimal (${algorithm}) path length: ${optPathLen} cells, cost: ${optimalCost ?? 'N/A (no path)'}
- Cost difference: ${costDiff !== null ? costDiff : 'N/A'}
- Score: ${score}/110
- Breakdown: cost penalty -${breakdown.costPenalty}, invalid moves penalty -${breakdown.invalidMovePenalty}, speed bonus +${breakdown.speedBonus}, match bonus +${breakdown.matchBonus}

MAP PROPERTIES: ${JSON.stringify(mapSummary)}

ALGORITHM BEHAVIOR REFERENCE:
- BFS: FIFO queue, layer by layer. Guarantees shortest path by hops (unweighted). 
- DFS: LIFO stack, goes deep first. Does NOT guarantee optimal path.
- Dijkstra: Priority queue by g(n). Guarantees cheapest path. Explores in cost order.
- A*: f(n)=g(n)+h(n). Heuristic guides toward goal → fewer nodes than Dijkstra, still optimal.
- Greedy: f(n)=h(n) only. Very fast, but NOT optimal. Gets trapped by walls.
- Swarm/Conv. Swarm: Weighted A* with w>1. Faster but possibly suboptimal.
- 0-1 BFS: Deque for 0/1 weights. Optimal for binary-weight grids.

Provide feedback in exactly 3 sections as JSON:

1. "evaluation": Brief assessment of the student's path — was it close to optimal? What did they do well or poorly? Reference specific numbers. (2-3 sentences)

2. "insight": Explain how ${algorithm} actually works and why its path looks the way it does on this specific map. What should the student look for when replicating this algorithm? (2-3 sentences)

3. "tip": One concrete, actionable tip for the student to get a better score next time with ${algorithm} on similar maps. (1-2 sentences)`;

    const langSr = '\nIMPORTANT: Write ALL text in Serbian (Latin script).';
    const langEn = '\nWrite in English.';

    const [primaryResult, altResult] = await Promise.all([
      callAI(`${basePrompt}${lang === 'sr' ? langSr : langEn}\n\nRespond ONLY with valid JSON:\n{ "evaluation": string, "insight": string, "tip": string }`, { maxTokens: 800 }),
      callAI(`${basePrompt}${lang === 'sr' ? langEn : langSr}\n\nRespond ONLY with valid JSON:\n{ "evaluation": string, "insight": string, "tip": string }`, { maxTokens: 800 }),
    ]);

    let primary: any = {};
    let alt: any = {};
    try { primary = JSON.parse(primaryResult); } catch { /* empty */ }
    try { alt = JSON.parse(altResult); } catch { /* empty */ }

    const altLang = lang === 'sr' ? 'en' : 'sr';
    res.json({
      evaluation: { [lang]: primary.evaluation || '', [altLang]: alt.evaluation || '' },
      insight: { [lang]: primary.insight || '', [altLang]: alt.insight || '' },
      tip: { [lang]: primary.tip || '', [altLang]: alt.tip || '' },
    });
  } catch (err) {
    console.error('[AI playground-feedback]', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

export default router;
