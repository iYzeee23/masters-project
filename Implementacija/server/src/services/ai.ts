/**
 * AI Service — communicates with GitHub Models API (free with Copilot Enterprise).
 * Uses the same OpenAI-compatible API format.
 * Includes automatic model fallback when rate limits are hit.
 */

// Read env vars lazily (dotenv.config() runs after imports)
function getEndpoint() {
  return process.env.GITHUB_MODELS_ENDPOINT || 'https://models.inference.ai.azure.com';
}
function getToken() {
  return process.env.GITHUB_MODELS_TOKEN || '';
}
function getModel() {
  return process.env.AI_MODEL || 'gpt-4o';
}

/**
 * Fallback chain: primary model first, then alternatives.
 * Each model has its own daily quota (150/day for Low tier, 50/day for High tier).
 */
const FALLBACK_MODELS = [
  'gpt-4o',                  // High tier — 50/day, highest accuracy (85.7%)
  'Mistral-small-2503',      // Low tier — 150/day, best "best" accuracy (90%)
  'gpt-4o-mini',             // Low tier — 150/day, good all-rounder
  'Phi-4',                   // Low tier — 150/day
  'Meta-Llama-3.1-8B-Instruct', // Low tier — 150/day, fastest
];

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Make a single API call to a specific model. Does NOT retry or fallback.
 */
async function callModel(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const response = await fetch(`${getEndpoint()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty AI response');
  }

  return content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function isRateLimitError(err: unknown): boolean {
  const msg = (err as Error)?.message || '';
  return msg.includes('429') || msg.includes('RateLimitReached') || msg.includes('rate limit');
}

/**
 * Call the AI model with a prompt and return the response text.
 * If the primary model is rate-limited, automatically falls back to the next
 * available model in the chain.
 */
export async function callAI(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  },
): Promise<string> {
  const maxTokens = options?.maxTokens || 1000;
  const temperature = options?.temperature ?? 0.3;

  if (!getToken()) {
    throw new Error('GITHUB_MODELS_TOKEN is not set. Please configure it in .env');
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert computer science educator specializing in graph algorithms and pathfinding. You help students understand algorithm behavior through an interactive visualization tool. Always respond with valid JSON only — no markdown code fences, no backticks, no extra text before or after the JSON object.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  // If a specific model is requested (e.g., from benchmark), use it directly without fallback.
  if (options?.model) {
    return callModel(options.model, messages, maxTokens, temperature);
  }

  // Build fallback chain: primary model first, then others
  const primary = getModel();
  const chain = [primary, ...FALLBACK_MODELS.filter(m => m !== primary)];

  let lastError: Error | null = null;
  for (const model of chain) {
    try {
      return await callModel(model, messages, maxTokens, temperature);
    } catch (err) {
      lastError = err as Error;
      if (isRateLimitError(err)) {
        console.warn(`[AI] ${model} rate-limited, trying next model…`);
        continue;
      }
      // Non-rate-limit error — don't try other models
      throw err;
    }
  }

  throw lastError || new Error('All AI models exhausted');
}
