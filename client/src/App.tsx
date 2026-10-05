import React, { useState, useEffect } from 'react';
import { MainNavTab, WordItem, WordStatus, UserProfile } from './types';
import { supabaseService } from './lib/supabaseClient';
import { vocabService } from './lib/vocabularyStore';

// Auth Gatekeeper
import { LoginView } from './components/auth/LoginView';

// Workspace Components matching user screenshot
import { TopNavigation } from './components/workspace/TopNavigation';
import { SidebarCategories, SelectedFilter } from './components/workspace/SidebarCategories';
import { VocabularyTableView } from './components/workspace/VocabularyTableView';
import { FlashcardPracticeView } from './components/workspace/FlashcardPracticeView';
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
      // Don't trigger if user is typing in an input or textarea
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
    <div className="min-h-screen bg-[#f8f9fc] text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header Top Navigation matching screenshot */}
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
              onAddNewCategory={() => {
                setEditingWord(null);
                setIsAddModalOpen(true);
              }}
            />

            {/* Right Main Table matching user screenshot */}
            <VocabularyTableView
              words={words}
              selectedFilter={selectedFilter}
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

        {/* Tab 3: Estadísticas */}
        {activeTab === 'stats' && <StatsDashboardView words={words} />}

        {/* Tab 4: Configuración */}
        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        )}
      </main>

      {/* 3. Bottom Footer matching user screenshot */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 px-6 text-xs text-slate-400 select-none">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>© 2025 PronounceIt Workspace. Precision Lexical &amp; Pronunciation Mastery.</p>
          <p className="flex items-center gap-2">
            <span>IPA System: Standard International</span>
            <span>·</span>
            <span>SRS v2.4</span>
          </p>
        </div>
      </footer>

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
