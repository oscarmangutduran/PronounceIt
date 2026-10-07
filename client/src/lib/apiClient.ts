import { Platform } from 'react-native';
import { WordItem } from '../types';
import { StoredTestItem } from './testHistoryStore';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

class BackendApiClient {
  private isServerHealthy = false;
  private lastHealthCheck = 0;

  public async checkHealth(): Promise<boolean> {
    const now = Date.now();
    // Cache health check for 10 seconds to avoid spamming
    if (now - this.lastHealthCheck < 10000 && this.isServerHealthy) {
      return this.isServerHealthy;
    }

    try {
      const res = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        this.isServerHealthy = true;
        this.lastHealthCheck = now;
        return true;
      }
    } catch {
      // Backend not running or unreachable
      this.isServerHealthy = false;
    }
    return false;
  }

  // --- Auth Endpoints ---
  public async register(email: string, username: string) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username }),
    });
    return res.json();
  }

  public async login(emailOrUsername: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    });
    return res.json();
  }

  public async changePassword(payload: { userId?: string; email?: string; currentPassword?: string; newPassword: string }) {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  public async updateProfile(
    userId: string,
    data: { username?: string; avatar_url?: string; password?: string; email?: string }
  ) {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });
    return res.json();
  }

  // --- Words Endpoints ---
  public async getWords(userId?: string): Promise<WordItem[] | null> {
    try {
      const url = userId ? `${BASE_URL}/words?userId=${encodeURIComponent(userId)}` : `${BASE_URL}/words`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.words)) return null;
      return data.words.map((w: any) => ({
        ...w,
        id: String(w.id || `w-${Math.random().toString(36).slice(2, 7)}`),
        word: String(w.word || ''),
        partOfSpeech: w.partOfSpeech || 'noun',
        level: w.level || 'B1',
        ipa: w.ipa || w.phonetic || '',
        phoneticGuide: w.phoneticGuide || `"${(w.word || '').toLowerCase()}"`,
        phoneticNote: w.phoneticNote || '',
        translation: String(w.translation || ''),
        definition: w.definition || '',
        exampleEn: w.exampleEn || w.example || '',
        exampleEs: w.exampleEs || w.exampleTranslation || '',
        highlightWord: w.highlightWord || w.word || '',
        status: w.status || 'learning',
        isFavorite: Boolean(w.isFavorite),
        categoryGroup: w.categoryGroup || w.category || 'General',
        categorySub: w.categorySub || 'General',
        createdAt: w.createdAt || w.created_at || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  }

  public async saveWord(word: WordItem, userId?: string): Promise<WordItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...word, userId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.word || null;
    } catch {
      return null;
    }
  }

  public async updateWord(wordOrId: WordItem | string, maybeWord?: WordItem): Promise<boolean> {
    const word = typeof wordOrId === 'string' ? (maybeWord || ({ id: wordOrId } as WordItem)) : wordOrId;
    try {
      const res = await fetch(`${BASE_URL}/words/${encodeURIComponent(word.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteWord(wordId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/words/${encodeURIComponent(wordId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async bulkSaveWords(words: WordItem[], replaceAll = false, userId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/words/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, replaceAll, userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async clearAllWords(userId?: string): Promise<boolean> {
    try {
      const url = userId ? `${BASE_URL}/words?userId=${encodeURIComponent(userId)}` : `${BASE_URL}/words`;
      const res = await fetch(url, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Tests Endpoints ---
  public async getTests(userId?: string): Promise<StoredTestItem[] | null> {
    try {
      const url = userId ? `${BASE_URL}/tests?userId=${encodeURIComponent(userId)}` : `${BASE_URL}/tests`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.tests) ? data.tests : null;
    } catch {
      return null;
    }
  }

  public async saveTest(test: StoredTestItem, userId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...test, userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteTest(testId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/tests/${encodeURIComponent(testId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async clearTests(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/tests`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const backendApi = new BackendApiClient();
