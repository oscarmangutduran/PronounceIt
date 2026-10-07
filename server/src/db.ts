import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  password: string; // Stored securely
  must_change_password: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WordRecord {
  id: string;
  userId?: string;
  word: string;
  phonetic: string;
  translation: string;
  example: string;
  exampleTranslation?: string;
  category: string;
  level: string;
  status: string;
  isFavorite: boolean;
  notes?: string;
  lastReviewed?: string;
  nextReviewDate?: string;
  interval?: number;
  easeFactor?: number;
  repetitions?: number;
  created_at: string;
  updated_at: string;
}

export interface TestRecord {
  id: string;
  userId?: string;
  type: 'vocabulary' | 'irregular_verbs';
  title: string;
  level: string;
  scoreOutOfTen: number;
  percentage: number;
  gradeLabel: string;
  totalQuestions: number;
  correctCount: number;
  completedAt: string;
  timestamp: number;
  vocabularyQuestions?: any[];
  irregularVerbQuestions?: any[];
}

export interface DatabaseSchema {
  users: UserRecord[];
  words: WordRecord[];
  tests: TestRecord[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  words: [
    {
      id: 'word-1',
      word: 'Ephemeral',
      phonetic: '/ɪˈfem.ər.əl/',
      translation: 'Efímero / De corta duración',
      example: 'Fame in the digital age can be quite ephemeral.',
      exampleTranslation: 'La fama en la era digital puede ser muy efímera.',
      category: 'Advanced Academic',
      level: 'C1',
      status: 'learning',
      isFavorite: true,
      notes: 'Palabra formal muy usada en ensayos y literatura.',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'word-2',
      word: 'Resilience',
      phonetic: '/rɪˈzɪl.jəns/',
      translation: 'Resiliencia / Capacidad de recuperación',
      example: 'They showed great resilience in overcoming the crisis.',
      exampleTranslation: 'Demostraron gran resiliencia al superar la crisis.',
      category: 'Psychology',
      level: 'B2',
      status: 'reviewing',
      isFavorite: false,
      notes: 'Capacidad para sobreponerse a períodos de dolor emocional.',
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  tests: [],
};

let dbCache: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export async function initDb(): Promise<DatabaseSchema> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DB_FILE, 'utf-8');
      dbCache = JSON.parse(content) as DatabaseSchema;
      // Ensure all collections exist
      if (!Array.isArray(dbCache.users)) dbCache.users = [];
      if (!Array.isArray(dbCache.words)) dbCache.words = [];
      if (!Array.isArray(dbCache.tests)) dbCache.tests = [];
    } catch {
      // File doesn't exist or is corrupted, initialize with default
      dbCache = { ...DEFAULT_DB };
      await fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dbCache = { ...DEFAULT_DB };
  }
  return dbCache;
}

export async function getDb(): Promise<DatabaseSchema> {
  if (!dbCache) {
    return await initDb();
  }
  return dbCache;
}

export async function saveDb(): Promise<void> {
  if (!dbCache) return;
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tempPath = `${DB_FILE}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(dbCache, null, 2), 'utf-8');
      await fs.rename(tempPath, DB_FILE);
    } catch (error) {
      console.error('Error writing database to disk:', error);
    }
  });
  return writeQueue;
}
