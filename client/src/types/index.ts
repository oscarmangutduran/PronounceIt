export type PriorityLevel = 'baja' | 'media' | 'alta' | 'urgente';
export type TaskCategory = 'trabajo' | 'personal' | 'finanzas' | 'salud' | 'estudio';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: PriorityLevel;
  status: TaskStatus;
  due_date: string;
  created_at: string;
  tags?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  must_change_password?: boolean;
  avatar_url?: string;
  role?: string;
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
  isConnected: boolean;
  lastChecked?: string;
}

export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordStatus = 'nueva' | 'en_repaso' | 'dominada';

export interface WordItem {
  id: string;
  word: string;
  partOfSpeech: string;
  level: WordLevel;
  ipa: string;
  phoneticGuide: string;
  phoneticNote?: string;
  translation: string;
  definition?: string;
  exampleEn: string;
  exampleEs: string;
  highlightWord?: string;
  status: WordStatus;
  isFavorite: boolean;
  categoryGroup: string;
  categorySub: string;
  srsIntervalDays?: number;
  lastReviewedAt?: string;
  createdAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  subcategories?: {
    id: string;
    name: string;
    count: number;
  }[];
}

export type MainNavTab = 'vocabulary' | 'flashcards' | 'test' | 'stats' | 'settings';
export type ActiveScreen = 'home' | 'tasks' | 'stats' | 'profile' | 'create';

export interface TestQuestion {
  wordItem: WordItem;
  userWord: string;
  userSentence: string;
  isWordCorrect: boolean;
  isSentenceValid: boolean;
  wordScore: number;
  sentenceScore: number;
  totalQuestionScore: number;
  feedback: string;
}

export interface TestResult {
  level: string;
  totalQuestions: number;
  scoreOutOfTen: number;
  percentage: number;
  gradeLabel: string;
  correctWordsCount: number;
  validSentencesCount: number;
  questions: TestQuestion[];
  completedAt: string;
}
