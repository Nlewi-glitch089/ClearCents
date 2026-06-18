// Prevent prisma from connecting — getEmbedding does not use it
// but lib/ai.js imports prisma at module level.
jest.mock('../lib/prisma.js', () => ({}));

import { getEmbedding } from '../lib/ai.js';

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

test('returns embedding array when key is set and API responds with valid data', async () => {
  process.env.OPENAI_API_KEY = 'sk-test-key';
  global.fetch.mockResolvedValueOnce({
    json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
  });

  const result = await getEmbedding('test text');

  expect(result).toEqual([0.1, 0.2, 0.3]);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('returns null without calling fetch when OPENAI_API_KEY is not set', async () => {
  const result = await getEmbedding('test text');

  expect(result).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('returns null when API response contains no embedding data', async () => {
  process.env.OPENAI_API_KEY = 'sk-test-key';
  global.fetch.mockResolvedValueOnce({
    json: async () => ({ data: [] }),
  });

  const result = await getEmbedding('test text');

  expect(result).toBeNull();
});

test('returns null when fetch rejects (network failure)', async () => {
  process.env.OPENAI_API_KEY = 'sk-test-key';
  global.fetch.mockRejectedValueOnce(new Error('Network failure'));

  const result = await getEmbedding('test text');

  expect(result).toBeNull();
});
