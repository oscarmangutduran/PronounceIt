import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/words', (_req: Request, res: Response) => {
  // Sample route for PronounceIt
  res.json([
    { id: 1, word: 'Pronunciation', phonetic: '/prəˌnʌn.siˈeɪ.ʃən/', difficulty: 'medium' },
    { id: 2, word: 'Rhythm', phonetic: '/ˈrɪð.əm/', difficulty: 'hard' },
    { id: 3, word: 'Comfortable', phonetic: '/ˈkʌm.fər.tə.bəl/', difficulty: 'easy' },
  ]);
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
