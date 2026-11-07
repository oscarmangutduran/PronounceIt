import { MainNavTab } from '../types';

export type AppPath =
  | '/'
  | '/flashcards'
  | '/test'
  | '/stats'
  | '/settings'
  | '/vocabulario'
  | '/vocabulary'
  | '/practica'
  | '/tests'
  | '/estadisticas'
  | '/configuracion';

export interface RouteConfig {
  path: string;
  tab: MainNavTab;
  title: string;
  aliases?: string[];
  description?: string;
}

export interface NavigationOptions {
  replace?: boolean;
  search?: string;
}

export type RouteListener = (tab: MainNavTab, path: string) => void;
