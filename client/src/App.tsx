import React, { useState, useEffect } from 'react';
import { MainNavTab, WordItem, WordStatus, UserProfile } from './types';
import { supabaseService } from './lib/supabaseClient';
import { vocabService } from './lib/vocabularyStore';

// Auth Gatekeeper
import { LoginView } from './components/auth/LoginView';

// Workspace Components styled matching Login aesthetic
import { TopNavigation } from './components/workspace/TopNavigation';
import { SidebarCategories, SelectedFilter } from './components/workspace/SidebarCategories';
import { VocabularyTableView } from './components/workspace/VocabularyTableView';
import { FlashcardPracticeView } from './components/workspace/FlashcardPracticeView';
import { TestView } from './components/workspace/TestView';
import { StatsDashboardView } from './components/workspace/StatsDashboardView';
import { SettingsView } from './components/workspace/SettingsView';
import { AddWordModal } from './components/workspace/AddWordModal';
import { ExportImportModal } from './components/workspace/ExportImportModal';
import { SupabaseConfigModal } from './components/supabase/SupabaseConfigModal';

export default function App() {
  // Always start unauthenticated on app launch so login is always shown first
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<MainNavTab>('vocabulary');

  // Vocabulary & Categories state
  const [words, setWords] = useState<WordItem[]>([]);
  const [categories, setCategories] = useState(vocabService.getCategories());
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>({
    type: 'category',
    group: 'Negocios & Trabajo',
    sub: 'Reuniones & Negociación',
  });

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Left sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pronounceit_sidebar_collapsed') === 'true';
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

    const unsubAuth = supabaseService.subscribe(() => {
      setCurrentUser(supabaseService.getCurrentUser());
    });

    return () => {
      unsubVocab();
      unsubAuth();
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
    await supabaseService.signOut();
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
          setCurrentUser(supabaseService.getCurrentUser());
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
        style={{ backgroundImage: `url('/assets/login_hero.jpg')` }}
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
        />

        {/* 2. Main Workspace Body Container */}
        <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
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
            <FlashcardPracticeView
              words={words}
              onBackToVocabulary={() => setActiveTab('vocabulary')}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {/* Tab 3: Evaluación y Tests por Nivel */}
          {activeTab === 'test' && (
            <TestView
              words={words}
              onBackToVocabulary={() => setActiveTab('vocabulary')}
            />
          )}

          {/* Tab 4: Estadísticas */}
          {activeTab === 'stats' && <StatsDashboardView words={words} />}

          {/* Tab 5: Configuración */}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            />
          )}
        </main>

        {/* 3. Bottom Footer */}
        <footer className="w-full bg-[#130f1e]/90 border-t border-white/10 py-4 px-6 text-xs text-slate-400 select-none">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="text-slate-300">© 2025 PronounceIt Workspace. Precision Lexical &amp; Pronunciation Mastery.</p>
            <p className="flex items-center gap-2 text-slate-400">
              <span>IPA System: Standard International</span>
              <span>·</span>
              <span className="text-amber-400 font-semibold">SRS v2.4</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Add / Edit Word Modal */}
      <AddWordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingWord(null);
        }}
        onSave={handleSaveWord}
        initialWord={editingWord}
      />

      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        words={words}
        onImportWords={handleImportWords}
      />

      {/* Supabase Connection Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
