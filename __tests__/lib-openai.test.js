/** @jest-environment node */
import { hasApiKey, callChat, callStructured } from '../lib/openai.js';

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// hasApiKey
// ---------------------------------------------------------------------------
describe('hasApiKey', () => {
  test('returns true when OPENAI_API_KEY is a non-empty string', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    expect(hasApiKey()).toBe(true);
  });

  test('returns false when OPENAI_API_KEY is an empty string', () => {
    process.env.OPENAI_API_KEY = '';
    expect(hasApiKey()).toBe(false);
  });

  test('returns false when OPENAI_API_KEY is undefined', () => {
    expect(hasApiKey()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// callChat
// ---------------------------------------------------------------------------
describe('callChat', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
  });

  test('success path returns trimmed content and source openai', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  Hello world  ' } }] }),
    });

    const result = await callChat({ messages: [{ role: 'user', content: 'hi' }], maxTokens: 100, temperature: 0 });

    expect(result).toEqual({ content: 'Hello world', source: 'openai' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('access-denied error advances to the next model', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'does not have access to this model' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      });

    const result = await callChat({ messages: [], maxTokens: 100, temperature: 0 });

    expect(result).toEqual({ content: 'OK', source: 'openai' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('context_length_exceeded advances to the next model', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'context_length_exceeded for this request' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Fits fine' } }] }),
      });

    const result = await callChat({ messages: [], maxTokens: 100, temperature: 0 });

    expect(result.source).toBe('openai');
    expect(result.content).toBe('Fits fine');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('all four models fail returns { content: null, source: provider-error }', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'does not have access' } }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'does not have access' } }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'does not have access' } }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'does not have access' } }) });

    const result = await callChat({ messages: [], maxTokens: 100, temperature: 0 });

    expect(result).toEqual({ content: null, source: 'provider-error' });
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test('non-advance provider error returns non-null content beginning with "LLM provider error:"', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const result = await callChat({ messages: [], maxTokens: 100, temperature: 0 });

    expect(result.content).toMatch(/^LLM provider error:/);
    expect(result.source).toBe('provider-error');
    // stops immediately — does not try remaining models
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// callStructured
// ---------------------------------------------------------------------------
describe('callStructured', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
  });

  const ARGS = { messages: [], maxTokens: 100, temperature: 0, model: 'gpt-3.5-turbo' };

  test('success path returns raw content string and source openai', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"insight":"test"}' } }] }),
    });

    const result = await callStructured(ARGS);

    expect(result).toEqual({ content: '{"insight":"test"}', source: 'openai' });
  });

  test('HTTP failure returns { content: null, source: provider-error }', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Server error' } }),
    });

    const result = await callStructured(ARGS);

    expect(result).toEqual({ content: null, source: 'provider-error' });
  });

  test('network failure returns { content: null, source: provider-error }', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await callStructured(ARGS);

    expect(result).toEqual({ content: null, source: 'provider-error' });
  });

  test('malformed response (empty choices) returns { content: null, source: provider-error }', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await callStructured(ARGS);

    expect(result).toEqual({ content: null, source: 'provider-error' });
  });
});
