import { Platform } from 'react-native';
import { MainNavTab } from '../types';
import { NavigationOptions, RouteListener } from './types';
import { getTabFromPath, getPathFromTab, getTitleFromTab, normalizePath } from './routes';

class UniversalRouter {
  private listeners: Set<RouteListener> = new Set();
  private currentTab: MainNavTab = 'vocabulary';
  private currentPath: string = '/';

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const initialTab = getTabFromPath(window.location.pathname);
      this.currentTab = initialTab;
      this.currentPath = getPathFromTab(initialTab);

      // Listen to browser Back / Forward buttons
      window.addEventListener('popstate', this.handlePopState);

      // Initial document title sync
      this.updateDocumentTitle(initialTab);

      // If loaded on an alias (e.g. /vocabulario or /tests), normalize URL cleanly without reload
      const raw = normalizePath(window.location.pathname);
      const canonical = getPathFromTab(initialTab);
      if (raw !== canonical && raw !== '/') {
        const search = window.location.search || '';
        window.history.replaceState(null, '', canonical + search);
      }
    }
  }

  private handlePopState = () => {
    if (typeof window === 'undefined') return;
    const tab = getTabFromPath(window.location.pathname);
    this.currentTab = tab;
    this.currentPath = window.location.pathname;
    this.updateDocumentTitle(tab);
    this.notify();
  };

  public getCurrentTab(): MainNavTab {
    return this.currentTab;
  }

  public getCurrentPath(): string {
    return this.currentPath;
  }

  public navigate(
    tabOrPath: MainNavTab | string,
    options?: NavigationOptions
  ): void {
    let targetTab: MainNavTab;
    let targetPath: string;

    if (this.isTab(tabOrPath)) {
      targetTab = tabOrPath;
      targetPath = getPathFromTab(targetTab);
    } else {
      targetTab = getTabFromPath(tabOrPath);
      targetPath = tabOrPath.startsWith('/') ? tabOrPath : `/${tabOrPath}`;
    }

    this.currentTab = targetTab;
    this.currentPath = targetPath;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const search = options?.search !== undefined ? options.search : window.location.search;
      const fullUrl = targetPath + (search ? (search.startsWith('?') ? search : `?${search}`) : '');

      if (options?.replace) {
        window.history.replaceState(null, '', fullUrl);
      } else {
        if (window.location.pathname !== targetPath || (search && window.location.search !== search)) {
          window.history.pushState(null, '', fullUrl);
        }
      }

      this.updateDocumentTitle(targetTab);
    }

    this.notify();
  }

  public updateDocumentTitle(tab: MainNavTab): void {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = getTitleFromTab(tab);
    }
  }

  public subscribe(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentTab, this.currentPath);
      } catch (err) {
        console.error('[UniversalRouter] Error in subscriber:', err);
      }
    }
  }

  private isTab(val: string): val is MainNavTab {
    return ['vocabulary', 'flashcards', 'test', 'stats', 'settings'].includes(val);
  }
}

export const router = new UniversalRouter();
