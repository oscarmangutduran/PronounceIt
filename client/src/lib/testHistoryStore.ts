import { TestQuestion } from '../types';
import { VerbQuestionEvaluation } from '../components/workspace/IrregularVerbsTestView';
import { firebaseService } from './firebaseClient';
import { backendApi } from './apiClient';
import { appStorage } from './storage';

export interface StoredTestItem {
  id: string;
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
  vocabularyQuestions?: TestQuestion[];
  irregularVerbQuestions?: VerbQuestionEvaluation[];
}

const STORAGE_KEY_TEST_HISTORY = 'pronounceit_test_history_v2';

export const INITIAL_TEST_HISTORY: StoredTestItem[] = [];

class TestHistoryService {
  private history: StoredTestItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  public async init() {
    await appStorage.init();
    this.loadHistory();
    this.initCloudSync();
  }

  private initCloudSync() {
    this.syncWithCloud();
    firebaseService.subscribe(() => {
      this.syncWithCloud();
    });
  }

  public async syncWithCloud(): Promise<void> {
    try {
      const isBackendLive = await backendApi.checkHealth();
      if (isBackendLive) {
        const serverTests = await backendApi.getTests();
        if (serverTests && serverTests.length > 0) {
          if (this.history.length === 0 || serverTests.length >= this.history.length) {
            this.history = serverTests;
            this.saveHistory();
            this.notify();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Backend test sync warning:', e);
    }

    if (firebaseService.isFirebaseConnected()) {
      try {
        const remote = await firebaseService.fetchTestHistory();
        if (remote !== null) {
          this.history = remote;
          this.saveHistory();
          this.notify();
          return;
        }
      } catch (e) {
        console.warn('Error syncing test history with Firebase:', e);
      }
    }
  }

  private loadHistory() {
    try { appStorage.removeItem('pronounceit_test_history_v1'); } catch {}
    try {
      const stored = appStorage.getItem(STORAGE_KEY_TEST_HISTORY);
      if (stored) {
        this.history = JSON.parse(stored);
      } else {
        this.history = [...INITIAL_TEST_HISTORY];
        this.saveHistory();
      }
    } catch {
      this.history = [...INITIAL_TEST_HISTORY];
    }
    this.notify();
  }

  private saveHistory() {
    try {
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
