import { WordItem, CategoryItem, WordStatus } from '../types';
import { firebaseService } from './firebaseClient';

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
    if (firebaseService.isFirebaseConnected()) {
      try {
        const remoteWords = await firebaseService.fetchWords();
        if (remoteWords !== null) {
          // Utilizar estrictamente lo que hay almacenado en Firebase
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
      localStorage.removeItem('pronounceit_vocab_words_v1');
      const stored = localStorage.getItem(STORAGE_KEY_WORDS);
      if (stored) {
        this.words = JSON.parse(stored);
      } else {
        this.words = [...INITIAL_WORDS];
        this.saveWords();
      }

      const audioStored = localStorage.getItem(STORAGE_KEY_AUDIO_SETTINGS);
      if (audioStored) {
        this.audioSettings = JSON.parse(audioStored);
      }
    } catch {
      this.words = [...INITIAL_WORDS];
    }
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
      localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(this.words));
    } catch (e) {
      console.error('Error saving words to storage', e);
    }
    this.notify();
  }

  public getWords(): WordItem[] {
    return [...this.words];
  }

  public getCategories(): CategoryItem[] {
    // Dynamic categories incorporating INITIAL_CATEGORIES and any user-created categories in words
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

      // Also include any subcategories in words for this category that weren't in initial
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

    // Include any custom categories present in words
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

  public addWord(word: Omit<WordItem, 'id'>): WordItem {
    const newWord: WordItem = {
      ...word,
      id: `w-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.words.unshift(newWord);
    this.saveWords();

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.upsertWord(newWord).catch((e) => console.warn('Firebase upsertWord error', e));
    }
    return newWord;
  }

  public updateWord(id: string, updates: Partial<WordItem>): WordItem | null {
    const index = this.words.findIndex((w) => w.id === id);
    if (index === -1) return null;
    this.words[index] = { ...this.words[index], ...updates };
    this.saveWords();

    const updated = this.words[index];
    if (firebaseService.isFirebaseConnected()) {
      firebaseService.upsertWord(updated).catch((e) => console.warn('Firebase updateWord error', e));
    }
    return updated;
  }

  public deleteWord(id: string) {
    this.words = this.words.filter((w) => w.id !== id);
    this.saveWords();

    if (firebaseService.isFirebaseConnected()) {
      firebaseService.deleteWord(id).catch((e) => console.warn('Firebase deleteWord error', e));
    }
  }

  public toggleFavorite(id: string) {
    const word = this.words.find((w) => w.id === id);
    if (word) {
      word.isFavorite = !word.isFavorite;
      this.saveWords();

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

  // Audio / Speech Synthesis
  public speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = this.audioSettings.rate || 0.95;
    utterance.pitch = this.audioSettings.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (this.audioSettings.voiceName) {
      const selected = voices.find((v) => v.name === this.audioSettings.voiceName);
      if (selected) utterance.voice = selected;
    } else {
      const preferred = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (preferred) utterance.voice = preferred;
    }

    window.speechSynthesis.speak(utterance);
  }

  public getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }

  public updateAudioSettings(settings: Partial<AudioSettings>) {
    this.audioSettings = { ...this.audioSettings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY_AUDIO_SETTINGS, JSON.stringify(this.audioSettings));
    } catch {}
    this.notify();
  }
}

export const vocabService = new VocabularyService();
