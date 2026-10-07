import * as Speech from 'expo-speech';
import { WordItem, CategoryItem, WordStatus } from '../types';
import { firebaseService } from './firebaseClient';
import { backendApi } from './apiClient';
import { appStorage } from './storage';

const STORAGE_KEY_WORDS = 'pronounceit_vocab_words_v2';
const STORAGE_KEY_AUDIO_SETTINGS = 'pronounceit_audio_settings';

export interface AudioSettings {
  rate: number;
  pitch: number;
  voiceName: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'grammar',
    name: 'Grammar',
    icon: 'BookOpen',
    count: 0,
    subcategories: [],
  },
  {
    id: 'readings',
    name: 'Readings',
    icon: 'FileText',
    count: 0,
    subcategories: [
      { id: 'the-little-prince', name: 'The little Prince', count: 0 },
    ],
  },
];

export const INITIAL_WORDS: WordItem[] = [];

class VocabularyService {
  private words: WordItem[] = [];
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
  }

  public async syncWithCloud(): Promise<void> {
    try {
      const isBackendLive = await backendApi.checkHealth();
      if (isBackendLive) {
        const serverWords = await backendApi.getWords();
        if (serverWords && serverWords.length > 0) {
          if (this.words.length === 0 || serverWords.length >= this.words.length) {
            this.words = serverWords;
            this.saveWords();
            this.notify();
            return;
          } else {
            await backendApi.bulkSaveWords(this.words);
          }
        } else if (this.words.length > 0) {
          await backendApi.bulkSaveWords(this.words);
        }
      }
    } catch (e) {
      console.warn('Backend sync warning:', e);
    }

    if (firebaseService.isFirebaseConnected()) {
      try {
        const remoteWords = await firebaseService.fetchWords();
        if (remoteWords !== null) {
          this.words = remoteWords;
          this.saveWords();
          this.notify();
          return;
        }
      } catch (e) {
        console.warn('Error syncing words with Firebase:', e);
      }
    }
  }

  private loadInitialData() {
    try {
      appStorage.removeItem('pronounceit_vocab_words_v1');
      const stored = appStorage.getItem(STORAGE_KEY_WORDS);
      if (stored) {
        this.words = JSON.parse(stored);
      } else {
        this.words = [...INITIAL_WORDS];
        this.saveWords();
      }

      const audioStored = appStorage.getItem(STORAGE_KEY_AUDIO_SETTINGS);
      if (audioStored) {
        this.audioSettings = JSON.parse(audioStored);
      }
    } catch {
      this.words = [...INITIAL_WORDS];
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
    const categoryMap = new Map<string, CategoryItem>();

    for (const cat of INITIAL_CATEGORIES) {
      const groupWords = this.words.filter((w) => w.categoryGroup === cat.name);
      const subMap = new Map<string, { id: string; name: string; count: number }>();

      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subWords = this.words.filter((w) => w.categoryGroup === cat.name && w.categorySub === sub.name);
          subMap.set(sub.name, {
            ...sub,
            count: subWords.length,
          });
        }
      }

      for (const w of groupWords) {
        if (w.categorySub && !subMap.has(w.categorySub)) {
          const subWords = groupWords.filter((gw) => gw.categorySub === w.categorySub);
          subMap.set(w.categorySub, {
            id: `sub-${w.categorySub.toLowerCase().replace(/\s+/g, '-')}`,
            name: w.categorySub,
            count: subWords.length,
          });
        }
      }

      categoryMap.set(cat.name, {
        ...cat,
        count: groupWords.length,
        subcategories: Array.from(subMap.values()),
      });
    }

    for (const w of this.words) {
      if (w.categoryGroup && !categoryMap.has(w.categoryGroup)) {
        const groupWords = this.words.filter((gw) => gw.categoryGroup === w.categoryGroup);
        const subMap = new Map<string, { id: string; name: string; count: number }>();

        for (const gw of groupWords) {
          if (gw.categorySub && !subMap.has(gw.categorySub)) {
            const subWords = groupWords.filter((sw) => sw.categorySub === gw.categorySub);
            subMap.set(gw.categorySub, {
              id: `sub-${gw.categorySub.toLowerCase().replace(/\s+/g, '-')}`,
              name: gw.categorySub,
              count: subWords.length,
            });
          }
        }

        categoryMap.set(w.categoryGroup, {
          id: `cat-${w.categoryGroup.toLowerCase().replace(/\s+/g, '-')}`,
          name: w.categoryGroup,
          icon: 'Folder',
          count: groupWords.length,
          subcategories: Array.from(subMap.values()),
        });
      }
    }

    return Array.from(categoryMap.values());
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

  public resetToDefault() {
    this.words = [...INITIAL_WORDS];
    this.saveWords();

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.syncAllWords(this.words).catch((e) => console.warn('Firebase reset sync error', e));
    }
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
}

export const vocabService = new VocabularyService();
