import React, { useState } from 'react';
import {
  Volume2,
  BookOpen,
  Layers,
  BarChart3,
  Settings,
  Search,
  LogOut,
  User,
  UserPen,
  ClipboardCheck,
} from 'lucide-react';
import { MainNavTab, UserProfile } from '../../types';

interface TopNavigationProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenEditProfile?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  searchTerm,
  onSearchChange,
  onOpenEditProfile,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initial = currentUser?.full_name?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'P';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#161124]/90 backdrop-blur-md border-b border-white/10 shadow-lg select-none">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* LEFT: Logo Wordmark & Main Tabs */}
        <div className="flex items-center gap-8 lg:gap-10">
          {/* Wordmark matching login style */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onTabChange('vocabulary')}
          >
            <div className="w-8 h-8 rounded-lg bg-[#e62e4c] flex items-center justify-center text-white shadow-md shadow-[#e62e4c]/40 group-hover:scale-105 transition-all">
              <Volume2 size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Pronounce<span className="text-[#e62e4c]">It</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onTabChange('vocabulary')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'vocabulary'
                  ? 'bg-[#e62e4c]/15 text-pink-200 border border-[#e62e4c]/40 shadow-[0_0_15px_rgba(230,46,76,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <BookOpen size={15} className={activeTab === 'vocabulary' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Vocabulario / Biblioteca</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('flashcards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'flashcards'
                  ? 'bg-[#e62e4c]/15 text-pink-200 border border-[#e62e4c]/40 shadow-[0_0_15px_rgba(230,46,76,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Layers size={15} className={activeTab === 'flashcards' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Práctica con Flashcards</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('test')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'test'
                  ? 'bg-[#e62e4c]/15 text-pink-200 border border-[#e62e4c]/40 shadow-[0_0_15px_rgba(230,46,76,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <ClipboardCheck size={15} className={activeTab === 'test' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Test</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('stats')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-[#e62e4c]/15 text-pink-200 border border-[#e62e4c]/40 shadow-[0_0_15px_rgba(230,46,76,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <BarChart3 size={15} className={activeTab === 'stats' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Estadísticas</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-[#e62e4c]/15 text-pink-200 border border-[#e62e4c]/40 shadow-[0_0_15px_rgba(230,46,76,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Settings size={15} className={activeTab === 'settings' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Configuración</span>
            </button>
          </nav>
        </div>

        {/* RIGHT: Quick Search, Streak Badge, Profile */}
        <div className="flex items-center gap-3">
          {/* Quick search input matching login style */}
          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar término o IPA..."
              className="w-56 lg:w-64 pl-9 pr-12 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 focus:bg-black/80 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#e62e4c] focus:border-[#e62e4c] transition-all"
            />
            <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-slate-400 select-none">
              ⌘K
            </span>
          </div>



          {/* User Avatar Circle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#e62e4c] via-[#ff3b59] to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-lg ring-2 ring-white/10 hover:ring-[#e62e4c]/50 transition-all cursor-pointer overflow-hidden"
              title="Cuenta de usuario"
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name || 'Foto de perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1c162e] border border-white/15 shadow-2xl py-2 z-50 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e62e4c] via-[#ff3b59] to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow ring-2 ring-white/10 overflow-hidden shrink-0">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || 'estudiante@pronounceit.com'}</p>

                  </div>
                </div>

                <div className="py-1 text-xs text-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      if (typeof onOpenEditProfile === 'function') {
                        onOpenEditProfile();
                      } else {
                        window.dispatchEvent(new CustomEvent('pronounceit:open-edit-profile'));
                      }
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors"
                  >
                    <UserPen size={14} className="text-[#ff4d6d]" />
                    <span className="font-medium">Editar perfil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors"
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
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <BarChart3 size={14} className="text-slate-400" />
                    <span>Mi progreso léxico</span>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} className="text-rose-400" />
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
