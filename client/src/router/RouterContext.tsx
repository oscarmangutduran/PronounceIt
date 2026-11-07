import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MainNavTab } from '../types';
import { NavigationOptions } from './types';
import { router } from './router';

interface RouterContextValue {
  activeTab: MainNavTab;
  currentPath: string;
  navigate: (target: MainNavTab | string, options?: NavigationOptions) => void;
  goHome: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<MainNavTab>(router.getCurrentTab());
  const [currentPath, setCurrentPath] = useState<string>(router.getCurrentPath());

  useEffect(() => {
    const unsubscribe = router.subscribe((tab, path) => {
      setActiveTab(tab);
      setCurrentPath(path);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      activeTab,
      currentPath,
      navigate: (target, options) => router.navigate(target, options),
      goHome: () => router.navigate('vocabulary'),
    }),
    [activeTab, currentPath]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    // Return direct router fallback if rendered outside provider
    return {
      activeTab: router.getCurrentTab(),
      currentPath: router.getCurrentPath(),
      navigate: (target, options) => router.navigate(target, options),
      goHome: () => router.navigate('vocabulary'),
    };
  }
  return context;
}
