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

  constructor() {
    this.init();
  }

  public async init() {
    await appStorage.init();
    this.loadInitialData();
    this.initCloudSync();
  }

  private initCloudSync() {
    this.syncWithCloud();
    firebaseService.subscribe(() => {
      this.syncWithCloud();
    });
    networkService.subscribe((isOnline) => {
      if (isOnline) {
        this.syncWithCloud();
      }
    });
  }

  public reloadFromStorage() {
    this.loadInitialData();
  }

  public async syncWithCloud(): Promise<void> {
    if (!networkService.isOnline()) {
      return;
    }

    try {
      const isBackendLive = await backendApi.checkHealth();
      if (isBackendLive) {
        const serverWords = await backendApi.getWords();
        if (serverWords !== null) {
          const map = new Map<string, WordItem>();
          serverWords.forEach((w) => map.set(w.id, w));
          this.words.forEach((w) => map.set(w.id, w));
          this.words = Array.from(map.values());
          this.saveWords();
          this.notify();
          backendApi.bulkSaveWords(this.words).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.warn('Backend sync warning:', e);
    }

    if (firebaseService.isFirebaseConnected()) {
      try {
        const remoteWords = await (firebaseService as any).fetchWords?.();
        if (remoteWords && Array.isArray(remoteWords)) {
          const map = new Map<string, WordItem>();
          remoteWords.forEach((w: WordItem) => map.set(w.id, w));
          this.words.forEach((w) => map.set(w.id, w));
          this.words = Array.from(map.values());
          this.saveWords();
          this.notify();
          (firebaseService as any).syncWordsToFirestore?.(this.words).catch(() => {});
          return;
        }
      } catch (e) {
        console.warn('Error syncing words with Firebase:', e);
      }
    }
  }

  private loadInitialData() {
    try {
      // Clean up all legacy storage versions so user starts with a completely clean slate
      [
        'pronounceit_vocab_words_v1',
        'pronounceit_vocab_words_v2',
        'pronounceit_vocab_words_v3',
        'pronounceit_vocab_words_v4',
        'pronounceit_categories_v1',
        'pronounceit_categories_v2',
        'pronounceit_user_categories_v1',
        'pronounceit_user_categories_v2',
        'pronounceit_user_categories_v3',
      ].forEach((key) => appStorage.removeItem(key));

      const stored = appStorage.getItem(STORAGE_KEY_WORDS);
      if (stored) {
        this.words = JSON.parse(stored);
      } else {
        this.words = [];
        this.saveWords();
      }

      const storedCats = appStorage.getItem(STORAGE_KEY_CATEGORIES);
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
      appStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(this.customCategories));
    } catch (e) {
      console.error('Error saving categories', e);
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
      appStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(this.words));
    } catch (e) {
      console.error('Error saving words to storage', e);
    }
    this.notify();
  }

  public getWords(): WordItem[] {
    return [...this.words];
  }

  public getCategories(): CategoryItem[] {
    // Ensure any words with categoryGroup are represented
    for (const w of this.words) {
      if (w.categoryGroup?.trim()) {
        const groupTrimmed = w.categoryGroup.trim();
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

        if (w.categorySub?.trim()) {
          const subTrimmed = w.categorySub.trim();
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
      const groupWords = this.words.filter(
        (w) => (w.categoryGroup || '').trim().toLowerCase() === cat.name.trim().toLowerCase()
      );
      const subcategories = (cat.subcategories || []).map((sub) => {
        const subWords = groupWords.filter(
          (w) => (w.categorySub || '').trim().toLowerCase() === sub.name.trim().toLowerCase()
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

  public addCategory(name: string): CategoryItem {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre de la categoría es requerido.');

    const existing = this.customCategories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const newCat: CategoryItem = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      icon: 'Folder',
      count: 0,
      subcategories: [],
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

    this.words = [newWord, ...this.words];
    this.saveWords();

    backendApi.saveWord(newWord).catch((e) => console.warn('Backend saveWord error', e));

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.upsertWord(newWord).catch((e) => console.warn('Firebase upsertWord error', e));
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
      appStorage.removeItem(STORAGE_KEY_WORDS);
      appStorage.removeItem(STORAGE_KEY_CATEGORIES);
    } catch {}
    this.notify();
  }
}

export const vocabService = new VocabularyService();
