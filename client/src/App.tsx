import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Copyright,
  Heart,
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Settings,
} from 'lucide-react';
import { MainNavTab, WordItem, WordStatus, UserProfile } from './types';
import { firebaseService } from './lib/firebaseClient';
import { vocabService } from './lib/vocabularyStore';

// Auth Gatekeeper
import { LoginView } from './components/auth/LoginView';

// Core Primary Workspace Components (Eagerly loaded for instant first paint)
import { TopNavigation } from './components/workspace/TopNavigation';
import { SidebarCategories, SelectedFilter } from './components/workspace/SidebarCategories';
import { VocabularyTableView } from './components/workspace/VocabularyTableView';

// Code-split dynamic views (Loaded on-demand to reduce main bundle size)
const FlashcardPracticeView = lazy(() =>
  import('./components/workspace/FlashcardPracticeView').then((m) => ({ default: m.FlashcardPracticeView }))
);
const TestView = lazy(() =>
  import('./components/workspace/TestView').then((m) => ({ default: m.TestView }))
);
const StatsDashboardView = lazy(() =>
  import('./components/workspace/StatsDashboardView').then((m) => ({ default: m.StatsDashboardView }))
);
const SettingsView = lazy(() =>
  import('./components/workspace/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const AddWordModal = lazy(() =>
  import('./components/workspace/AddWordModal').then((m) => ({ default: m.AddWordModal }))
);
const ExportImportModal = lazy(() =>
  import('./components/workspace/ExportImportModal').then((m) => ({ default: m.ExportImportModal }))
);
const EditProfileModal = lazy(() =>
  import('./components/workspace/EditProfileModal').then((m) => ({ default: m.EditProfileModal }))
);

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-8 animate-fadeIn">
    <div className="w-12 h-12 rounded-2xl bg-[#e62e4c]/10 border border-[#e62e4c]/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(230,46,76,0.25)] animate-pulse">
      <div className="w-5 h-5 border-2 border-[#e62e4c] border-t-transparent rounded-full animate-spin" />
    </div>
    <p className="text-sm font-medium text-slate-300">Cargando módulo...</p>
    <p className="text-xs text-slate-400 mt-1">Optimizando rendimiento</p>
  </div>
);

