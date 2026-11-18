import * as Speech from 'expo-speech';
import { WordItem, CategoryItem, WordStatus } from '../types';
import { firebaseService } from './firebaseClient';
import { backendApi } from './apiClient';
import { appStorage } from './storage';
import { deduplicateCategories } from './categoryUtils';

import { networkService } from './networkService';
import { getWordLevel } from './dictionaryService';
import { notionService } from './notionService';

const STORAGE_KEY_WORDS = 'pronounceit_vocab_words_v5';
const STORAGE_KEY_CATEGORIES = 'pronounceit_user_categories_v4';
const STORAGE_KEY_AUDIO_SETTINGS = 'pronounceit_audio_settings';

export interface AudioSettings {
  rate: number;
  pitch: number;
  voiceName: string;
}

export interface DayStreakEntry {
  dateKey: string; // YYYY-MM-DD local
  dayLabel: string; // L, M, X, J, V, S, D
  dayNumber: number; // 1..31
  isToday: boolean;
  active: boolean;
  wordsCount: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  addedToday: boolean;
  todayWordsCount: number;
  last7Days: DayStreakEntry[];
}

function toLocalDateKey(dateInput: Date | string | number): string | null {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

function parseDateKeyLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export const INITIAL_CATEGORIES: CategoryItem[] = [];

export function getWordCategories(word: Partial<WordItem>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categoryGroups) && word.categoryGroups.length > 0) {
    raw.push(...word.categoryGroups);
  }
  if (word.categoryGroup) {
    raw.push(...word.categoryGroup.split(','));
  }
  if (Array.isArray((word as any).categories) && (word as any).categories.length > 0) {
    raw.push(...(word as any).categories.map((c: any) => (typeof c === 'string' ? c : c?.name)));
  }
  if ((word as any).category) {
    raw.push(...String((word as any).category).split(','));
  }
  if ((word as any).cat) {
    raw.push(...String((word as any).cat).split(','));
  }
  return Array.from(new Set(raw.map((c) => String(c || '').trim()).filter(Boolean)));
}

