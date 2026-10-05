import React from 'react';
import { Home, PlusCircle, BarChart2, User } from 'lucide-react';
import { ActiveScreen } from '../../types';

interface BottomTabBarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  pendingCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentScreen,
  onNavigate,
  pendingCount,
}) => {
  return (
    <nav
      aria-label="Navegación principal de la app móvil"
      className="relative z-30 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around"
    >
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
          currentScreen === 'home'
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <div className="relative">
          <Home size={20} strokeWidth={currentScreen === 'home' ? 2.5 : 1.8} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
              {pendingCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-1 tracking-tight">Inicio</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('stats')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
          currentScreen === 'stats'
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <BarChart2 size={20} strokeWidth={currentScreen === 'stats' ? 2.5 : 1.8} />
        <span className="text-[10px] mt-1 tracking-tight">Métricas</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
          currentScreen === 'profile'
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <User size={20} strokeWidth={currentScreen === 'profile' ? 2.5 : 1.8} />
        <span className="text-[10px] mt-1 tracking-tight">Perfil</span>
      </button>
    </nav>
  );
};
