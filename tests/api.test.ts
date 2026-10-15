import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { samples, defaultProfile } from '../src/data/samples';

const listing = samples[1];
const run = { facts: listing.facts, model: 'fake-provider', durationMs: 5, usage: { inputTokens: 100, outputTokens: 30 } };
describe('local API', () => {
  it('works without a key and explicitly reports live extraction unavailable', async () => {
    const app = createApp();
    const health = await request(app).get('/api/health');
    expect(health.body.liveEnabled).toBe(false);
    const response = await request(app).post('/api/analyze').send({ text: listing.text, profile: defaultProfile });
    expect(response.status).toBe(503);
    expect(response.body.facts).toBeUndefined();
  });
  it('validates inputs before invoking the provider', async () => {
    const extract = vi.fn();
    const app = createApp({ apiKey: 'test-key', extract });
    for (const body of [{}, { text: 'a'.repeat(24001), profile: defaultProfile }, { text: listing.text, profile: { ...defaultProfile, country: 'Nepal' } }]) {
      expect((await request(app).post('/api/analyze').send(body)).status).toBe(400);
    }
    expect(extract).not.toHaveBeenCalled();
  });
  it('reuses extraction for the same listing while recomputing preferences', async () => {
    const extract = vi.fn().mockResolvedValue(run);
    const app = createApp({ apiKey: 'test-key', extract });
    const first = await request(app).post('/api/analyze').send({ text: listing.text, profile: defaultProfile });
    const second = await request(app).post('/api/analyze').send({ text: listing.text, profile: { ...defaultProfile, minimumSalary: 200000 } });
    expect(first.status).toBe(200);
    expect(first.body.verdict).toBe('Preferences supported');
    expect(second.body.verdict).toBe('Potential mismatch');
    expect(second.body.meta.cached).toBe(true);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(first.headers['cache-control']).toBe('no-store');
  });
  it('does not return a conclusion or provider details on extraction failure', async () => {
    const app = createApp({ apiKey: 'secret-test-key', extract: vi.fn().mockRejectedValue(new Error('secret-test-key')) });
    const response = await request(app).post('/api/analyze').send({ text: listing.text, profile: defaultProfile });
    expect(response.status).toBe(502);
    expect(response.text).not.toContain('secret-test-key');
    expect(response.body.verdict).toBeUndefined();
  });
  it('rejects cross-origin calls before they can consume model requests', async () => {
    const extract = vi.fn();
    const app = createApp({ apiKey: 'test-key', extract });
    const response = await request(app).post('/api/analyze').set('Origin', 'https://example.com').send({ text: listing.text, profile: defaultProfile });
    expect(response.status).toBe(403);
    expect(extract).not.toHaveBeenCalled();
  });
  it('caps uncached requests in a local ten-minute window', async () => {
    const extract = vi.fn().mockResolvedValue(run);
    const app = createApp({ apiKey: 'test-key', extract });
    for (let i = 0; i < 20; i++) expect((await request(app).post('/api/analyze').send({ text: listing.text + i, profile: defaultProfile })).status).toBe(200);
    expect((await request(app).post('/api/analyze').send({ text: listing.text + 'new', profile: defaultProfile })).status).toBe(429);
    expect(extract).toHaveBeenCalledTimes(20);
  });
});
