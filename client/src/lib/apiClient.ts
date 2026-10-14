import { Platform } from 'react-native';
import { WordItem, normalizePartOfSpeech } from '../types';
import { StoredTestItem } from './testHistoryStore';
import { appStorage } from './storage';

export const PRODUCTION_API_URL = 'https://pronounceit-sand.vercel.app/api';

export function getApiBaseUrl(): string {
  // 1. Variable de entorno explícita (siempre que no apunte a localhost/10.0.2.2 en móvil nativo)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    if (Platform.OS === 'web' || (!trimmed.includes('localhost') && !trimmed.includes('10.0.2.2'))) {
      return trimmed;
    }
  }

  // 2. Web en navegador local vs prod
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
      return 'http://localhost:5000/api';
    }

    // Producción web (ej. Vercel en https://pronounceit-sand.vercel.app):
    return `${window.location.origin}/api`;
  }

  // 3. En aplicación móvil (APK Android / iOS): SIEMPRE usar la API en producción en Vercel
  return PRODUCTION_API_URL;
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

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[API Request] ${options.method || 'GET'} ${url}`);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      console.warn(`[API Request Error] ${options.method || 'GET'} ${url}:`, e);
      throw e;
    }
  }

  // ─── Health Check ────────────────────────────────────────────────
  public async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < 10000 && this.isServerHealthy) {
      return this.isServerHealthy;
    }
    try {
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        BASE_URL.startsWith('http://localhost')
      ) {
        this.isServerHealthy = false;
        return false;
      }

      const res = await this.fetchWithTimeout(`${BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, 5000);

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
    const res = await this.fetchWithTimeout(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username }),
    }, 15000);
    return res.json();
  }

  /**
   * Login: autentica al usuario y guarda el token JWT devuelto.
   */
  public async login(emailOrUsername: string, password: string) {
    const res = await this.fetchWithTimeout(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    }, 15000);
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
    const res = await this.fetchWithTimeout(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    }, 15000);
    return res.json();
  }

  public async resetPassword(payload: { emailOrUsername: string; newPassword?: string }) {
    const res = await this.fetchWithTimeout(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);
    return res.json();
  }

  public async updateProfile(
    userId: string,
    data: { username?: string; avatar_url?: string; password?: string; email?: string }
  ) {
    const res = await this.fetchWithTimeout(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify({ userId, ...data }),
    }, 15000);
    return res.json();
  }

  public async deleteAccount(userId?: string, email?: string, username?: string): Promise<ApiResponse> {
    try {
      const res = await this.fetchWithTimeout(`${BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: this.buildHeaders(),
        body: JSON.stringify({ userId, email, username }),
      }, 15000);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error de conexión' };
    }
  }

  // ─── Words Endpoints ─────────────────────────────────────────────
  public async getWords(userId?: string): Promise<WordItem[] | null> {
    try {
      const url = userId
        ? `${BASE_URL}/words?userId=${encodeURIComponent(userId)}`
        : `${BASE_URL}/words`;
      const res = await fetch(url, { headers: this.buildHeaders() });
      if (res.status === 401 && this.authToken) {
        this.setToken(null);
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.words)) return null;
      return data.words.map((w: any) => ({
        ...w,
        id: String(w.id || `w-${Math.random().toString(36).slice(2, 7)}`),
        word: String(w.word || ''),
        partOfSpeech: normalizePartOfSpeech(w.partOfSpeech || 'Sustantivo'),
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
      if (res.status === 401 && this.authToken) {
        this.setToken(null);
      }
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
