import { TestQuestion } from '../types';
import { VerbQuestionEvaluation } from '../components/workspace/IrregularVerbsTestView';
import { firebaseService } from './firebaseClient';
import { backendApi } from './apiClient';
import { appStorage } from './storage';

import { networkService } from './networkService';

export interface StoredTestItem {
  id: string;
  type: 'vocabulary' | 'irregular_verbs' | 'part_of_speech';
  title: string;
  level: string;
  scoreOutOfTen: number;
  percentage: number;
  gradeLabel: string;
  totalQuestions: number;
  correctCount: number;
  completedAt: string;
  timestamp: number;
  vocabularyQuestions?: TestQuestion[];
  irregularVerbQuestions?: VerbQuestionEvaluation[];
}

const STORAGE_KEY_TEST_HISTORY = 'pronounceit_test_history_v2';

export const INITIAL_TEST_HISTORY: StoredTestItem[] = [];

class TestHistoryService {
  private history: StoredTestItem[] = [];
  private listeners: (() => void)[] = [];
  private lastUserId: string = '';
  private unsubscribeTests?: () => void;

  constructor() {
    this.init();
  }

  private setupRealtimeListeners(userKey: string) {
    if (this.unsubscribeTests) {
      this.unsubscribeTests();
      this.unsubscribeTests = undefined;
    }
    if (!userKey || userKey === 'guest') return;

    this.unsubscribeTests = firebaseService.subscribeTestHistory(userKey, (remoteTests) => {
      if (remoteTests && Array.isArray(remoteTests)) {
        this.history = remoteTests;
        try {
          appStorage.setItem(this.getHistoryStorageKey(), JSON.stringify(this.history));
          appStorage.setItem(STORAGE_KEY_TEST_HISTORY, JSON.stringify(this.history));
        } catch {}
        this.notify();
      }
    });
  }

  public async init() {
    await appStorage.init();
    this.loadHistory();
    this.initCloudSync();
  }

  private getEffectiveUserKey(): string {
    const user = firebaseService.getCurrentUser();
    if (user?.id) return user.id;
    if (user?.email) return user.email.trim().toLowerCase();
    return 'guest';
  }

  private getHistoryStorageKey(): string {
    return `pronounceit_test_history_u_${this.getEffectiveUserKey()}`;
  }

  private initCloudSync() {
    const userKey = this.getEffectiveUserKey();
    if (userKey !== 'guest') {
      this.setupRealtimeListeners(userKey);
    }
    this.syncWithCloud();

    firebaseService.subscribe((user) => {
      const currentKey = user?.id || user?.email?.trim().toLowerCase() || 'guest';
      if (currentKey !== this.lastUserId) {
        this.lastUserId = currentKey;
        this.loadHistory();
        if (currentKey !== 'guest') {
          this.setupRealtimeListeners(currentKey);
        }
      }
      this.syncWithCloud();
    });

    networkService.subscribe((isOnline) => {
      if (isOnline) {
        const currentKey = this.getEffectiveUserKey();
        if (currentKey !== 'guest') {
          this.setupRealtimeListeners(currentKey);
        }
        this.syncWithCloud();
      }
    });
  }

  public reloadFromStorage() {
    this.loadHistory();
  }

  public resetForNewUser(userId?: string) {
    this.history = [];
    const targetKey = userId || this.getEffectiveUserKey();
    this.lastUserId = targetKey;
    try {
      appStorage.setItem(`pronounceit_test_history_u_${targetKey}`, JSON.stringify([]));
    } catch {}
    this.notify();
  }

  public clearCurrentSession() {
    if (this.unsubscribeTests) {
      this.unsubscribeTests();
      this.unsubscribeTests = undefined;
    }
    this.history = [];
    this.lastUserId = '';
    this.notify();
  }

  public async syncWithCloud(): Promise<void> {
    if (!networkService.isOnline()) {
      return;
    }

    const currentUser = firebaseService.getCurrentUser();

    // 1. Fetch from Firestore (universal cloud sync for current user)
    if (firebaseService.isFirebaseConnected() && currentUser) {
      try {
        const remote = await firebaseService.fetchTestHistory(currentUser.id);
        if (remote && Array.isArray(remote)) {
          const testMap = new Map<string, StoredTestItem>();
          remote.forEach((t: StoredTestItem) => testMap.set(t.id, t));
          this.history.forEach((t) => testMap.set(t.id, t));
          this.history = Array.from(testMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }
      } catch (e) {
        console.warn('Error syncing test history with Firebase:', e);
      }
    }

    // 2. Fetch from Backend if live
    if (currentUser?.id) {
      try {
        const isBackendLive = await backendApi.checkHealth();
        if (isBackendLive) {
          const serverTests = await backendApi.getTests();
          if (serverTests && Array.isArray(serverTests)) {
            const testMap = new Map<string, StoredTestItem>();
            serverTests.forEach((t) => testMap.set(t.id, t));
            this.history.forEach((t) => testMap.set(t.id, t));
            this.history = Array.from(testMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          }
        }
      } catch (e) {
        console.warn('Backend test sync warning:', e);
      }
    }

    // 3. Update local state
    this.saveHistory();
    this.notify();

    // 4. Push local tests to Firestore
    if (firebaseService.isFirebaseConnected() && currentUser && this.history.length > 0) {
      this.history.forEach((t) => {
        firebaseService.saveTestResult(t).catch(() => {});
      });
    }
  }

  private loadHistory() {
    try {
      const userKey = this.getEffectiveUserKey();
      this.lastUserId = userKey;
      const stored = appStorage.getItem(this.getHistoryStorageKey());
      if (stored) {
        this.history = JSON.parse(stored);
      } else {
        this.history = [];
        this.saveHistory();
      }
    } catch {
      this.history = [];
    }
    this.notify();
  }

  private saveHistory() {
    try {
      appStorage.setItem(this.getHistoryStorageKey(), JSON.stringify(this.history));
      appStorage.setItem(STORAGE_KEY_TEST_HISTORY, JSON.stringify(this.history));
    } catch {}
    this.notify();
  }

  public getHistory(): StoredTestItem[] {
    return [...this.history];
  }

  public addTest(item: Omit<StoredTestItem, 'id' | 'timestamp'>): StoredTestItem {
    const newTest: StoredTestItem = {
      ...item,
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    this.history = [newTest, ...this.history];
    this.saveHistory();
    this.notify();

    backendApi.saveTest(newTest).catch(() => {});
    if (firebaseService.isFirebaseConnected()) {
      firebaseService.saveTestResult(newTest).catch((e) => console.warn('Firebase saveTestResult error', e));
    }
    return newTest;
  }

  public deleteTest(id: string) {
    this.history = this.history.filter((t) => t.id !== id);
    this.saveHistory();
    this.notify();

    backendApi.deleteTest(id).catch(() => {});
    if (firebaseService.isFirebaseConnected()) {
      firebaseService.deleteTestResult(id).catch((e) => console.warn('Firebase deleteTestResult error', e));
    }
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
    this.notify();

    backendApi.clearTests().catch(() => {});
    if (firebaseService.isFirebaseConnected()) {
      firebaseService.clearTestHistory().catch((e) => console.warn('Firebase clearTestHistory error', e));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in test history listener:', err);
      }
    });
  }
}

export const testHistoryService = new TestHistoryService();
