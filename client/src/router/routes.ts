import { MainNavTab } from '../types';
import { RouteConfig } from './types';

export const APP_ROUTES: RouteConfig[] = [
  {
    path: '/',
    tab: 'vocabulary',
    title: 'PronounceIt - Vocabulario',
    description: 'Gestión y biblioteca personal de vocabulario',
    aliases: ['/vocabulario', '/vocabulary', '/inicio', '/home', '/biblioteca'],
  },
  {
    path: '/flashcards',
    tab: 'flashcards',
    title: 'PronounceIt - Flashcards',
    description: 'Repaso espaciado interactivo con tarjetas de práctica',
    aliases: ['/tarjetas', '/practica', '/cards'],
  },
  {
    path: '/test',
    tab: 'test',
    title: 'PronounceIt - Tests',
    description: 'Evaluación de vocabulario por categorías y tipos',
    aliases: ['/tests', '/quiz', '/evaluacion', '/examen'],
  },
  {
    path: '/estadisticas',
    tab: 'stats',
    title: 'PronounceIt - Estadísticas',
    description: 'Panel de métricas y seguimiento del progreso',
    aliases: ['/stats', '/progreso', '/metricas'],
  },
  {
    path: '/configuracion',
    tab: 'settings',
    title: 'PronounceIt - Configuración',
    description: 'Ajustes de cuenta, idioma e inteligencia artificial',
    aliases: ['/settings', '/ajustes', '/perfil'],
  },
];

/**
 * Normaliza cualquier ruta URL a un formato estándar
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath) return '/';
  const clean = rawPath.split('?')[0].split('#')[0].trim();
  const lower = clean.toLowerCase();
  if (lower === '' || lower === '/') return '/';
  return lower.replace(/\/+$/, '');
}

/**
 * Resuelve una ruta al MainNavTab correspondiente
 */
export function getTabFromPath(pathname: string): MainNavTab {
  const normalized = normalizePath(pathname);

  // Coincidencia exacta de ruta o de sus alias en castellano/inglés
  for (const route of APP_ROUTES) {
    if (route.path === normalized) {
      return route.tab;
    }
    if (route.aliases && route.aliases.some((alias) => normalizePath(alias) === normalized)) {
      return route.tab;
    }
  }

  // Coincidencia por prefijo
  for (const route of APP_ROUTES) {
    if (route.path !== '/' && normalized.startsWith(route.path)) {
      return route.tab;
    }
    if (route.aliases) {
      for (const alias of route.aliases) {
        const normAlias = normalizePath(alias);
        if (normAlias !== '/' && normalized.startsWith(normAlias)) {
          return route.tab;
        }
      }
    }
  }

  // Raíz por defecto: vocabulario
  return 'vocabulary';
}

/**
 * Obtiene la ruta canónica en castellano para cada pestaña:
 * - Vocabulario -> '/' (la raíz como se solicitó)
 * - Flashcards -> '/flashcards' (o /tarjetas)
 * - Test -> '/test' (o /evaluacion)
 * - Estadísticas -> '/estadisticas'
 * - Configuración -> '/configuracion'
 */
export function getPathFromTab(tab: MainNavTab): string {
  switch (tab) {
    case 'vocabulary':
      return '/';
    case 'flashcards':
      return '/flashcards';
    case 'test':
      return '/test';
    case 'stats':
      return '/estadisticas';
    case 'settings':
      return '/configuracion';
    default:
      return '/';
  }
}

/**
 * Devuelve el título del documento en castellano para cada pestaña
 */
export function getTitleFromTab(tab: MainNavTab): string {
  const route = APP_ROUTES.find((r) => r.tab === tab);
  return route ? route.title : 'PronounceIt';
}
