import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

function getDirname(): string {
  try {
    if (typeof __dirname !== 'undefined' && __dirname) {
      return __dirname;
    }
  } catch {}
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
      // @ts-ignore
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
}

const currentDir = getDirname();
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(currentDir, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BUNDLED_DB_FILE = isVercel
  ? path.resolve(process.cwd(), 'server/data/db.json')
  : path.resolve(currentDir, '../data/db.json');


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
  words: [],
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
      // Try to seed from bundled db.json if in Vercel
      let seeded = false;
      if (isVercel) {
        try {
          const bundledContent = await fs.readFile(BUNDLED_DB_FILE, 'utf-8');
          dbCache = JSON.parse(bundledContent) as DatabaseSchema;
          await fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
          seeded = true;
        } catch {}
      }

      if (!seeded) {
        dbCache = { ...DEFAULT_DB };
        await fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
      }
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
