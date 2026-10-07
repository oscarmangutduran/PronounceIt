import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Settings,
} from 'lucide-react-native';

import { MainNavTab, WordItem, WordStatus, UserProfile } from './types';
import { firebaseService } from './lib/firebaseClient';
import { vocabService } from './lib/vocabularyStore';
import { appStorage } from './lib/storage';
import { THEME } from './theme';

// Auth View
import { LoginView } from './components/auth/LoginView';

// Workspace Views
import { TopNavigation } from './components/workspace/TopNavigation';
import { SidebarCategories, SelectedFilter } from './components/workspace/SidebarCategories';
import { VocabularyTableView } from './components/workspace/VocabularyTableView';
import { FlashcardPracticeView } from './components/workspace/FlashcardPracticeView';
import { TestView } from './components/workspace/TestView';
import { StatsDashboardView } from './components/workspace/StatsDashboardView';
import { SettingsView } from './components/workspace/SettingsView';

// Modals
import { AddWordModal } from './components/workspace/AddWordModal';
import { ExportImportModal } from './components/workspace/ExportImportModal';
import { EditProfileModal } from './components/workspace/EditProfileModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return firebaseService.getCurrentUser();
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const remembered = appStorage.getItem('pronounceit_remember_me') === 'true';
    const user = firebaseService.getCurrentUser();
    return Boolean(user && (remembered || appStorage.getItem('pronounceit_firebase_user_v1')));
  });

  const [activeTab, setActiveTab] = useState<MainNavTab>('vocabulary');

  // Words & Categories
  const [words, setWords] = useState<WordItem[]>([]);
  const [categories, setCategories] = useState(vocabService.getCategories());
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>({ type: 'all' });
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  useEffect(() => {
    // Initialize storage and load words
    appStorage.init().then(() => {
      setWords(vocabService.getWords());
      setCategories(vocabService.getCategories());
      setCurrentUser(firebaseService.getCurrentUser());
    });

    const unsubVocab = vocabService.subscribe(() => {
      setWords(vocabService.getWords());
      setCategories(vocabService.getCategories());
    });

    const unsubAuth = firebaseService.subscribe(() => {
      const u = firebaseService.getCurrentUser();
      setCurrentUser(u);
      if (!u) setIsAuthenticated(false);
    });

    return () => {
      unsubVocab();
      unsubAuth();
    };
  }, []);

  const handleLogout = async () => {
    await firebaseService.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('vocabulary');
  };

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

  // Counts for filters
  const totalWords = words.length;
  const favoritesCount = words.filter((w) => w.isFavorite).length;
  const reviewCount = words.filter((w) => w.status === 'en_repaso').length;
  const masteredCount = words.filter((w) => w.status === 'dominada').length;

  // Gatekeeper: Login View
  if (!isAuthenticated || !currentUser) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        <LoginView
          onSuccess={() => {
            setIsAuthenticated(true);
            setCurrentUser(firebaseService.getCurrentUser());
            setActiveTab('vocabulary');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Top Navigation */}
      <TopNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        searchTerm={globalSearch}
        onSearchChange={setGlobalSearch}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Workspace Content */}
      <View style={styles.mainContent}>
        {activeTab === 'vocabulary' && (
          <View style={{ flex: 1 }}>
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
          </View>
        )}

        {activeTab === 'flashcards' && (
          <FlashcardPracticeView
            words={words}
            onBackToVocabulary={() => setActiveTab('vocabulary')}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'test' && (
          <TestView
            words={words}
            onBackToVocabulary={() => setActiveTab('vocabulary')}
          />
        )}

        {activeTab === 'stats' && <StatsDashboardView words={words} />}

        {activeTab === 'settings' && (
          <SettingsView currentUser={currentUser} onLogout={handleLogout} />
        )}
      </View>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        {/* Tab 1: Vocabulario */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('vocabulary')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.tabIconBox,
              activeTab === 'vocabulary' && styles.tabIconBoxActive,
            ]}
          >
            <BookOpen
              size={18}
              color={activeTab === 'vocabulary' ? '#ffffff' : THEME.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'vocabulary' && styles.tabLabelActive,
            ]}
          >
            Vocabulario
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Flashcards */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('flashcards')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.tabIconBox,
              activeTab === 'flashcards' && styles.tabIconBoxActive,
            ]}
          >
            <Layers
              size={18}
              color={activeTab === 'flashcards' ? '#ffffff' : THEME.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'flashcards' && styles.tabLabelActive,
            ]}
          >
            Flashcards
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Test */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('test')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.tabIconBox,
              activeTab === 'test' && styles.tabIconBoxActive,
            ]}
          >
            <ClipboardCheck
              size={18}
              color={activeTab === 'test' ? '#ffffff' : THEME.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'test' && styles.tabLabelActive,
            ]}
          >
            Test
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Progreso */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('stats')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.tabIconBox,
              activeTab === 'stats' && styles.tabIconBoxActive,
            ]}
          >
            <BarChart3
              size={18}
              color={activeTab === 'stats' ? '#ffffff' : THEME.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'stats' && styles.tabLabelActive,
            ]}
          >
            Progreso
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Ajustes */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.tabIconBox,
              activeTab === 'settings' && styles.tabIconBoxActive,
            ]}
          >
            <Settings
              size={18}
              color={activeTab === 'settings' ? '#ffffff' : THEME.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' && styles.tabLabelActive,
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Word Modal */}
      {isAddModalOpen && (
        <AddWordModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingWord(null);
          }}
          onSave={handleSaveWord}
          initialWord={editingWord}
          categories={categories}
          defaultCategoryGroup={
            selectedFilter.type === 'category' ? selectedFilter.group : undefined
          }
          defaultCategorySub={
            selectedFilter.type === 'category' ? selectedFilter.sub : undefined
          }
        />
      )}

      {/* Export / Import Modal */}
      {isExportModalOpen && (
        <ExportImportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          words={words}
          onImportWords={handleImportWords}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20, 15, 33, 0.98)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIconBox: {
    padding: 6,
    borderRadius: THEME.radius.md,
  },
  tabIconBoxActive: {
    backgroundColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSubtle,
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
