import { createApp } from './app';

const port = Number(process.env.PORT ?? 4318);
createApp({ apiKey: process.env.OPENAI_API_KEY, model: process.env.ROLEPROOF_MODEL, serveStatic: true })
  .listen(port, '127.0.0.1', () => console.log(`RoleProof API and production UI: http://127.0.0.1:${port}`));
