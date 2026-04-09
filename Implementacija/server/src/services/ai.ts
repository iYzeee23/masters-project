/**
 * AI Service — communicates with GitHub Models API (free with Copilot Enterprise).
 * Uses the same OpenAI-compatible API format.
 * Can be switched to direct OpenAI API by changing endpoint and token.
 */

const GITHUB_MODELS_ENDPOINT =
  process.env.GITHUB_MODELS_ENDPOINT || 'https://models.inference.ai.azure.com';
const GITHUB_TOKEN = process.env.GITHUB_MODELS_TOKEN || '';

// Default model — GPT-4o-mini is faster and cheaper, GPT-4o for higher quality
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

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
 * Call the AI model with a prompt and return the response text.
 */
export async function callAI(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  },
): Promise<string> {
  const model = options?.model || DEFAULT_MODEL;
  const maxTokens = options?.maxTokens || 1000;
  const temperature = options?.temperature ?? 0.3;

  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_MODELS_TOKEN is not set. Please configure it in .env');
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a precise AI assistant for a pathfinding visualizer. Always respond with valid JSON only. No markdown, no extra text.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await fetch(`${GITHUB_MODELS_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(30_000),
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

  // Strip potential markdown code fences
  return content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
}
