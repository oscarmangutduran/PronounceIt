import React, { useState } from 'react';
import {
  Volume2,
  BookOpen,
  Layers,
  BarChart3,
  Settings,
  Search,
  Flame,
  LogOut,
  User,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { MainNavTab, UserProfile } from '../../types';

interface TopNavigationProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenSearchModal?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  searchTerm,
  onSearchChange,
  onOpenSearchModal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initial = currentUser?.full_name?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'P';

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs select-none">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* LEFT: Logo Wordmark & Main Tabs */}
        <div className="flex items-center gap-8 lg:gap-10">
          {/* Wordmark matching screenshot */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('vocabulary')}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
              <Volume2 size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Pronounce<span className="text-indigo-600">It</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onTabChange('vocabulary')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'vocabulary'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BookOpen size={15} className={activeTab === 'vocabulary' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Vocabulario / Biblioteca</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('flashcards')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Layers size={15} className={activeTab === 'flashcards' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Práctica con Flashcards</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('stats')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BarChart3 size={15} className={activeTab === 'stats' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Estadísticas</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Settings size={15} className={activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Configuración</span>
            </button>
          </nav>
        </div>

        {/* RIGHT: Quick Search, Streak Badge, Profile */}
        <div className="flex items-center gap-3">
          {/* Quick search input matching screenshot */}
          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar término o IPA..."
              className="w-56 lg:w-64 pl-9 pr-12 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-500 select-none">
              ⌘K
            </span>
          </div>

          {/* Streak Badge matching screenshot: 🔥 14 días */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-700 font-semibold text-xs shadow-2xs">
            <Flame size={15} className="text-orange-500 fill-orange-500 animate-pulse" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold">14</span>
              <span className="text-[11px] font-medium text-orange-600">días</span>
            </div>
          </div>

          {/* User Avatar Circle matching screenshot */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-xs ring-2 ring-indigo-50 hover:ring-indigo-100 transition-all cursor-pointer"
              title="Cuenta de usuario"
            >
              {initial}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'estudiante@pronounceit.com'}</p>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60">
                    <ShieldCheck size={11} />
                    <span>Plan Pro · SRS Activado</span>
                  </div>
                </div>

                <div className="py-1 text-xs text-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>Ajustes de pronunciación</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('stats');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 size={14} className="text-slate-400" />
                    <span>Mi progreso léxico</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} className="text-red-500" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