export function getWordSubcategories(word: Partial<WordItem>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categorySubs) && word.categorySubs.length > 0) {
    raw.push(...word.categorySubs.map((s) => String(s || '').trim()).filter(Boolean));
  }
  if (word.categorySub) {
    raw.push(...String(word.categorySub).split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (Array.isArray((word as any).subcategories) && (word as any).subcategories.length > 0) {
    raw.push(
      ...(word as any).subcategories.map((s: any) =>
        String(typeof s === 'string' ? s : s?.name || '').trim()
      ).filter(Boolean)
    );
  }
  if ((word as any).subcategory) {
    raw.push(...String((word as any).subcategory).split(',').map((s: string) => s.trim()).filter(Boolean));
  }
  if ((word as any).subCategory) {
    raw.push(...String((word as any).subCategory).split(',').map((s: string) => s.trim()).filter(Boolean));
  }
  if ((word as any).sub) {
    raw.push(...String((word as any).sub).split(',').map((s: string) => s.trim()).filter(Boolean));
  }
  return Array.from(
    new Set(raw.filter((s) => s.toLowerCase() !== 'general'))
  );
}

export const INITIAL_WORDS: WordItem[] = [];

class VocabularyService {
  private words: WordItem[] = [];
  private customCategories: CategoryItem[] = [];
  private listeners: (() => void)[] = [];
  private audioSettings: AudioSettings = {
    rate: 0.95,
    pitch: 1.0,
    voiceName: '',
  };
  private lastUserId: string = '';
  private unsubscribeWords?: () => void;
  private unsubscribeCategories?: () => void;
  private pendingSyncIds: Set<string> = new Set();
  private deletedWordIds: Set<string> = new Set();
  private activeLanguage: string = 'en';

  public setActiveLanguage(lang: string) {
    const clean = (lang || 'en').trim().toLowerCase();
    if (this.activeLanguage !== clean) {
      this.activeLanguage = clean;
      this.notify();
    }
  }

  public getActiveLanguage(): string {
    return this.activeLanguage || 'en';
  }

  constructor() {
    this.init();
  }

  public async init() {
    await appStorage.init();
    this.loadInitialData();
    this.initCloudSync();
  }

  private setupRealtimeListeners(userKey: string) {
    if (this.unsubscribeWords) {
      this.unsubscribeWords();
      this.unsubscribeWords = undefined;
    }
    if (this.unsubscribeCategories) {
      this.unsubscribeCategories();
      this.unsubscribeCategories = undefined;
    }

    if (!userKey || userKey === 'guest') return;

    this.unsubscribeWords = firebaseService.subscribeWords(userKey, (remoteWords) => {
      if (!remoteWords) return;

      const remoteIds = new Set(remoteWords.map((w) => w.id));
      const pendingLocalWords = this.words.filter(
        (w) => this.pendingSyncIds.has(w.id) && !remoteIds.has(w.id) && !this.deletedWordIds.has(w.id)
      );

      const merged = [...pendingLocalWords, ...remoteWords];
      merged.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      this.words = merged;
      this.reclassifyLegacyLevels();
      this.saveWordsToDisk();
      this.notify();
    });

    this.unsubscribeCategories = firebaseService.subscribeCategories(userKey, (remoteCats) => {
      if (remoteCats && Array.isArray(remoteCats)) {
        this.customCategories = deduplicateCategories(
          remoteCats.map((c: any) => ({
            ...c,
            language: (c.language || 'en').trim().toLowerCase(),
          }))
        );
        this.saveCategoriesToDisk();
        this.notify();
      }
    });
  }

  private saveWordsToDisk() {
    try {
      appStorage.setItem(this.getWordsStorageKey(), JSON.stringify(this.words));
    } catch (e) {
      console.error('Error saving words to storage', e);
    }
  }

  private saveCategoriesToDisk() {
    try {
      this.customCategories = deduplicateCategories(this.customCategories);
      appStorage.setItem(this.getCategoriesStorageKey(), JSON.stringify(this.customCategories));
    } catch (e) {
      console.error('Error saving categories to storage', e);
    }
  }

  private getEffectiveUserKey(): string {
    const user = firebaseService.getCurrentUser();
    if (user?.id) return user.id;
    if (user?.email) return user.email.trim().toLowerCase();
    return 'guest';
  }

  private getWordsStorageKey(): string {
    return `pronounceit_vocab_words_u_${this.getEffectiveUserKey()}`;
  }

  private getCategoriesStorageKey(): string {
    return `pronounceit_user_categories_u_${this.getEffectiveUserKey()}`;
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
        this.loadInitialData();
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
    this.loadInitialData();
    const currentKey = this.getEffectiveUserKey();
    if (currentKey !== 'guest') {
      this.setupRealtimeListeners(currentKey);
    }
  }

  public resetForNewUser(userId?: string, email?: string) {
    this.words = [];
    this.customCategories = [];
    const keys = new Set<string>();
    if (userId) keys.add(userId);
    if (email) keys.add(email.trim().toLowerCase());
    const currentKey = this.getEffectiveUserKey();
    if (currentKey) keys.add(currentKey);

    keys.forEach((k) => {
      try {
        appStorage.setItem(`pronounceit_vocab_words_u_${k}`, JSON.stringify([]));
        appStorage.setItem(`pronounceit_user_categories_u_${k}`, JSON.stringify([]));
      } catch {}
    });

    const targetKey = userId || currentKey;
    this.lastUserId = targetKey;
    if (targetKey && targetKey !== 'guest') {
      this.setupRealtimeListeners(targetKey);
    }
    this.notify();
  }

  public clearCurrentSession() {
    if (this.unsubscribeWords) {
      this.unsubscribeWords();
      this.unsubscribeWords = undefined;
    }
    if (this.unsubscribeCategories) {
      this.unsubscribeCategories();
      this.unsubscribeCategories = undefined;
    }
    this.words = [];
    this.customCategories = [];
    this.lastUserId = '';
    this.pendingSyncIds.clear();
    this.deletedWordIds.clear();
    this.notify();
  }

  public async syncWithCloud(): Promise<void> {
    if (!networkService.isOnline()) {
      return;
    }

    const currentUser = firebaseService.getCurrentUser();
    if (!currentUser) return;

    const userKey = this.getEffectiveUserKey();

    // Ensure real-time listeners are attached
    if (!this.unsubscribeWords && userKey !== 'guest') {
      this.setupRealtimeListeners(userKey);
    }

    // 1. Primary Cloud Sync via Firestore
    if (firebaseService.isFirebaseConnected() && userKey !== 'guest') {
      try {
        const remoteWords = await firebaseService.fetchWords(userKey);
        if (remoteWords && Array.isArray(remoteWords)) {
          const remoteIds = new Set(remoteWords.map((w) => w.id));

          // Find locally added words that are still pending sync to Firestore
          const localOnlyPending = this.words.filter(
            (w) => this.pendingSyncIds.has(w.id) && !remoteIds.has(w.id) && !this.deletedWordIds.has(w.id)
          );

          // Push pending offline words to Firestore
          for (const localWord of localOnlyPending) {
            await firebaseService.upsertWord(localWord).catch(() => {});
            this.pendingSyncIds.delete(localWord.id);
          }

          const merged = [...localOnlyPending, ...remoteWords];
          merged.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          this.words = merged;
          this.reclassifyLegacyLevels();
          this.saveWordsToDisk();
        }

        const remoteCats = await firebaseService.fetchCategories(userKey);
        if (remoteCats && Array.isArray(remoteCats)) {
          this.customCategories = deduplicateCategories(remoteCats);
          this.saveCategoriesToDisk();
        }
      } catch (e) {
        console.warn('[VocabStore] Error syncing with Firestore:', e);
      }
    }

    // 2. Secondary Sync via Express Backend (strictly for this user)
    if (currentUser?.id) {
      try {
        const isBackendLive = await backendApi.checkHealth();
        if (isBackendLive) {
          const serverWords = await backendApi.getWords(currentUser.id);
          if (serverWords && Array.isArray(serverWords) && serverWords.length > 0) {
            const wordsMap = new Map<string, WordItem>();
            this.words.forEach((w) => wordsMap.set(w.id, w));
            serverWords.forEach((w) => {
              if (!this.deletedWordIds.has(w.id) && !wordsMap.has(w.id)) {
                wordsMap.set(w.id, w);
                firebaseService.upsertWord(w).catch(() => {});
              }
            });
            this.words = Array.from(wordsMap.values());
          }
        }
      } catch (e) {
        console.warn('[VocabStore] Backend sync warning:', e);
      }
    }

    this.saveWords();
    this.saveCategories();
  }
  private loadInitialData() {
    try {
      const userKey = this.getEffectiveUserKey();
      this.lastUserId = userKey;

      const stored = appStorage.getItem(this.getWordsStorageKey());
      if (stored) {
        const rawWords = JSON.parse(stored);
        this.words = (Array.isArray(rawWords) ? rawWords : []).map((w: any) => ({
          ...w,
          language: (w.language || 'en').trim().toLowerCase(),
        }));
        if (this.reclassifyLegacyLevels() > 0) {
          this.saveWordsToDisk();
        }
      } else {
        // Every new user account begins with an empty vocabulary
        this.words = [];
        this.saveWords();
      }

      const storedCats = appStorage.getItem(this.getCategoriesStorageKey());
      if (storedCats) {
        const rawCats = JSON.parse(storedCats);
        this.customCategories = deduplicateCategories(
          (Array.isArray(rawCats) ? rawCats : []).map((c: any) => ({
            ...c,
            language: (c.language || 'en').trim().toLowerCase(),
          }))
        );
      } else {
        this.customCategories = [];
        this.saveCategories();
      }

      const audioStored = appStorage.getItem(STORAGE_KEY_AUDIO_SETTINGS);
      if (audioStored) {
        this.audioSettings = JSON.parse(audioStored);
      }
    } catch {
      this.words = [];
      this.customCategories = [];
    }
    this.notify();
  }

  /**
   * Older versions saved every new word with level 'B1' by default.
   * Recompute the real CEFR level for those words (idempotent: a genuine B1 word stays B1)
   * and push the corrected values to the cloud so web and APK stay in sync.
   * Returns the number of corrected words.
   */
  private reclassifyLegacyLevels(): number {
    const changed: WordItem[] = [];
    this.words = this.words.map((w) => {
      if (!w || !w.word) return w;
      if (w.level && w.level !== 'B1') return w;
      const estimated = getWordLevel(w.word);
      if (estimated === w.level) return w;
      const updated = { ...w, level: estimated };
      changed.push(updated);
      return updated;
    });

    if (changed.length > 0 && firebaseService.isFirebaseConnected()) {
      changed.forEach((w) => {
        firebaseService.upsertWord(w).catch(() => {});
        backendApi.updateWord(w.id, w).catch(() => {});
      });
    }
    return changed.length;
  }

  private saveCategories() {
    this.customCategories = deduplicateCategories(this.customCategories);
    try {
      appStorage.setItem(this.getCategoriesStorageKey(), JSON.stringify(this.customCategories));
    } catch (e) {
      console.error('Error saving categories', e);
    }
    if (firebaseService.isFirebaseConnected()) {
      firebaseService.saveCategories(this.customCategories).catch(() => {});
    }
    this.notify();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private saveWords() {
    try {
      appStorage.setItem(this.getWordsStorageKey(), JSON.stringify(this.words));
    } catch (e) {
      console.error('Error saving words to storage', e);
    }
    this.notify();
  }

  public getWords(language?: string): WordItem[] {
    const target = (language || this.activeLanguage || 'en').trim().toLowerCase();
    return this.words.filter((w) => (w.language || 'en').toLowerCase() === target);
  }

  public getAllWords(): WordItem[] {
    return [...this.words];
  }

  public getCategories(language?: string): CategoryItem[] {
    const target = (language || this.activeLanguage || 'en').trim().toLowerCase();
    const targetWords = this.getWords(target);

    // 1. Ensure internal list is strictly deduplicated
    this.customCategories = deduplicateCategories(this.customCategories);

    // 2. Filter categories relevant strictly to this target language
    const relevantCats: CategoryItem[] = [];
    for (const c of this.customCategories) {
      const catLang = (c.language || 'en').trim().toLowerCase();
      if (catLang === target) {
        relevantCats.push({
          ...c,
          subcategories: c.subcategories
            ? c.subcategories.filter((s) => s && s.name && s.name.trim().toLowerCase() !== 'general')
            : [],
        });
      }
    }

    // 3. Ensure any words in targetWords with categoryGroup / categoryGroups and subcategories are represented & persisted
    let needsPersistCategories = false;
    for (const w of targetWords) {
      const groups = getWordCategories(w);
      const subs = getWordSubcategories(w);
      for (const groupRaw of groups) {
        const groupTrimmed = groupRaw.trim();
        if (!groupTrimmed) continue;

        let cat = relevantCats.find(
          (c) => c.name.trim().toLowerCase() === groupTrimmed.toLowerCase()
        );
        if (!cat) {
          cat = {
            id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: groupTrimmed,
            icon: 'Folder',
            count: 0,
            subcategories: [],
            language: target,
          };
          relevantCats.push(cat);
          this.customCategories.push({ ...cat, subcategories: [] });
          needsPersistCategories = true;
        }

        for (const subRaw of subs) {
          const subTrimmed = subRaw.trim();
          if (!subTrimmed || subTrimmed.toLowerCase() === 'general') continue;
          if (!cat.subcategories) cat.subcategories = [];
          const subExists = cat.subcategories.some(
            (s) => s.name.trim().toLowerCase() === subTrimmed.toLowerCase()
          );
          if (!subExists) {
            const newSub = {
              id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: subTrimmed,
              count: 0,
            };
            cat.subcategories.push(newSub);
            const persistedCat = this.customCategories.find(
              (c) =>
                c.name.trim().toLowerCase() === groupTrimmed.toLowerCase() &&
                (c.language || 'en').trim().toLowerCase() === target
            );
            if (persistedCat) {
              if (!persistedCat.subcategories) persistedCat.subcategories = [];
              if (
                !persistedCat.subcategories.some(
                  (s) => s.name.trim().toLowerCase() === subTrimmed.toLowerCase()
                )
              ) {
                persistedCat.subcategories.push({ ...newSub });
                needsPersistCategories = true;
              }
            }
          }
        }
      }
    }

    if (needsPersistCategories) {
      this.saveCategoriesToDisk();
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.saveCategories(this.customCategories).catch(() => {});
      }
    }

    // 4. Final deduplication pass to guarantee uniqueness
    const deduplicated = deduplicateCategories(relevantCats);

    return deduplicated.map((cat) => {
      const groupWords = targetWords.filter((w) =>
        getWordCategories(w).some(
          (g) => g.trim().toLowerCase() === cat.name.trim().toLowerCase()
        )
      );
      const subcategories = (cat.subcategories || []).map((sub) => {
        const subWords = groupWords.filter((w) =>
          getWordSubcategories(w).some(
            (s) => s.trim().toLowerCase() === sub.name.trim().toLowerCase()
          )
        );
        return {
          ...sub,
          count: subWords.length,
        };
      });

      return {
        ...cat,
        count: groupWords.length,
        subcategories,
      };
    });
  }

  public addCategory(name: string, initialSubcategories: string[] = [], language?: string): CategoryItem {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre de la categoría es requerido.');
    const lang = (language || this.activeLanguage || 'en').trim().toLowerCase();

    this.customCategories = deduplicateCategories(this.customCategories);

    const existing = this.customCategories.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase() && (c.language || 'en').trim().toLowerCase() === lang
    );
    if (existing) {
      if (initialSubcategories && initialSubcategories.length > 0) {
        this.addSubcategories(existing.id, initialSubcategories);
      }
      return existing;
    }

    const validSubs = Array.from(
      new Set(
        initialSubcategories
          .map((s) => s.trim())
          .filter(Boolean)
      )
    ).map((subName, idx) => ({
      id: `sub_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: subName,
      count: 0,
    }));

    const newCat: CategoryItem = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      icon: 'Folder',
      count: 0,
      subcategories: validSubs,
      language: lang,
    };
    this.customCategories = deduplicateCategories([...this.customCategories, newCat]);
    this.saveCategories();
    return newCat;
  }

  public editCategory(categoryId: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();

    let cat = this.customCategories.find(
      (c) =>
        (c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
    );
    if (!cat) {
      const derived = this.getCategories(activeLang).find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      );
      if (!derived) return false;
      cat = { ...derived, language: activeLang };
      this.customCategories.push(cat);
    }

    const oldName = cat.name;
    const oldNameLower = oldName.trim().toLowerCase();

    this.customCategories.forEach((c) => {
      if (
        (c.id === cat!.id || c.name.trim().toLowerCase() === oldNameLower) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
      ) {
        c.name = trimmed;
      }
    });

    if (oldNameLower !== trimmed.toLowerCase()) {
      const updatedWords: WordItem[] = [];
      this.words = this.words.map((w) => {
        if ((w.language || 'en').trim().toLowerCase() !== activeLang) return w;
        const cats = getWordCategories(w);
        if (cats.some((c) => c.trim().toLowerCase() === oldNameLower)) {
          const nextCats = Array.from(
            new Set(cats.map((c) => (c.trim().toLowerCase() === oldNameLower ? trimmed : c.trim())))
          );
          const updated: WordItem = {
            ...w,
            categoryGroups: nextCats,
            categoryGroup: nextCats.join(', '),
          };
          updatedWords.push(updated);
          return updated;
        }
        return w;
      });
      if (updatedWords.length > 0) {
        this.saveWords();
        backendApi.bulkSaveWords(this.words).catch(() => {});
        updatedWords.forEach((uw) => {
          this.pendingSyncIds.add(uw.id);
          if (firebaseService.isFirebaseConnected()) {
            firebaseService.upsertWord(uw).catch(() => {});
          }
        });
      }
    }

    this.saveCategories();
    return true;
  }

  public deleteCategory(categoryId: string): { deletedCategory: CategoryItem | null; deletedWordsCount: number } {
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();
    const allCats = this.getCategories(activeLang);
    const cat =
      allCats.find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      ) ||
      this.customCategories.find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      );

    if (!cat) return { deletedCategory: null, deletedWordsCount: 0 };

    const catNameLower = cat.name.trim().toLowerCase();
    const deletedWords: WordItem[] = [];
    const updatedWords: WordItem[] = [];
    const remainingWords: WordItem[] = [];

    // Cascade delete or unassign words in this category for the active language
    this.words.forEach((w) => {
      const wordLang = (w.language || 'en').trim().toLowerCase();
      if (wordLang !== activeLang) {
        remainingWords.push(w);
        return;
      }

      const cats = getWordCategories(w);
      const matchesCat = cats.some((c) => c.trim().toLowerCase() === catNameLower);

      if (matchesCat) {
        const otherCats = cats.filter((c) => c.trim().toLowerCase() !== catNameLower);
        if (otherCats.length === 0) {
          deletedWords.push(w);
        } else {
          const updatedWord: WordItem = {
            ...w,
            categoryGroups: otherCats,
            categoryGroup: otherCats.join(', '),
          };
          updatedWords.push(updatedWord);
          remainingWords.push(updatedWord);
        }
      } else {
        remainingWords.push(w);
      }
    });

    const deletedWordsCount = deletedWords.length;
    this.words = remainingWords;
    this.saveWords();

    deletedWords.forEach((dw) => {
      this.deletedWordIds.add(dw.id);
      this.pendingSyncIds.delete(dw.id);
      backendApi.deleteWord(dw.id).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.deleteWord(dw.id).catch(() => {});
      }
    });

    updatedWords.forEach((uw) => {
      this.pendingSyncIds.add(uw.id);
      backendApi.saveWord(uw).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.upsertWord(uw).catch(() => {});
      }
    });

    this.customCategories = this.customCategories.filter(
      (c) =>
        c.id !== categoryId &&
        c.id !== cat.id &&
        !(
          c.name.trim().toLowerCase() === catNameLower &&
          (c.language || 'en').trim().toLowerCase() === activeLang
        )
    );
    this.saveCategories();

    return { deletedCategory: cat, deletedWordsCount };
  }

  public addSubcategory(categoryId: string, subName: string): boolean {
    const trimmed = subName.trim();
    if (!trimmed) return false;
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();
    let cat = this.customCategories.find(
      (c) =>
        (c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
    );
    if (!cat) {
      const derived = this.getCategories(activeLang).find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      );
      if (!derived) return false;
      cat = { ...derived, language: activeLang };
      this.customCategories.push(cat);
    }

    if (!cat.subcategories) cat.subcategories = [];
    const exists = cat.subcategories.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return false;

    cat.subcategories.push({
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      count: 0,
    });

    this.saveCategories();
    return true;
  }

  public addSubcategories(categoryId: string, subNames: string[]): boolean {
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();
    let cat = this.customCategories.find(
      (c) =>
        (c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
    );
    if (!cat) {
      const derived = this.getCategories(activeLang).find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      );
      if (!derived) return false;
      cat = { ...derived, language: activeLang };
      this.customCategories.push(cat);
    }
    if (!cat.subcategories) cat.subcategories = [];

    let addedAny = false;
    subNames.forEach((subName) => {
      const trimmed = subName.trim();
      if (!trimmed) return;
      const exists = cat!.subcategories!.some(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!exists) {
        cat!.subcategories!.push({
          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: trimmed,
          count: 0,
        });
        addedAny = true;
      }
    });

    if (addedAny) {
      this.saveCategories();
    }
    return addedAny;
  }

  public editSubcategory(categoryId: string, subId: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();
    let cat = this.customCategories.find(
      (c) =>
        (c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
    );
    if (!cat) {
      const derived = this.getCategories(activeLang).find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      );
      if (!derived) return false;
      cat = { ...derived, language: activeLang };
      this.customCategories.push(cat);
    }
    if (!cat.subcategories) return false;

    const sub = cat.subcategories.find((s) => s.id === subId || s.name.trim().toLowerCase() === subId.trim().toLowerCase());
    if (!sub) return false;

    const oldSubName = sub.name;
    sub.name = trimmed;

    if (oldSubName.toLowerCase() !== trimmed.toLowerCase()) {
      const updatedWords: WordItem[] = [];
      const catNameLower = cat.name.trim().toLowerCase();
      const oldSubLower = oldSubName.trim().toLowerCase();

      this.words = this.words.map((w) => {
        if ((w.language || 'en').trim().toLowerCase() !== activeLang) return w;
        const catMatches = getWordCategories(w).some((c) => c.trim().toLowerCase() === catNameLower);
        const subMatches = getWordSubcategories(w).some((s) => s.trim().toLowerCase() === oldSubLower);
        if (catMatches && subMatches) {
          const currentSubs = getWordSubcategories(w);
          const updatedSubs = currentSubs.map((s) => s.trim().toLowerCase() === oldSubLower ? trimmed : s);
          const updated: WordItem = {
            ...w,
            categorySubs: updatedSubs,
            categorySub: updatedSubs.join(', '),
          };
          updatedWords.push(updated);
          return updated;
        }
        return w;
      });
      if (updatedWords.length > 0) {
        this.saveWords();
        backendApi.bulkSaveWords(this.words).catch(() => {});
        updatedWords.forEach((uw) => {
          this.pendingSyncIds.add(uw.id);
          if (firebaseService.isFirebaseConnected()) {
            firebaseService.upsertWord(uw).catch(() => {});
          }
        });
      }
    }

    this.saveCategories();
    return true;
  }

  public deleteSubcategory(categoryId: string, subId: string): { deletedWordsCount: number } {
    const activeLang = (this.activeLanguage || 'en').trim().toLowerCase();
    const allCats = this.getCategories(activeLang);
    const cat =
      allCats.find(
        (c) => c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()
      ) ||
      this.customCategories.find(
        (c) =>
          (c.id === categoryId || c.name.trim().toLowerCase() === categoryId.trim().toLowerCase()) &&
          (c.language || 'en').trim().toLowerCase() === activeLang
      );
    if (!cat) return { deletedWordsCount: 0 };

    const sub = (cat.subcategories || []).find(
      (s) => s.id === subId || s.name.trim().toLowerCase() === subId.trim().toLowerCase()
    );
    const subNameLower = (sub ? sub.name : subId).trim().toLowerCase();
    if (!subNameLower) return { deletedWordsCount: 0 };

    const catNameLower = cat.name.trim().toLowerCase();

    // 1. Eliminar la subcategoría de la categoría y de cualquier categoría homónima en customCategories
    this.customCategories.forEach((c) => {
      if (
        (c.id === cat.id || c.name.trim().toLowerCase() === catNameLower) &&
        (c.language || 'en').trim().toLowerCase() === activeLang
      ) {
        if (c.subcategories && Array.isArray(c.subcategories)) {
          c.subcategories = c.subcategories.filter(
            (s) => s.id !== (sub?.id || subId) && s.id !== subId && s.name.trim().toLowerCase() !== subNameLower
          );
        }
      }
    });

    // 2. Identificar palabras asociadas a esta subcategoría
    const deletedWords: WordItem[] = [];
    const updatedWords: WordItem[] = [];
    const remainingWords: WordItem[] = [];

    this.words.forEach((w) => {
      if ((w.language || 'en').trim().toLowerCase() !== activeLang) {
        remainingWords.push(w);
        return;
      }
      const catMatches = getWordCategories(w).some((c) => c.trim().toLowerCase() === catNameLower);
      const subMatches = getWordSubcategories(w).some((s) => s.trim().toLowerCase() === subNameLower);

      if (catMatches && subMatches) {
        const subs = getWordSubcategories(w);
        const otherSubs = subs.filter((s) => s.trim().toLowerCase() !== subNameLower);

        // Si la palabra sólo pertenecía a esta subcategoría, se borra en cascada
        if (otherSubs.length === 0) {
          deletedWords.push(w);
        } else {
          // Si pertenecía a más subcategorías, se remueve la subcategoría eliminada para que no vuelva a recrearse
          const updatedWord: WordItem = {
            ...w,
            categorySubs: otherSubs,
            categorySub: otherSubs.join(', '),
          };
          updatedWords.push(updatedWord);
          remainingWords.push(updatedWord);
        }
      } else {
        remainingWords.push(w);
      }
    });

    const deletedWordsCount = deletedWords.length;
    this.words = remainingWords;
    this.saveWords();

    deletedWords.forEach((dw) => {
      this.deletedWordIds.add(dw.id);
      this.pendingSyncIds.delete(dw.id);
      backendApi.deleteWord(dw.id).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.deleteWord(dw.id).catch(() => {});
      }
    });

    updatedWords.forEach((uw) => {
      this.pendingSyncIds.add(uw.id);
      backendApi.saveWord(uw).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.upsertWord(uw).catch(() => {});
      }
    });

    this.saveCategories();

    return { deletedWordsCount };
  }

  public addWord(wordData: Omit<WordItem, 'id'>, language?: string): WordItem {
    const lang = (wordData.language || language || this.activeLanguage || 'en').trim().toLowerCase();
    const newWord: WordItem = {
      ...wordData,
      language: lang,
      id: `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      srsIntervalDays: wordData.srsIntervalDays ?? 1,
    };

    this.pendingSyncIds.add(newWord.id);
    this.deletedWordIds.delete(newWord.id);

    this.recordStreakToday();

    this.words = [newWord, ...this.words];
    this.saveWords();

    backendApi.saveWord(newWord).catch((e) => console.warn('Backend saveWord error', e));
    notionService.syncWordIfConfigured(newWord, this.getCategories(lang)).catch((e) => console.warn('Notion syncWord error', e));

    if (firebaseService.isFirebaseConnected()) {
      firebaseService
        .upsertWord(newWord)
        .then(() => {
          this.pendingSyncIds.delete(newWord.id);
        })
        .catch((e) => console.warn('Firebase upsertWord error', e));
    }

    return newWord;
  }

  public updateWord(id: string, updates: Partial<Omit<WordItem, 'id'>>): WordItem | null {
    const idx = this.words.findIndex((w) => w.id === id);
    if (idx === -1) return null;

    const updatedWord: WordItem = {
      ...this.words[idx],
      ...updates,
    };

    this.words[idx] = updatedWord;
    this.saveWords();

    const lang = (updatedWord.language || this.activeLanguage || 'en').trim().toLowerCase();
    backendApi.updateWord(id, updatedWord).catch((e) => console.warn('Backend updateWord error', e));
    notionService.syncWordIfConfigured(updatedWord, this.getCategories(lang)).catch((e) => console.warn('Notion updateWord error', e));

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.upsertWord(updatedWord).catch((e) => console.warn('Firebase upsertWord error', e));
    }

    return updatedWord;
  }

  /**
   * Ensures all categories and subcategories from both local words and Notion pages
   * are created in PronounceIt, and links their corresponding words to those subcategories.
   */
  public mergeFromNotionSync(
    notionWords?: Partial<WordItem>[],
    language?: string
  ): {
    createdCategoriesCount: number;
    createdSubcategoriesCount: number;
    importedWordsCount: number;
    updatedWordsCount: number;
  } {
    const targetLang = (language || this.activeLanguage || 'en').trim().toLowerCase();
    let createdCategoriesCount = 0;
    let createdSubcategoriesCount = 0;
    let importedWordsCount = 0;
    let updatedWordsCount = 0;

    const ensureCatAndSubs = (catNames: string[], subNames: string[]) => {
      const validCats = catNames.map((c) => c.trim()).filter(Boolean);
      const validSubs = subNames
        .map((s) => s.trim())
        .filter((s) => Boolean(s) && s.toLowerCase() !== 'general');

      for (const catName of validCats.length > 0 ? validCats : ['General']) {
        let cat = this.customCategories.find(
          (c) =>
            c.name.trim().toLowerCase() === catName.toLowerCase() &&
            (c.language || 'en').trim().toLowerCase() === targetLang
        );
        if (!cat) {
          cat = {
            id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: catName,
            icon: 'Folder',
            count: 0,
            subcategories: [],
            language: targetLang,
          };
          this.customCategories.push(cat);
          createdCategoriesCount += 1;
        }
        if (!cat.subcategories) cat.subcategories = [];

        for (const subName of validSubs) {
          const exists = cat.subcategories.some(
            (s) => s.name.trim().toLowerCase() === subName.toLowerCase()
          );
          if (!exists) {
            cat.subcategories.push({
              id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: subName,
              count: 0,
            });
            createdSubcategoriesCount += 1;
          }
        }
      }
    };

    // 1. Clean legacy 'General' subcategory on local words and ensure their categories/subcategories exist
    const wordsToPushFirebase: WordItem[] = [];
    this.words = this.words.map((w) => {
      if ((w.language || 'en').trim().toLowerCase() !== targetLang) return w;
      const cats = getWordCategories(w);
      const subs = getWordSubcategories(w);
      ensureCatAndSubs(cats, subs);

      const cleanSubStr = subs.join(', ');
      if (w.categorySub !== cleanSubStr || JSON.stringify(w.categorySubs || []) !== JSON.stringify(subs)) {
        const cleanedWord: WordItem = {
          ...w,
          categoryGroups: cats.length > 0 ? cats : ['General'],
          categoryGroup: (cats.length > 0 ? cats : ['General']).join(', '),
          categorySubs: subs,
          categorySub: cleanSubStr,
        };
        wordsToPushFirebase.push(cleanedWord);
        return cleanedWord;
      }
      return w;
    });

    // 2. Merge words and subcategories coming from Notion
    if (Array.isArray(notionWords) && notionWords.length > 0) {
      for (const nw of notionWords) {
        const wordText = String(nw?.word || '').trim();
        if (!wordText) continue;

        const nwCats = getWordCategories(nw);
        const nwSubs = getWordSubcategories(nw);
        const hasRealCategory = nwCats.some((c) => c.toLowerCase() !== 'general');
        const hasRealSubcategory = nwSubs.length > 0;

        const existingIdx = this.words.findIndex(
          (w) =>
            (w.language || 'en').trim().toLowerCase() === targetLang &&
            w.word.trim().toLowerCase() === wordText.toLowerCase()
        );

        // Only auto-create categories/subcategories or import new words from Notion if they have a real category or subcategory
        if (hasRealCategory || hasRealSubcategory) {
          ensureCatAndSubs(nwCats, nwSubs);
        }

        if (existingIdx === -1) {
          if (!hasRealCategory && !hasRealSubcategory) {
            continue;
          }
          const finalCats = nwCats.filter((c) => c.toLowerCase() !== 'general');
          const resolvedCats = finalCats.length > 0 ? finalCats : ['General'];
          const newWord: WordItem = {
            id: `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            word: wordText,
            translation: String(nw.translation || wordText).trim(),
            language: targetLang,
            ipa: String(nw.ipa || '').trim(),
            phoneticGuide: String(nw.phoneticGuide || '').trim() || `"${wordText.toLowerCase()}"`,
            definition: String(nw.translation || wordText).trim(),
            exampleEn: String(nw.exampleEn || '').trim(),
            exampleEs: String(nw.exampleEs || '').trim(),
            level: (nw.level as any) || getWordLevel(wordText),
            partOfSpeech: (nw.partOfSpeech as any) || 'Sustantivo',
            status: (nw.status as WordStatus) || 'nueva',
            isFavorite: false,
            categoryGroups: resolvedCats,
            categoryGroup: resolvedCats.join(', '),
            categorySubs: nwSubs,
            categorySub: nwSubs.join(', '),
            createdAt: new Date().toISOString(),
            srsIntervalDays: 1,
          };
          this.pendingSyncIds.add(newWord.id);
          this.words.unshift(newWord);
          wordsToPushFirebase.push(newWord);
          importedWordsCount += 1;
        } else {
          const existingWord = this.words[existingIdx];
          const localCats = getWordCategories(existingWord);
          const localSubs = getWordSubcategories(existingWord);

          const mergedSubs = Array.from(new Set([...localSubs, ...nwSubs]));
          const mergedCats =
            localCats.length === 1 &&
            localCats[0].toLowerCase() === 'general' &&
            nwCats.some((c) => c.toLowerCase() !== 'general')
              ? nwCats.filter((c) => c.toLowerCase() !== 'general')
              : Array.from(new Set([...localCats, ...nwCats.filter((c) => c.toLowerCase() !== 'general')]));
          const finalCats = mergedCats.length > 0 ? mergedCats : ['General'];

          ensureCatAndSubs(finalCats, mergedSubs);

          const subsChanged =
            JSON.stringify(localSubs) !== JSON.stringify(mergedSubs) ||
            existingWord.categorySub !== mergedSubs.join(', ');
          const catsChanged =
            JSON.stringify(localCats) !== JSON.stringify(finalCats) ||
            existingWord.categoryGroup !== finalCats.join(', ');

          if (subsChanged || catsChanged) {
            const updated: WordItem = {
              ...existingWord,
              categoryGroups: finalCats,
              categoryGroup: finalCats.join(', '),
              categorySubs: mergedSubs,
              categorySub: mergedSubs.join(', '),
            };
            this.words[existingIdx] = updated;
            wordsToPushFirebase.push(updated);
            updatedWordsCount += 1;
          }
        }
      }
    }

    this.saveWords();
    this.saveCategories();

    if (wordsToPushFirebase.length > 0) {
      wordsToPushFirebase.forEach((w) => {
        backendApi.saveWord(w).catch(() => {});
        if (firebaseService.isFirebaseConnected()) {
          firebaseService.upsertWord(w).catch(() => {});
        }
      });
    }

    return {
      createdCategoriesCount,
      createdSubcategoriesCount,
      importedWordsCount,
      updatedWordsCount,
    };
  }

  public deleteWord(id: string): boolean {
    const idx = this.words.findIndex((w) => w.id === id);
    if (idx === -1) return false;

    this.words = this.words.filter((w) => w.id !== id);
    this.pendingSyncIds.delete(id);
    this.deletedWordIds.add(id);
    this.saveWords();

    backendApi.deleteWord(id).catch((e) => console.warn('Backend deleteWord error', e));

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.deleteWord(id).catch((e) => console.warn('Firebase deleteWord error', e));
    }

    return true;
  }

  public deleteLanguageBoard(langCode: string): { deletedWordsCount: number; deletedCategoriesCount: number } {
    const cleanLang = (langCode || '').trim().toLowerCase();
    if (!cleanLang) return { deletedWordsCount: 0, deletedCategoriesCount: 0 };

    const wordsToDelete = this.words.filter((w) => (w.language || 'en').toLowerCase() === cleanLang);
    this.words = this.words.filter((w) => (w.language || 'en').toLowerCase() !== cleanLang);

    wordsToDelete.forEach((w) => {
      this.pendingSyncIds.delete(w.id);
      this.deletedWordIds.add(w.id);
      backendApi.deleteWord(w.id).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.deleteWord(w.id).catch(() => {});
      }
    });

    const categoriesToDelete = this.customCategories.filter((c) => (c.language || 'en').toLowerCase() === cleanLang);
    this.customCategories = this.customCategories.filter((c) => (c.language || 'en').toLowerCase() !== cleanLang);

    this.saveWords();
    this.saveCategories();

    if (this.activeLanguage.toLowerCase() === cleanLang) {
      const remainingLanguages = Array.from(new Set(this.words.map((w) => (w.language || 'en').toLowerCase())));
      this.activeLanguage = remainingLanguages[0] || 'en';
    }

    this.notify();
    return { deletedWordsCount: wordsToDelete.length, deletedCategoriesCount: categoriesToDelete.length };
  }

  public toggleFavorite(id: string) {
    const word = this.words.find((w) => w.id === id);
    if (word) {
      word.isFavorite = !word.isFavorite;
      this.saveWords();

      backendApi.updateWord(id, word).catch((e) => console.warn('Backend updateWord fav error', e));

      if (firebaseService.isFirebaseConnected()) {
        firebaseService.upsertWord(word).catch((e) => console.warn('Firebase toggleFavorite error', e));
      }
    }
  }

  public updateStatus(id: string, status: WordStatus) {
    const word = this.words.find((w) => w.id === id);
    if (word) {
      word.status = status;
      word.lastReviewedAt = new Date().toISOString();
      this.saveWords();

      backendApi.updateWord(id, word).catch((e) => console.warn('Backend updateWord status error', e));
      notionService.syncWordIfConfigured(word).catch((e) => console.warn('Notion updateStatus error', e));

      if (firebaseService.isFirebaseConnected()) {
        firebaseService.upsertWord(word).catch((e) => console.warn('Firebase updateStatus error', e));
      }
    }
  }

  public async clearAllWords() {
    this.words = [];
    this.customCategories = [];
    this.pendingSyncIds.clear();
    this.deletedWordIds.clear();

    try {
      appStorage.removeMatching(/^pronounceit_vocab_words_/);
      appStorage.removeMatching(/^pronounceit_user_categories_/);
    } catch {}

    this.saveWords();
    this.saveCategories();

    await backendApi.clearAllWords().catch((e) => console.warn('Backend clear error', e));

    if (firebaseService.isFirebaseConnected()) {
      await firebaseService.clearAllWordsAndCategories().catch((e) => console.warn('Firebase clearAllWordsAndCategories error', e));
    }

    this.notify();
  }

  public resetToDefault() {
    this.clearAllWords();
  }

  public async pushAllWordsToFirebase(): Promise<{ success: boolean; count: number; message: string }> {
    if (!firebaseService.isFirebaseConnected()) {
      return { success: false, count: 0, message: 'Firebase no está conectado aún.' };
    }
    try {
      const ok = await firebaseService.syncAllWords(this.words);
      if (ok) {
        return {
          success: true,
          count: this.words.length,
          message: `¡${this.words.length} palabras sincronizadas con éxito en Firestore!`,
        };
      }
      return { success: false, count: 0, message: 'No se pudo completar la sincronización en Firestore.' };
    } catch (err: any) {
      return { success: false, count: 0, message: err?.message || 'Error al sincronizar con Firebase.' };
    }
  }

  // Audio / Speech Synthesis via Expo Speech
  public speak(text: string, langCode?: string) {
    try {
      const code = (langCode || this.activeLanguage || 'en').trim().toLowerCase();
      const speechLocaleMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-PT',
        ru: 'ru-RU',
        zh: 'zh-CN',
        ja: 'ja-JP',
        ar: 'ar-SA',
      };
      Speech.stop();
      Speech.speak(text, {
        language: speechLocaleMap[code] || code,
        rate: this.audioSettings.rate || 0.95,
        pitch: this.audioSettings.pitch || 1.0,
      });
    } catch (e) {
      console.warn('Speech.speak error:', e);
    }
  }

  public getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }

  public updateAudioSettings(settings: Partial<AudioSettings>) {
    this.audioSettings = { ...this.audioSettings, ...settings };
    try {
      appStorage.setItem(STORAGE_KEY_AUDIO_SETTINGS, JSON.stringify(this.audioSettings));
    } catch {}
    this.notify();
  }

  private getStreakStorageKey(): string {
    return `pronounceit_streak_days_u_${this.getEffectiveUserKey()}`;
  }

  public recordStreakToday(): void {
    const todayKey = toLocalDateKey(new Date());
    if (!todayKey) return;
    try {
      const key = this.getStreakStorageKey();
      const raw = appStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(todayKey)) {
        list.push(todayKey);
        appStorage.setItem(key, JSON.stringify(list));
      }
    } catch {}
  }

  public getStreakStats(): StreakStats {
    const countsByDate = new Map<string, number>();
    const activeDaysSet = new Set<string>();

    // 1. Load persisted streak days for this user
    try {
      const raw = appStorage.getItem(this.getStreakStorageKey());
      if (raw) {
        const storedDays: string[] = JSON.parse(raw);
        if (Array.isArray(storedDays)) {
          storedDays.forEach((dk) => {
            if (typeof dk === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dk)) {
              activeDaysSet.add(dk);
            }
          });
        }
      }
    } catch {}

    // 2. Scan all words created by the user
    this.words.forEach((w) => {
      if (!w.createdAt) return;
      const dk = toLocalDateKey(w.createdAt);
      if (dk) {
        activeDaysSet.add(dk);
        countsByDate.set(dk, (countsByDate.get(dk) || 0) + 1);
      }
    });

    const now = new Date();
    const todayKey = toLocalDateKey(now) || '';
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);
    const yesterdayKey = toLocalDateKey(yesterday) || '';

    const addedToday = activeDaysSet.has(todayKey);
    const todayWordsCount = countsByDate.get(todayKey) || (addedToday ? 1 : 0);

    // 3. Compute current streak (consecutive days up to today, or up to yesterday if today not yet added)
    let currentStreak = 0;
    if (addedToday || activeDaysSet.has(yesterdayKey)) {
      const cursor = addedToday
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
        : yesterday;

      while (true) {
        const key = toLocalDateKey(cursor);
        if (key && activeDaysSet.has(key)) {
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 4. Compute longest streak across all recorded dates
    const sortedKeys = Array.from(activeDaysSet).sort();
    let longestStreak = 0;
    let currentRun = 0;
    let prevDate: Date | null = null;

    for (const key of sortedKeys) {
      const currDate = parseDateKeyLocal(key);
      if (!prevDate) {
        currentRun = 1;
      } else {
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
        if (diffDays === 1) {
          currentRun += 1;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      }
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
      prevDate = currDate;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // 5. Build last 7 days calendar strip
    const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const last7Days: DayStreakEntry[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
      const dk = toLocalDateKey(d) || '';
      const isAct = activeDaysSet.has(dk);
      last7Days.push({
        dateKey: dk,
        dayLabel: dayLabels[d.getDay()],
        dayNumber: d.getDate(),
        isToday: i === 0,
        active: isAct,
        wordsCount: countsByDate.get(dk) || (isAct ? 1 : 0),
      });
    }

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: activeDaysSet.size,
      addedToday,
      todayWordsCount,
      last7Days,
    };
  }

  public clearAll(): void {
    this.words = [];
    this.customCategories = [];
    this.pendingSyncIds.clear();
    this.deletedWordIds.clear();
    try {
      appStorage.removeMatching(/^pronounceit_vocab_words_/);
      appStorage.removeMatching(/^pronounceit_user_categories_/);
    } catch {}
    this.notify();
  }
}

export const vocabService = new VocabularyService();
