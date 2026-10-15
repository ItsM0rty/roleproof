import express from 'express';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { profileSchema } from '../src/core/schema';
import { analyze } from '../src/core/engine';
import { extractListing, type ExtractionRun } from './extract';

const requestSchema = z.object({ text: z.string().trim().min(30).max(24_000), profile: profileSchema });
type Options = { apiKey?: string; model?: string; extract?: typeof extractListing; serveStatic?: boolean };

export function createApp(options: Options = {}) {
  const app = express();
  const cache = new Map<string, { run: ExtractionRun; expires: number }>();
  let active = 0;
  let calls = 0;
  let windowStart = Date.now();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):(4317|4318)$/.test(origin)) {
      res.status(403).json({ error: 'This local demo accepts requests from its local interface only.' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', liveEnabled: Boolean(options.apiKey), model: options.model ?? 'gpt-4o-mini' }));
  app.post('/api/analyze', async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Supply a 30 to 24,000 character listing and valid preferences.', issues: parsed.error.flatten() }); return; }
    if (!options.apiKey) { res.status(503).json({ error: 'Live extraction is not configured. Set OPENAI_API_KEY in the server .env file, or use an example.' }); return; }
    const { text, profile } = parsed.data;
    const key = createHash('sha256').update(text).digest('hex');
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      res.json({ ...analyze(text, cached.run.facts, profile), facts: cached.run.facts, meta: { ...cached.run, facts: undefined, cached: true } });
      return;
    }
    if (Date.now() - windowStart > 600_000) { calls = 0; windowStart = Date.now(); }
    if (active >= 2 || calls >= 20) { res.status(429).json({ error: 'Local demo request limit reached. Try again later.' }); return; }
    calls++;
    active++;
    try {
      const run = await (options.extract ?? extractListing)(text, { apiKey: options.apiKey, model: options.model ?? 'gpt-4o-mini' });
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(key, { run, expires: Date.now() + 15 * 60_000 });
      res.json({ ...analyze(text, run.facts, profile), facts: run.facts, meta: { ...run, facts: undefined, cached: false } });
    } catch {
      res.status(502).json({ error: 'Extraction failed. Check the server API key, model access, and provider connection. No match conclusion was produced.' });
    } finally { active--; }
  });
  if (options.serveStatic) {
    app.use(express.static(resolve('dist')));
    app.get('/', (_req, res) => res.sendFile(resolve('dist/index.html')));
  }
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: 'The request body is invalid or too large.' });
  });
  return app;
}
