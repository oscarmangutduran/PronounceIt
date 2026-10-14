import * as Speech from 'expo-speech';
import { WordItem, CategoryItem, WordStatus } from '../types';
import { firebaseService } from './firebaseClient';
import { backendApi } from './apiClient';
import { appStorage } from './storage';

import { networkService } from './networkService';

const STORAGE_KEY_WORDS = 'pronounceit_vocab_words_v5';
const STORAGE_KEY_CATEGORIES = 'pronounceit_user_categories_v4';
const STORAGE_KEY_AUDIO_SETTINGS = 'pronounceit_audio_settings';

export interface AudioSettings {
  rate: number;
  pitch: number;
  voiceName: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [];

export function getWordCategories(word: Partial<WordItem>): string[] {
  if (Array.isArray(word.categoryGroups) && word.categoryGroups.length > 0) {
    return word.categoryGroups.map((c) => c.trim()).filter(Boolean);
  }
  if (word.categoryGroup) {
    return word.categoryGroup.split(',').map((c) => c.trim()).filter(Boolean);
  }
  return [];
}

export function getWordSubcategories(word: Partial<WordItem>): string[] {
  if (Array.isArray(word.categorySubs) && word.categorySubs.length > 0) {
    return word.categorySubs.map((s) => s.trim()).filter(Boolean);
  }
  if (word.categorySub) {
    return word.categorySub.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
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
      this.saveWordsToDisk();
      this.notify();
    });

