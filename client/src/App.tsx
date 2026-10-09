import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Image,
  Linking,
  ActivityIndicator,
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
import { testHistoryService } from './lib/testHistoryStore';
import { appStorage } from './lib/storage';
import { networkService } from './lib/networkService';
import { THEME } from './theme';
import { PronounceItLogo } from './components/common/PronounceItLogo';

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
import { ConfirmModal } from './components/common/ConfirmModal';
import { useResponsive } from './lib/useResponsive';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function MainApp() {
  const insets = useSafeAreaInsets();
  const {
    showSidebarSplit,
    showTopNavTabs,
    showBottomBar,
    isDesktop,
    isTablet,
    isPhone,
    isPortrait,
  } = useResponsive();

  const [isInitializing, setIsInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return firebaseService.getCurrentUser();
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const user = firebaseService.getCurrentUser();
    return Boolean(user);
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
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Theme mode: dark by default, persists in storage
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = appStorage.getItem('pronounceit_theme');
    return saved !== 'light';
  });

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const nextVal = !prev;
      appStorage.setItem('pronounceit_theme', nextVal ? 'dark' : 'light');
      return nextVal;
    });
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!isDark) {
        document.body.classList.add('light-mode');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.body.classList.remove('light-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, [isDark]);

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'pronounceit-global-input-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        /* 1. Base input resets */
        input, textarea, select {
          outline: none !important;
          box-shadow: none !important;
          background-color: transparent !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active,
        input:autofill {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #1a142b inset !important;
          box-shadow: 0 0 0px 1000px #1a142b inset !important;
          transition: background-color 5000000s ease-in-out 0s !important;
        }
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #21142b inset !important;
          box-shadow: 0 0 0px 1000px #21142b inset !important;
        }

        /* 2. LIGHT MODE THEME */
        body.light-mode {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        body.light-mode #root,
        body.light-mode .r-backgroundColor-j5djr6 {
          background-color: #f8fafc !important;
        }

        /* Navbar & Sidebar in light mode */
        body.light-mode .r-backgroundColor-tlp0cc {
          background-color: #ffffff !important;
          border-bottom-color: rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04) !important;
        }

        /* Cards and elevated panels in light mode */
        body.light-mode .r-backgroundColor-1u0509z,
        body.light-mode .r-backgroundColor-17ebd94,
        body.light-mode .r-backgroundColor-1sk63vw,
        body.light-mode .r-backgroundColor-oudt42 {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04) !important;
        }

        /* Inputs, chips and secondary surfaces in light mode */
        body.light-mode .r-backgroundColor-1frf0rj,
        body.light-mode .r-backgroundColor-xl3lkw,
        body.light-mode .r-backgroundColor-9r4rsd {
          background-color: #f1f5f9 !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
        }

        /* Table header & item rows in light mode */
        body.light-mode .r-backgroundColor-7na9ed,
        body.light-mode .r-backgroundColor-1cuuowz {
          background-color: #f8fafc !important;
          border-color: rgba(0, 0, 0, 0.06) !important;
        }

        body.light-mode .r-backgroundColor-91ejfr {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }

        body.light-mode .r-backgroundColor-m3ef6a {
          background-color: #e2e8f0 !important;
        }

        body.light-mode .r-backgroundColor-1m5ggi5,
        body.light-mode .r-backgroundColor-58xgd4 {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }

        /* Borders in light mode */
        body.light-mode .r-borderColor-hoph7w,
        body.light-mode .r-borderColor-af1wpz,
        body.light-mode .r-borderColor-5ligpg,
        body.light-mode .r-borderColor-75jtiq,
        body.light-mode .r-borderColor-16jufec,
        body.light-mode .r-borderBottomColor-1d499e2,
        body.light-mode .r-borderBottomColor-1tsoen8 {
          border-color: rgba(0, 0, 0, 0.08) !important;
        }

        /* Typography in light mode */
        body.light-mode .r-color-jwli3a {
          color: #0f172a !important;
        }
        body.light-mode .r-color-1npgj5g {
          color: #64748b !important;
        }
        body.light-mode .r-color-1s7ct43 {
          color: #94a3b8 !important;
        }

        /* Crimson, Purple, Emerald and accent buttons/badges keep white text */
        body.light-mode .r-backgroundColor-1r79fvh,
        body.light-mode .r-backgroundColor-1r79fvh .r-color-jwli3a,
        body.light-mode .r-backgroundColor-99b2gy,
        body.light-mode .r-backgroundColor-99b2gy .r-color-jwli3a,
        body.light-mode .r-backgroundColor-1edbsjc,
        body.light-mode .r-backgroundColor-1edbsjc .r-color-jwli3a,
        body.light-mode .r-backgroundColor-m0idy1,
        body.light-mode .r-backgroundColor-m0idy1 .r-color-jwli3a {
          color: #ffffff !important;
        }

        /* Dropdown menu & modals in light mode */
        body.light-mode .r-backgroundColor-1fm9cyo {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
        }

        /* Edit profile avatar balloon & badges in light mode */
        body.light-mode .r-backgroundColor-1kjq39k {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }
        body.light-mode .r-backgroundColor-1kjq39k .r-color-jwli3a,
        body.light-mode .r-backgroundColor-1kjq39k span,
        body.light-mode .r-backgroundColor-1kjq39k div {
          color: #0f172a !important;
        }
        body.light-mode .r-borderColor-tlfti {
          border-color: #ffffff !important;
        }

        /* Autofill in light mode */
        body.light-mode input:-webkit-autofill,
        body.light-mode input:-webkit-autofill:hover,
        body.light-mode input:-webkit-autofill:focus,
        body.light-mode input:-webkit-autofill:active {
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a !important;
          -webkit-box-shadow: 0 0 0px 1000px #f1f5f9 inset !important;
          box-shadow: 0 0 0px 1000px #f1f5f9 inset !important;
        }

        /* Footer & mobile bottom bar in light mode */
        body.light-mode .r-backgroundColor-x6ug61 {
          background-color: #ffffff !important;
          border-top-color: rgba(0, 0, 0, 0.08) !important;
        }

        /* Pure black text for recommended apps and footer in light mode */
        body.light-mode .r-backgroundColor-x6ug61 span,
        body.light-mode .r-backgroundColor-x6ug61 div {
          color: #000000 !important;
        }

        body.light-mode .r-backgroundColor-mvguba {
          background-color: rgba(255, 255, 255, 0.98) !important;
          border-top-color: rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05) !important;
        }

        /* 3. VISIBLE, ELEGANT SCROLLBARS FOR MODALS & SCROLL VIEWS */
        .r-overflowY-1rnoaur::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          display: block !important;
        }
        .r-overflowY-1rnoaur::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05) !important;
          border-radius: 6px !important;
        }
        .r-overflowY-1rnoaur::-webkit-scrollbar-thumb {
          background: rgba(230, 46, 76, 0.5) !important;
          border-radius: 6px !important;
          border: 2px solid transparent !important;
          background-clip: padding-box !important;
        }
        .r-overflowY-1rnoaur::-webkit-scrollbar-thumb:hover {
          background: #e62e4c !important;
        }
        .r-overflowY-1rnoaur {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(230, 46, 76, 0.5) rgba(255, 255, 255, 0.05) !important;
        }

        /* Light Mode scrollbars */
        body.light-mode .r-overflowY-1rnoaur::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .r-overflowY-1rnoaur::-webkit-scrollbar-thumb {
          background: rgba(230, 46, 76, 0.55) !important;
        }
        body.light-mode .r-overflowY-1rnoaur::-webkit-scrollbar-thumb:hover {
          background: #e62e4c !important;
        }
        body.light-mode .r-overflowY-1rnoaur {
          scrollbar-color: rgba(230, 46, 76, 0.55) rgba(0, 0, 0, 0.05) !important;
        }
      `;
    }

    // 1. Initialize persistent storage and restore session/data
    const restoreSession = async () => {
      try {
        await appStorage.init();
        await firebaseService.initFromStorage();
        vocabService.reloadFromStorage();
        testHistoryService.reloadFromStorage();

        if (isMounted) {
          setWords(vocabService.getWords());
          setCategories(vocabService.getCategories());

          const user = firebaseService.getCurrentUser();
          const remembered = appStorage.getItem('pronounceit_remember_me') !== 'false';
          const hasSavedProfile = Boolean(appStorage.getItem('pronounceit_firebase_user_v1'));
          if (user && (remembered || hasSavedProfile)) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.warn('Session restoration error:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    restoreSession();

    // 2. Subscriptions
    const unsubVocab = vocabService.subscribe(() => {
      if (isMounted) {
        setWords(vocabService.getWords());
        setCategories(vocabService.getCategories());
      }
    });

    const unsubAuth = firebaseService.subscribe((u) => {
      if (isMounted) {
        setCurrentUser(u);
        if (u) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    });

    const unsubNet = networkService.subscribe((isOnline) => {
      if (isOnline) {
        vocabService.syncWithCloud().catch(() => {});
        testHistoryService.syncWithCloud().catch(() => {});
        firebaseService.syncLocalAccountsToCloud().catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubVocab();
      unsubAuth();
      unsubNet();
    };
  }, []);

  const handleLogout = async () => {
    await firebaseService.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('vocabulary');
  };

  const handleDeleteAccount = async () => {
    try {
      await firebaseService.deleteAccount();
      vocabService.clearAll();
      testHistoryService.clearHistory();
    } catch (e) {
      console.error('Error al dar de baja la cuenta:', e);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setActiveTab('vocabulary');
      setShowDeleteSuccessModal(true);
    }
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

  // Initializing Splash Screen (avoids flashing login if session is restored from disk)
  if (isInitializing) {
    return (
      <View
        style={[
          styles.appContainer,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: THEME.colors.bgDark,
          },
        ]}
      >
        <StatusBar style="light" />
        <PronounceItLogo size={60} />
        <ActivityIndicator
          color={THEME.colors.crimson}
          size="small"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  // Gatekeeper: Login View or Mandatory Password Change
  if (!isAuthenticated || !currentUser || currentUser.must_change_password) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        <LoginView
          initialMode={currentUser?.must_change_password ? 'change_password' : 'signin'}
          initialEmail={currentUser?.email || ''}
          initialUsername={currentUser?.username || ''}
          onSuccess={() => {
            setIsAuthenticated(true);
            setCurrentUser(firebaseService.getCurrentUser());
            setActiveTab('vocabulary');
            vocabService.syncWithCloud().catch(() => {});
            testHistoryService.syncWithCloud().catch(() => {});
          }}
        />

        <ConfirmModal
          isOpen={showDeleteSuccessModal}
          title="Baja completada"
          message="Tu cuenta y todos tus datos personales han sido dados de baja correctamente."
          confirmText="Entendido"
          cancelText={null}
          variant="success"
          onConfirm={() => setShowDeleteSuccessModal(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Top Navigation */}
      <TopNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        searchTerm={globalSearch}
        onSearchChange={setGlobalSearch}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Workspace Content */}
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={[
          styles.mainScrollContent,
          !showBottomBar && styles.mainScrollContentDesktop,
        ]}
      >
        <View style={showSidebarSplit ? styles.workspaceDesktop : styles.workspaceMobile}>
          {activeTab === 'vocabulary' && (
            <View style={showSidebarSplit ? styles.vocabularyRowDesktop : styles.vocabularyColumnMobile}>
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
            <View style={styles.testSectionContainer}>
              <TestView
                words={words}
                onBackToVocabulary={() => setActiveTab('vocabulary')}
              />
            </View>
          )}

          {activeTab === 'stats' && <StatsDashboardView words={words} />}

          {activeTab === 'settings' && (
            <View style={styles.settingsSectionContainer}>
              <SettingsView
                currentUser={currentUser}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onOpenEditProfile={() => setIsEditProfileOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
              />
            </View>
          )}
        </View>

        {/* Global Footer (shown on Desktop and Tablet when bottom bar is hidden) */}
        {!showBottomBar && (
          <View style={[styles.footerContainer, !isDark && styles.footerContainerLight]}>
            <Text style={[styles.footerCopyright, !isDark && styles.footerTextBlack]}>
              © PronounceIt | Desarrollado con ❤️ Oscar Mangut Dev
            </Text>
            <View style={styles.footerPartners}>
              <Text style={[styles.footerPartnerTitle, !isDark && styles.footerPartnerTitleLight]}>
                APLICACIONES RECOMENDADAS:
              </Text>
              <TouchableOpacity
                style={[styles.footerPartnerBadge, !isDark && styles.footerPartnerBadgeLight]}
                onPress={() => Linking.openURL('https://www.duolingo.com/')}
              >
                <Image
                  source={require('./assets/duolingo.png')}
                  style={styles.footerPartnerLogo}
                />
                <Text style={[styles.footerPartnerName, !isDark && styles.footerPartnerNameLight]}>
                  Duolingo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerPartnerBadge, !isDark && styles.footerPartnerBadgeLight]}
                onPress={() => Linking.openURL('https://beespeaker.com/')}
              >
                <Image
                  source={require('./assets/beespeaker.png')}
                  style={styles.footerPartnerLogo}
                />
                <Text style={[styles.footerPartnerName, !isDark && styles.footerPartnerNameLight]}>
                  BeeSpeaker
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerPartnerBadge, !isDark && styles.footerPartnerBadgeLight]}
                onPress={() => Linking.openURL('https://wlingua.com/')}
              >
                <Image
                  source={require('./assets/wlingua.png')}
                  style={styles.footerPartnerLogo}
                />
                <Text style={[styles.footerPartnerName, !isDark && styles.footerPartnerNameLight]}>
                  Wlingua
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation Bar (Mobile only) */}
      {showBottomBar && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
      )}

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
          isDark={isDark}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
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
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  mainScrollContentDesktop: {
    justifyContent: 'space-between',
  },
  workspaceDesktop: {
    width: '100%',
    maxWidth: 1560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flex: 1,
  },
  workspaceMobile: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    width: '100%',
  },
  vocabularyRowDesktop: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
    flex: 1,
  },
  vocabularyColumnMobile: {
    flex: 1,
    gap: 16,
    width: '100%',
  },
  testSectionContainer: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsSectionContainer: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 8,
  },

  // Footer styles
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0a0712',
    marginTop: 24,
    width: '100%',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerCopyright: {
    fontSize: 12,
    color: THEME.colors.textSubtle,
    fontWeight: '500',
  },
  footerPartners: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerPartnerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    letterSpacing: 1,
    marginRight: 4,
  },
  footerPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  footerPartnerLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  footerPartnerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  footerContainerLight: {
    backgroundColor: '#ffffff',
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  footerTextBlack: {
    color: '#000000',
    fontWeight: '600',
  },
  footerPartnerTitleLight: {
    color: '#000000',
    fontWeight: '800',
  },
  footerPartnerBadgeLight: {
    backgroundColor: '#f1f5f9',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  footerPartnerNameLight: {
    color: '#000000',
    fontWeight: '700',
  },

  // Mobile Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20, 15, 33, 0.98)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 8,
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
