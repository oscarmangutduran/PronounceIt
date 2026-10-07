import AsyncStorage from '@react-native-async-storage/async-storage';

class AppStorage {
  private cache: Map<string, string> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

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
      }
    })();

    return this.initPromise;
  }

  public getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.cache.set(key, value);
    AsyncStorage.setItem(key, value).catch((e) =>
      console.warn(`AsyncStorage setItem error for ${key}:`, e)
    );
  }

  public removeItem(key: string): void {
    this.cache.delete(key);
    AsyncStorage.removeItem(key).catch((e) =>
      console.warn(`AsyncStorage removeItem error for ${key}:`, e)
    );
  }

  public clear(): void {
    this.cache.clear();
    AsyncStorage.clear().catch((e) => console.warn('AsyncStorage clear error:', e));
  }
}

export const appStorage = new AppStorage();
