import type { Request, Response, NextFunction } from 'express';

let appInstance: any = null;

async function getApp() {
  if (appInstance) {
    return appInstance;
  }

  const { default: express } = await import('express');
  const { default: cors } = await import('cors');
  const { default: dotenv } = await import('dotenv');
  dotenv.config();

  const { initDb } = await import('../server/src/db.js');
  try {
    await initDb();
  } catch (e) {
    console.warn('DB init warning:', e);
  }

  const { default: authRoutes } = await import('../server/src/routes/auth.js');
  const { default: wordsRoutes } = await import('../server/src/routes/words.js');
  const { default: testsRoutes } = await import('../server/src/routes/tests.js');

  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'PronounceIt Backend Service on Vercel',
      timestamp: new Date().toISOString(),
    });
  });

  // Root API endpoints
  app.get(['/', '/api'], (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'PronounceIt Backend Service on Vercel',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Routes on both /api/* and /* so it matches regardless of rewrite
  app.use('/api/auth', authRoutes as any);
  app.use('/auth', authRoutes as any);
  app.use('/api/words', wordsRoutes as any);
  app.use('/words', wordsRoutes as any);
  app.use('/api/tests', testsRoutes as any);
  app.use('/tests', testsRoutes as any);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  appInstance = app;
  return appInstance;
}

export default async function handler(req: any, res: any) {
  // If Vercel rewrote the path, restore original path so Express routes match
  const matchedPath = req.headers?.['x-matched-path'];
  if (matchedPath && typeof matchedPath === 'string' && req.url !== matchedPath) {
    req.url = matchedPath;
  }

  const app = await getApp();
  return app(req, res);
}
