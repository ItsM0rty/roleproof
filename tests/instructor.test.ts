import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { extractListing, extractionPrompt } from '../server/extract';
import { samples } from '../src/data/samples';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(resolve => s.close(() => resolve())))); });

it('runs actual Instructor extraction and schema retries over a fake HTTP provider', async () => {
  const requests: { messages: { role: string; content: string }[]; tools: { function: { name: string } }[] }[] = [];
  const server = createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    requests.push(body);
    const args = requests.length === 1 ? { location: 'wrong shape' } : samples[1].facts;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'test-completion', object: 'chat.completion', created: 1, model: 'fake-model', choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'test-call', type: 'function', function: { name: body.tools[0].function.name, arguments: JSON.stringify(args) } }] } }], usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 } }));
  });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const result = await extractListing(samples[1].text, { apiKey: 'fake-key', model: 'fake-model', baseURL: `http://127.0.0.1:${port}/v1` });
  expect(result.facts).toEqual(samples[1].facts);
  expect(requests).toHaveLength(2);
  expect(requests[0].messages[0].content).toBe(extractionPrompt);
  expect(requests[0].messages[1].content).toBe(JSON.stringify({ jobDescription: samples[1].text }));
  expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 50 });
});
