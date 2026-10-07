import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import wordsRoutes from './routes/words.js';
import testsRoutes from './routes/tests.js';
import { initDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all local development ports (Vite default is 3000 or 5173)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow any localhost origin
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PronounceIt Backend Service',
    message: 'Backend server is running with persistent JSON-file database',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/tests', testsRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize DB and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 PronounceIt Backend listening on http://localhost:${PORT}`);
      console.log(`   - Auth API:   http://localhost:${PORT}/api/auth`);
      console.log(`   - Words API:  http://localhost:${PORT}/api/words`);
      console.log(`   - Tests API:  http://localhost:${PORT}/api/tests`);
      console.log(`   - Health:     http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database on startup:', err);
  });
