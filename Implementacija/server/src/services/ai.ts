/**
 * AI Service — communicates with GitHub Models API (free with Copilot Enterprise).
 * Uses the same OpenAI-compatible API format.
 * Can be switched to direct OpenAI API by changing endpoint and token.
 */

// Read env vars lazily (dotenv.config() runs after imports)
function getEndpoint() {
  return process.env.GITHUB_MODELS_ENDPOINT || 'https://models.inference.ai.azure.com';
}
function getToken() {
  return process.env.GITHUB_MODELS_TOKEN || '';
}
function getModel() {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

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
  const model = options?.model || getModel();
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

  // Strip potential markdown code fences
  return content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
}