    this.unsubscribeCategories = firebaseService.subscribeCategories(userKey, (remoteCats) => {
      if (remoteCats && Array.isArray(remoteCats)) {
        this.customCategories = remoteCats;
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

  public resetForNewUser(userId?: string) {
    this.words = [];
    this.customCategories = [];
    const targetKey = userId || this.getEffectiveUserKey();
    this.lastUserId = targetKey;
    try {
      appStorage.setItem(`pronounceit_vocab_words_u_${targetKey}`, JSON.stringify([]));
      appStorage.setItem(`pronounceit_user_categories_u_${targetKey}`, JSON.stringify([]));
    } catch {}
    if (targetKey !== 'guest') {
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
          this.saveWordsToDisk();
        }

        const remoteCats = await firebaseService.fetchCategories(userKey);
        if (remoteCats && Array.isArray(remoteCats) && remoteCats.length > 0) {
          this.customCategories = remoteCats;
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
        this.words = JSON.parse(stored);
      } else {
        // Every new user account begins with an empty vocabulary
        this.words = [];
        this.saveWords();
      }

      const storedCats = appStorage.getItem(this.getCategoriesStorageKey());
      if (storedCats) {
        this.customCategories = JSON.parse(storedCats);
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

  private saveCategories() {
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

  public getWords(): WordItem[] {
    return [...this.words];
  }

  public getCategories(): CategoryItem[] {
    // Ensure any words with categoryGroup / categoryGroups are represented
    for (const w of this.words) {
      const groups = getWordCategories(w);
      const subs = getWordSubcategories(w);
      for (const groupTrimmed of groups) {
        let cat = this.customCategories.find(
          (c) => c.name.toLowerCase() === groupTrimmed.toLowerCase()
        );
        if (!cat) {
          cat = {
            id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: groupTrimmed,
            icon: 'Folder',
            count: 0,
            subcategories: [],
          };
          this.customCategories.push(cat);
        }

        for (const subTrimmed of subs) {
          if (!cat.subcategories) cat.subcategories = [];
          const subExists = cat.subcategories.some(
            (s) => s.name.toLowerCase() === subTrimmed.toLowerCase()
          );
          if (!subExists) {
            cat.subcategories.push({
              id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: subTrimmed,
              count: 0,
            });
          }
        }
      }
    }

    return this.customCategories.map((cat) => {
      const groupWords = this.words.filter((w) =>
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

  public addCategory(name: string, initialSubcategories: string[] = []): CategoryItem {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre de la categoría es requerido.');

    const existing = this.customCategories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
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
    };
    this.customCategories = [...this.customCategories, newCat];
    this.saveCategories();
    return newCat;
  }

  public editCategory(categoryId: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat) return false;

    const oldName = cat.name;
    cat.name = trimmed;

    if (oldName.toLowerCase() !== trimmed.toLowerCase()) {
      let changed = false;
      this.words = this.words.map((w) => {
        if ((w.categoryGroup || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
          changed = true;
          return { ...w, categoryGroup: trimmed };
        }
        return w;
      });
      if (changed) {
        this.saveWords();
        backendApi.bulkSaveWords(this.words).catch(() => {});
      }
    }

    this.saveCategories();
    return true;
  }

  public deleteCategory(categoryId: string): { deletedCategory: CategoryItem | null; deletedWordsCount: number } {
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat) return { deletedCategory: null, deletedWordsCount: 0 };

    const catNameLower = cat.name.trim().toLowerCase();

    // Cascade delete: remove all words in this category
    const remainingWords = this.words.filter(
      (w) => (w.categoryGroup || '').trim().toLowerCase() !== catNameLower
    );
    const deletedWords = this.words.filter(
      (w) => (w.categoryGroup || '').trim().toLowerCase() === catNameLower
    );
    const deletedWordsCount = deletedWords.length;

    this.words = remainingWords;
    this.saveWords();

    deletedWords.forEach((dw) => {
      backendApi.deleteWord(dw.id).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.deleteWord(dw.id).catch(() => {});
      }
    });

    this.customCategories = this.customCategories.filter((c) => c.id !== categoryId);
    this.saveCategories();

    return { deletedCategory: cat, deletedWordsCount };
  }

  public addSubcategory(categoryId: string, subName: string): boolean {
    const trimmed = subName.trim();
    if (!trimmed) return false;
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat) return false;

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
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat) return false;
    if (!cat.subcategories) cat.subcategories = [];

    let addedAny = false;
    subNames.forEach((subName) => {
      const trimmed = subName.trim();
      if (!trimmed) return;
      const exists = cat.subcategories!.some(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!exists) {
        cat.subcategories!.push({
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
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.subcategories) return false;

    const sub = cat.subcategories.find((s) => s.id === subId);
    if (!sub) return false;

    const oldSubName = sub.name;
    sub.name = trimmed;

    if (oldSubName.toLowerCase() !== trimmed.toLowerCase()) {
      let changed = false;
      this.words = this.words.map((w) => {
        if (
          (w.categoryGroup || '').trim().toLowerCase() === cat.name.trim().toLowerCase() &&
          (w.categorySub || '').trim().toLowerCase() === oldSubName.trim().toLowerCase()
        ) {
          changed = true;
          return { ...w, categorySub: trimmed };
        }
        return w;
      });
      if (changed) {
        this.saveWords();
        backendApi.bulkSaveWords(this.words).catch(() => {});
      }
    }

    this.saveCategories();
    return true;
  }

  public deleteSubcategory(categoryId: string, subId: string): { deletedWordsCount: number } {
    const cat = this.customCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.subcategories) return { deletedWordsCount: 0 };

    const sub = cat.subcategories.find((s) => s.id === subId);
    if (!sub) return { deletedWordsCount: 0 };

    const catNameLower = cat.name.trim().toLowerCase();
    const subNameLower = sub.name.trim().toLowerCase();

    // Cascade delete words in this subcategory
    const remainingWords = this.words.filter(
      (w) =>
        !(
          (w.categoryGroup || '').trim().toLowerCase() === catNameLower &&
          (w.categorySub || '').trim().toLowerCase() === subNameLower
        )
    );
    const deletedWords = this.words.filter(
      (w) =>
        (w.categoryGroup || '').trim().toLowerCase() === catNameLower &&
        (w.categorySub || '').trim().toLowerCase() === subNameLower
    );
    const deletedWordsCount = deletedWords.length;

    this.words = remainingWords;
    this.saveWords();

    deletedWords.forEach((dw) => {
      backendApi.deleteWord(dw.id).catch(() => {});
      if (firebaseService.isFirebaseConnected()) {
        firebaseService.deleteWord(dw.id).catch(() => {});
      }
    });

    cat.subcategories = cat.subcategories.filter((s) => s.id !== subId);
    this.saveCategories();

    return { deletedWordsCount };
  }

  public addWord(wordData: Omit<WordItem, 'id'>): WordItem {
    const newWord: WordItem = {
      ...wordData,
      id: `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      srsIntervalDays: wordData.srsIntervalDays ?? 1,
    };

    this.pendingSyncIds.add(newWord.id);
    this.deletedWordIds.delete(newWord.id);

    this.words = [newWord, ...this.words];
    this.saveWords();

    backendApi.saveWord(newWord).catch((e) => console.warn('Backend saveWord error', e));

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

    backendApi.updateWord(id, updatedWord).catch((e) => console.warn('Backend updateWord error', e));

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.upsertWord(updatedWord).catch((e) => console.warn('Firebase upsertWord error', e));
    }

    return updatedWord;
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

      if (firebaseService.isFirebaseConnected()) {
        firebaseService.upsertWord(word).catch((e) => console.warn('Firebase updateStatus error', e));
      }
    }
  }

  public async clearAllWords() {
    this.words = [];
    this.customCategories = [];
    this.saveWords();
    this.saveCategories();
    await backendApi.clearAllWords().catch((e) => console.warn('Backend clear error', e));
    if (firebaseService.isFirebaseConnected()) {
      await firebaseService.syncAllWords([]).catch((e) => console.warn('Firebase reset sync error', e));
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
  public speak(text: string) {
    try {
      Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
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

  public clearAll(): void {
    this.words = [];
    this.customCategories = [];
    try {
      appStorage.removeItem(this.getWordsStorageKey());
      appStorage.removeItem(this.getCategoriesStorageKey());
      appStorage.removeItem('pronounceit_vocab_words_v5');
      appStorage.removeItem('pronounceit_user_categories_v4');
    } catch {}
    this.notify();
  }
}

export const vocabService = new VocabularyService();
