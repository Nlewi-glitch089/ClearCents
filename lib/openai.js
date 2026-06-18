import 'server-only';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4o-mini', 'gpt-4o'];
const ADVANCE_RE = /does not have access|not available|is not available|permission|maximum context length|context_length_exceeded/i;

export function hasApiKey() {
  return !!process.env.OPENAI_API_KEY;
}

export async function callChat({ messages, maxTokens, temperature }) {
  const key = process.env.OPENAI_API_KEY;
  let lastError = null;

  for (const model of MODELS) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        lastError = data?.error?.message || JSON.stringify(data || {});
        if (ADVANCE_RE.test(lastError)) continue;
        return { content: `LLM provider error: ${lastError}`, source: 'provider-error' };
      }
      if (data?.choices?.[0]?.message?.content) {
        return { content: data.choices[0].message.content.trim(), source: 'openai' };
      }
      lastError = `Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`;
    } catch (inner) {
      lastError = inner.message || String(inner);
    }
  }

  return { content: null, source: 'provider-error' };
}

export async function callStructured({ messages, maxTokens, temperature, model }) {
  const key = process.env.OPENAI_API_KEY;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await resp.json();
    if (!resp.ok) return { content: null, source: 'provider-error' };
    if (data?.choices?.[0]?.message?.content) {
      return { content: data.choices[0].message.content.trim(), source: 'openai' };
    }
    return { content: null, source: 'provider-error' };
  } catch (e) {
    return { content: null, source: 'provider-error' };
  }
}
