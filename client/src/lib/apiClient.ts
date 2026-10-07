import { Platform } from 'react-native';
import { WordItem } from '../types';
import { StoredTestItem } from './testHistoryStore';
import { appStorage } from './storage';

export function getApiBaseUrl(): string {
  // 1. Variable de entorno explícita (Expo o Vite)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  // 3. Web en navegador
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
      return 'http://localhost:5000/api';
    }

    // Producción web (ej. Vercel en https://pronounceit.vercel.app):
    // Usamos el origen actual con /api para evitar errores de Mixed Content y
    // permitir redirección/proxy vía rewrites de Vercel si está configurado.
    return `${window.location.origin}/api`;
  }

  return 'http://localhost:5000/api';
}

const BASE_URL = getApiBaseUrl();

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

class BackendApiClient {
  private isServerHealthy = false;
  private lastHealthCheck = 0;
  private authToken: string | null = null;

  // ─── Token Management ────────────────────────────────────────────
  public setToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      appStorage.setItem('pronounceit_auth_token', token);
    } else {
      appStorage.removeItem('pronounceit_auth_token');
    }
  }

  public getToken(): string | null {
    if (!this.authToken) {
      this.authToken = appStorage.getItem('pronounceit_auth_token');
    }
    return this.authToken;
  }

  public hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Construye los headers HTTP incluyendo Authorization si hay token.
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ─── Health Check ────────────────────────────────────────────────
  public async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < 10000 && this.isServerHealthy) {
      return this.isServerHealthy;
    }
    try {
      // En producción web HTTPS, si BASE_URL apunta a HTTP localhost, evitar peticiones inseguras
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        BASE_URL.startsWith('http://localhost')
      ) {
        this.isServerHealthy = false;
        return false;
      }

      const res = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.status === 'ok') {
          this.isServerHealthy = true;
          this.lastHealthCheck = now;
          return true;
        }
      }
      this.isServerHealthy = false;
    } catch {
      this.isServerHealthy = false;
    }
    return false;
  }

  // ─── Auth Endpoints ──────────────────────────────────────────────
  public async register(email: string, username: string) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username }),
    });
    return res.json();
  }

  /**
   * Login: autentica al usuario y guarda el token JWT devuelto.
   */
  public async login(emailOrUsername: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    });
    const data = await res.json();
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public async changePassword(payload: {
    userId?: string;
    email?: string;
    currentPassword?: string;
    newPassword: string;
  }) {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.buildHeaders(),
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
      headers: this.buildHeaders(),
      body: JSON.stringify({ userId, ...data }),
    });
    return res.json();
  }

  // ─── Words Endpoints ─────────────────────────────────────────────
  public async getWords(userId?: string): Promise<WordItem[] | null> {
    try {
      const url = userId
        ? `${BASE_URL}/words?userId=${encodeURIComponent(userId)}`
        : `${BASE_URL}/words`;
      const res = await fetch(url, { headers: this.buildHeaders() });
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
        headers: this.buildHeaders(),
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
    const word =
      typeof wordOrId === 'string'
        ? maybeWord || ({ id: wordOrId } as WordItem)
        : wordOrId;
    try {
      const res = await fetch(`${BASE_URL}/words/${encodeURIComponent(word.id)}`, {
        method: 'PUT',
        headers: this.buildHeaders(),
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
        headers: this.buildHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async bulkSaveWords(
    words: WordItem[],
    replaceAll = false,
    userId?: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/words/bulk`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ words, replaceAll, userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async clearAllWords(userId?: string): Promise<boolean> {
    try {
      const url = userId
        ? `${BASE_URL}/words?userId=${encodeURIComponent(userId)}`
        : `${BASE_URL}/words`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.buildHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Tests Endpoints ─────────────────────────────────────────────
  public async getTests(userId?: string): Promise<StoredTestItem[] | null> {
    try {
      const url = userId
        ? `${BASE_URL}/tests?userId=${encodeURIComponent(userId)}`
        : `${BASE_URL}/tests`;
      const res = await fetch(url, { headers: this.buildHeaders() });
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
        headers: this.buildHeaders(),
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
        headers: this.buildHeaders(),
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
        headers: this.buildHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const backendApi = new BackendApiClient();
