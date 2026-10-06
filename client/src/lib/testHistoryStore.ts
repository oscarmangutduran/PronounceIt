import { TestQuestion } from '../types';
import { VerbQuestionEvaluation } from '../components/workspace/IrregularVerbsTestView';
import { firebaseService } from './firebaseClient';

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

const STORAGE_KEY_TEST_HISTORY = 'pronounceit_test_history_v1';

const INITIAL_TEST_HISTORY: StoredTestItem[] = [
  {
    id: 'test-demo-1',
    type: 'irregular_verbs',
    title: 'Test de Verbos Irregulares',
    level: 'Básico (A1-A2)',
    scoreOutOfTen: 9.5,
    percentage: 95,
    gradeLabel: 'Sobresaliente 🏆',
    totalQuestions: 10,
    correctCount: 9,
    completedAt: 'Hoy, 08:30',
    timestamp: Date.now() - 1000 * 60 * 25,
    irregularVerbQuestions: [
      {
        verb: {
          id: 'iv-be',
          infinitive: 'be',
          pastSimple: 'was / were',
          pastParticiple: 'been',
          translation: 'Ser / Estar',
          level: 'A1',
        },
        userPastSimple: 'was',
        userPastParticiple: 'been',
        isPastSimpleCorrect: true,
        isPastParticipleCorrect: true,
        isPastSimpleTypo: false,
        isPastParticipleTypo: false,
        score: 10,
      },
      {
        verb: {
          id: 'iv-break',
          infinitive: 'break',
          pastSimple: 'broke',
          pastParticiple: 'broken',
          translation: 'Romper',
          level: 'A2',
        },
        userPastSimple: 'broke',
        userPastParticiple: 'broken',
        isPastSimpleCorrect: true,
        isPastParticipleCorrect: true,
        isPastSimpleTypo: false,
        isPastParticipleTypo: false,
        score: 10,
      },
      {
        verb: {
          id: 'iv-drive',
          infinitive: 'drive',
          pastSimple: 'drove',
          pastParticiple: 'driven',
          translation: 'Conducir',
          level: 'A2',
        },
        userPastSimple: 'drove',
        userPastParticiple: 'driven',
        isPastSimpleCorrect: true,
        isPastParticipleCorrect: true,
        isPastSimpleTypo: false,
        isPastParticipleTypo: false,
        score: 10,
      },
    ],
  },
  {
    id: 'test-demo-2',
    type: 'vocabulary',
    title: 'Test de Vocabulario y Oraciones',
    level: 'Nivel B2',
    scoreOutOfTen: 8.8,
    percentage: 88,
    gradeLabel: 'Notable 🌟',
    totalQuestions: 5,
    correctCount: 4,
    completedAt: 'Ayer, 18:45',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    vocabularyQuestions: [
      {
        wordItem: {
          id: 'w-1',
          word: 'Breakthrough',
          partOfSpeech: 'noun/verb',
          level: 'B2',
          ipa: "/ˈbreɪk.θruː/",
          phoneticGuide: 'breik-zru',
          translation: 'Avance decisivo',
          exampleEn: 'We achieved a major breakthrough in negotiations.',
          exampleEs: 'Logramos un avance decisivo en las negociaciones.',
          status: 'dominada',
          isFavorite: true,
          categoryGroup: 'Negocios & Trabajo',
          categorySub: 'Reuniones & Negociación',
        },
        userWord: 'Breakthrough',
        userSentence: 'The scientists made an important breakthrough this week.',
        isWordCorrect: true,
        isSentenceValid: true,
        wordScore: 5,
        sentenceScore: 5,
        totalQuestionScore: 10,
        feedback: '¡Perfecto! Palabra exacta y oración contextual válida.',
      },
      {
        wordItem: {
          id: 'w-2',
          word: 'Leverage',
          partOfSpeech: 'verb / noun',
          level: 'C1',
          ipa: "/ˈlev.ər.ɪdʒ/",
          phoneticGuide: 'lév-ridy',
          translation: 'Aprovechar, sacar ventaja',
          exampleEn: 'We need to leverage our market reputation.',
          exampleEs: 'Necesitamos aprovechar nuestra reputación.',
          status: 'en_repaso',
          isFavorite: true,
          categoryGroup: 'Negocios & Trabajo',
          categorySub: 'Finanzas & Métricas',
        },
        userWord: 'Leverage',
        userSentence: 'We can leverage new technology to improve results.',
        isWordCorrect: true,
        isSentenceValid: true,
        wordScore: 5,
        sentenceScore: 5,
        totalQuestionScore: 10,
        feedback: '¡Excelente formulación!',
      },
    ],
  },
];

class TestHistoryService {
  private history: StoredTestItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
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
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEST_HISTORY);
      if (stored) {
        this.history = JSON.parse(stored);
      } else {
        this.history = [...INITIAL_TEST_HISTORY];
        this.saveHistory();
      }
    } catch {
      this.history = [...INITIAL_TEST_HISTORY];
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY_TEST_HISTORY, JSON.stringify(this.history));
    } catch {
      // ignore
    }
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

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.saveTestResult(newTest).catch((e) => console.warn('Firebase saveTestResult error', e));
    }
    return newTest;
  }

  public deleteTest(id: string) {
    this.history = this.history.filter((t) => t.id !== id);
    this.saveHistory();
    this.notify();

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.deleteTestResult(id).catch((e) => console.warn('Firebase deleteTestResult error', e));
    }
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
    this.notify();

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
