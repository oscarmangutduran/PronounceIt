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

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'Inglés', flag: '🇬🇧' },
  { code: 'fr', name: 'Francés', flag: '🇫🇷' },
  { code: 'de', name: 'Alemán', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugués', flag: '🇵🇹' },
  { code: 'ru', name: 'Ruso', flag: '🇷🇺' },
  { code: 'zh', name: 'Chino', flag: '🇨🇳' },
  { code: 'ja', name: 'Japonés', flag: '🇯🇵' },
  { code: 'ar', name: 'Árabe', flag: '🇸🇦' },
];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  must_change_password?: boolean;
  avatar_url?: string;
  role?: string;
  created_at?: string;
  native_language?: string;
  target_language?: string;
}


export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  isCustom?: boolean;
  isConnected?: boolean;
  lastChecked?: string;
}

export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordStatus = 'nueva' | 'en_repaso' | 'dominada';

export const PART_OF_SPEECH_OPTIONS = [
  'Sustantivo',
  'Pronombre',
  'Verbo',
  'Adjetivo',
  'Adverbio',
  'Preposición',
  'Conjunción',
  'Interjección',
  'Artículo/determinante',
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_OPTIONS)[number];

// Normalized part of speech mapping into the standard Spanish categories
export function normalizePartOfSpeech(pos: string): PartOfSpeech {
  const p = (pos || '').toLowerCase().trim();
  if (!p) return 'Sustantivo';
  if (p.includes('art') || p.includes('determ')) return 'Artículo/determinante';
  if (p.includes('adv')) return 'Adverbio';
  if (p.includes('adj')) return 'Adjetivo';
  if (p.includes('pron')) return 'Pronombre';
  if (p.includes('prep')) return 'Preposición';
  if (p.includes('conj')) return 'Conjunción';
  if (p.includes('interj') || p.includes('exclam')) return 'Interjección';
  if (p.includes('phrasal') || p.includes('verb')) return 'Verbo';
  if (p.includes('noun') || p.includes('sustantiv')) return 'Sustantivo';
  return 'Sustantivo';
}

export interface WordItem {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech | string;
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
  categoryGroups?: string[];
  categorySubs?: string[];
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
