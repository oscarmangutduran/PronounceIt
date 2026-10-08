import { Platform } from 'react-native';

export type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkService {
  private online: boolean = true;
  private listeners: NetworkStatusListener[] = [];
  private checkInterval: any = null;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Web navigator status
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.online = navigator.onLine ?? true;

      window.addEventListener('online', () => {
        this.setOnline(true);
      });

      window.addEventListener('offline', () => {
        this.setOnline(false);
      });
    }

    // 2. Periodic lightweight connectivity check (ping / 204)
    this.checkConnectivity();
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 15000);
  }

  public async checkConnectivity(): Promise<boolean> {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setOnline(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      // Fast, lightweight standard connectivity check (0 bytes response)
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      const isLive = res.status === 204 || res.ok;
      this.setOnline(isLive);
      return isLive;
    } catch {
      // If generate_204 fails (e.g. strict firewall or offline), try quick fallback
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const isLive = Boolean(navigator.onLine);
        this.setOnline(isLive);
        return isLive;
      }
      this.setOnline(false);
      return false;
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public setOnline(val: boolean) {
    if (this.online !== val) {
      this.online = val;
      this.notify();
    }
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.push(listener);
    listener(this.online);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l(this.online);
      } catch (err) {
        console.warn('Network listener error:', err);
      }
    });
  }
}

export const networkService = new NetworkService();