export default function App() {
  // Restore user session and profile picture across reloads and visits
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return firebaseService.getCurrentUser();
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const remembered = localStorage.getItem('pronounceit_remember_me') === 'true';
    const user = firebaseService.getCurrentUser();
    return Boolean(user && (remembered || localStorage.getItem('pronounceit_firebase_user_v1')));
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<MainNavTab>('vocabulary');

  // Vocabulary & Categories state
  const [words, setWords] = useState<WordItem[]>([]);
  const [categories, setCategories] = useState(vocabService.getCategories());
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>({
    type: 'all',
  });

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Left sidebar collapsed state (default collapsed on mobile screens < 768px)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('pronounceit_sidebar_collapsed');
      if (stored !== null) return stored === 'true';
      return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pronounceit_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  // Load words and subscribe to changes
  useEffect(() => {
    setWords(vocabService.getWords());
    setCategories(vocabService.getCategories());

    const unsubVocab = vocabService.subscribe(() => {
      setWords(vocabService.getWords());
      setCategories(vocabService.getCategories());
    });

    const unsubAuth = firebaseService.subscribe(() => {
      setCurrentUser(firebaseService.getCurrentUser());
    });

    const handleOpenEdit = () => setIsEditProfileOpen(true);
    window.addEventListener('pronounceit:open-edit-profile', handleOpenEdit);

    return () => {
      unsubVocab();
      unsubAuth();
      window.removeEventListener('pronounceit:open-edit-profile', handleOpenEdit);
    };
  }, []);

  // Global keyboard shortcuts (Space: Audio, N: New word, P: Practice)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const activeWord = words[0];
        if (activeWord) vocabService.speak(activeWord.word);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingWord(null);
        setIsAddModalOpen(true);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setActiveTab('flashcards');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, words]);

  // Auth logout handler
  const handleLogout = async () => {
    await firebaseService.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('vocabulary');
  };

  // Word operations
  const handleSaveWord = (wordData: Omit<WordItem, 'id'>) => {
    if (editingWord) {
      vocabService.updateWord(editingWord.id, wordData);
      setEditingWord(null);
    } else {
      vocabService.addWord(wordData);
    }
  };

  const handleEditWord = (word: WordItem) => {
    setEditingWord(word);
    setIsAddModalOpen(true);
  };

  const handleToggleFavorite = (id: string) => {
    vocabService.toggleFavorite(id);
  };

  const handleUpdateStatus = (id: string, status: WordStatus) => {
    vocabService.updateStatus(id, status);
  };

  const handleDeleteWord = (id: string) => {
    vocabService.deleteWord(id);
  };

  const handleImportWords = (newWords: WordItem[]) => {
    newWords.forEach((nw) => {
      if (nw.word && nw.translation) {
        vocabService.addWord(nw);
      }
    });
  };

  // Computed counts for sidebar
  const totalWords = words.length;
  const favoritesCount = words.filter((w) => w.isFavorite).length;
  const reviewCount = words.filter((w) => w.status === 'en_repaso').length;
  const masteredCount = words.filter((w) => w.status === 'dominada').length;

  // Gatekeeper: El usuario SIEMPRE inicia en la pantalla de Login
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginView
        onSuccess={() => {
          setIsAuthenticated(true);
          setCurrentUser(firebaseService.getCurrentUser());
          setActiveTab('vocabulary');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0c18] text-white flex flex-col font-sans selection:bg-[#e62e4c] selection:text-white relative overflow-x-hidden">
      {/* Subtle atmospheric ambient glow matching login screen */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-10 filter blur-3xl scale-110 pointer-events-none"
        style={{ backgroundImage: `url('/assets/login_hero.jpg?v=3')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#0a0712] via-[#0f0c18]/90 to-[#120e20]/95 pointer-events-none" />

      {/* Content wrapper with relative z-index */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 1. Header Top Navigation */}
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          searchTerm={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
        />

        {/* 2. Main Workspace Body Container */}
        <main className="flex-1 max-w-[1720px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col pb-24 md:pb-8">
          {activeTab === 'vocabulary' && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Left Sidebar: Categories & Retención Lexical Card */}
              <SidebarCategories
                categories={categories}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                totalWords={totalWords}
                favoritesCount={favoritesCount}
                reviewCount={reviewCount}
                masteredCount={masteredCount}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                onAddNewCategory={() => {
                  setEditingWord(null);
                  setIsAddModalOpen(true);
                }}
              />

              {/* Right Main Table */}
              <VocabularyTableView
                words={words}
                selectedFilter={selectedFilter}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
                onOpenAddModal={() => {
                  setEditingWord(null);
                  setIsAddModalOpen(true);
                }}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onStartPractice={() => setActiveTab('flashcards')}
                onEditWord={handleEditWord}
                onToggleFavorite={handleToggleFavorite}
                onUpdateStatus={handleUpdateStatus}
                onDeleteWord={handleDeleteWord}
              />
            </div>
          )}

          {/* Tab 2: Práctica con Flashcards */}
          {activeTab === 'flashcards' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <FlashcardPracticeView
                words={words}
                onBackToVocabulary={() => setActiveTab('vocabulary')}
                onUpdateStatus={handleUpdateStatus}
              />
            </Suspense>
          )}

          {/* Tab 3: Evaluación y Tests por Nivel */}
          {activeTab === 'test' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <TestView
                words={words}
                onBackToVocabulary={() => setActiveTab('vocabulary')}
              />
            </Suspense>
          )}

          {/* Tab 4: Estadísticas */}
          {activeTab === 'stats' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <StatsDashboardView words={words} />
            </Suspense>
          )}

          {/* Tab 5: Configuración */}
          {activeTab === 'settings' && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <SettingsView
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            </Suspense>
          )}
        </main>

        {/* 3. Bottom Footer */}
        <footer className="w-full bg-[#130f1e]/90 border-t border-white/10 py-4 px-4 sm:px-6 pb-24 md:pb-4 text-xs text-slate-400 select-none">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center flex-wrap justify-center sm:justify-start gap-2 text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Copyright size={13} className="text-slate-400 shrink-0" />
                <span>PronounceIt</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span>Desarrollado con</span>
                <Heart size={13} className="text-[#e62e4c] fill-[#e62e4c] shrink-0 animate-pulse" />
                <span className="text-white font-medium">Oscar Mangut Dev</span>
              </span>
            </div>
            <div className="flex items-center flex-wrap justify-center sm:justify-end gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                Aplicaciones recomendadas:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.duolingo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all group"
                  title="Duolingo - Aprende idiomas"
                >
                  <img
                    src="/assets/duolingo.png"
                    alt="Duolingo logo"
                    className="w-4 h-4 rounded object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-medium">Duolingo</span>
                </a>

                <a
                  href="https://beespeaker.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all group"
                  title="BeeSpeaker - Práctica de conversación con IA"
                >
                  <img
                    src="/assets/beespeaker.png"
                    alt="BeeSpeaker logo"
                    className="w-4 h-4 rounded object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-medium">BeeSpeaker</span>
                </a>

                <a
                  href="https://wlingua.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all group"
                  title="Wlingua - Cursos de inglés"
                >
                  <img
                    src="/assets/wlingua.png"
                    alt="Wlingua logo"
                    className="w-4 h-4 rounded object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-medium">Wlingua</span>
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* 4. Mobile / Tablet Bottom Navigation Bar (md:hidden) */}
        <nav
          aria-label="Navegación principal móvil"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#140f21]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.7)]"
        >
          {/* Tab 1: Vocabulario */}
          <button
            type="button"
            onClick={() => setActiveTab('vocabulary')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'vocabulary'
                ? 'text-[#ff4d6d]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform ${
                activeTab === 'vocabulary'
                  ? 'bg-[#e62e4c]/20 shadow-[0_0_12px_rgba(230,46,76,0.35)] scale-110'
                  : ''
              }`}
            >
              <BookOpen size={18} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Vocabulario</span>
          </button>

          {/* Tab 2: Flashcards */}
          <button
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'text-[#ff4d6d]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform ${
                activeTab === 'flashcards'
                  ? 'bg-[#e62e4c]/20 shadow-[0_0_12px_rgba(230,46,76,0.35)] scale-110'
                  : ''
              }`}
            >
              <Layers size={18} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Flashcards</span>
          </button>

          {/* Tab 3: Test */}
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'text-[#ff4d6d]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform ${
                activeTab === 'test'
                  ? 'bg-[#e62e4c]/20 shadow-[0_0_12px_rgba(230,46,76,0.35)] scale-110'
                  : ''
              }`}
            >
              <ClipboardCheck size={18} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Test</span>
          </button>

          {/* Tab 4: Estadísticas */}
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'text-[#ff4d6d]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform ${
                activeTab === 'stats'
                  ? 'bg-[#e62e4c]/20 shadow-[0_0_12px_rgba(230,46,76,0.35)] scale-110'
                  : ''
              }`}
            >
              <BarChart3 size={18} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Progreso</span>
          </button>

          {/* Tab 5: Ajustes */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[#ff4d6d]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-transform ${
                activeTab === 'settings'
                  ? 'bg-[#e62e4c]/20 shadow-[0_0_12px_rgba(230,46,76,0.35)] scale-110'
                  : ''
              }`}
            >
              <Settings size={18} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Ajustes</span>
          </button>
        </nav>
      </div>

      {/* Add / Edit Word Modal */}
      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddWordModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingWord(null);
            }}
            onSave={handleSaveWord}
            initialWord={editingWord}
            categories={categories}
            defaultCategoryGroup={selectedFilter.type === 'category' ? selectedFilter.group : undefined}
            defaultCategorySub={selectedFilter.type === 'category' ? selectedFilter.sub : undefined}
          />
        </Suspense>
      )}

      {/* Export / Import Modal */}
      {isExportModalOpen && (
        <Suspense fallback={null}>
          <ExportImportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            words={words}
            onImportWords={handleImportWords}
          />
        </Suspense>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <Suspense fallback={null}>
          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            currentUser={currentUser}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
          />
        </Suspense>
      )}
    </div>
  );
}
