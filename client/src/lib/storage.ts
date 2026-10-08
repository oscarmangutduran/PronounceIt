import AsyncStorage from '@react-native-async-storage/async-storage';

class AppStorage {
  private cache: Map<string, string> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readyListeners: (() => void)[] = [];

  constructor() {
    // 1. On Web, eagerly populate cache from localStorage immediately so there's zero microtask delay
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            const val = window.localStorage.getItem(key);
            if (val !== null) {
              this.cache.set(key, val);
            }
          }
        }
      } catch {}
    }
  }

  public isReady(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        if (keys.length > 0) {
          const pairs = await AsyncStorage.multiGet(keys);
          pairs.forEach(([key, value]) => {
            if (value !== null) {
              this.cache.set(key, value);
            }
          });
        }
      } catch (e) {
        console.warn('AppStorage init error:', e);
      } finally {
        this.initialized = true;
        this.readyListeners.forEach((fn) => {
          try {
            fn();
          } catch {}
        });
        this.readyListeners = [];
      }
    })();

    return this.initPromise;
  }

  public onReady(fn: () => void): void {
    if (this.initialized) {
      fn();
    } else {
      this.readyListeners.push(fn);
    }
  }

  public getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.cache.set(key, value);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }

    AsyncStorage.setItem(key, value).catch((e) =>
      console.warn(`AsyncStorage setItem error for ${key}:`, e)
    );
  }

  public removeItem(key: string): void {
    this.cache.delete(key);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }

    AsyncStorage.removeItem(key).catch((e) =>
      console.warn(`AsyncStorage removeItem error for ${key}:`, e)
    );
  }

  public clear(): void {
    this.cache.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch {}
    }

    AsyncStorage.clear().catch((e) => console.warn('AsyncStorage clear error:', e));
  }
}

export const appStorage = new AppStorage();
