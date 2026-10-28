import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Settings,
  User,
  LogOut,
  UserPen,
  WifiOff,
  UserX,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { UserProfile, MainNavTab, SUPPORTED_LANGUAGES } from '../../types';
import { THEME } from '../../theme';
import { PronounceItLogo } from '../common/PronounceItLogo';
import { useResponsive } from '../../lib/useResponsive';
import { networkService } from '../../lib/networkService';
import { ConfirmModal } from '../common/ConfirmModal';
import { CountryFlag } from '../common/CountryFlag';
import { LanguagePickerModal } from '../common/LanguagePickerModal';

interface TopNavigationProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  onOpenEditProfile: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  activeLanguage?: string;
  learningLanguages?: string[];
  onSelectLanguage?: (langCode: string) => void;
  onAddLanguage?: (langCode: string) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  onDeleteAccount,
  searchTerm,
  onSearchChange,
  onOpenEditProfile,
  isDark = true,
  onToggleTheme,
  activeLanguage,
  learningLanguages,
  onSelectLanguage,
  onAddLanguage,
}) => {
  const { showTopNavTabs, isPhone } = useResponsive();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddLangModal, setShowAddLangModal] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());

  useEffect(() => {
    return networkService.subscribe(setIsOnline);
  }, []);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : (Platform.OS === 'ios' ? 44 : 12)
  );

  const initial = (() => {
    const raw = currentUser?.full_name?.trim() || currentUser?.username?.trim() || currentUser?.email?.trim() || 'U';
    return (raw.charAt(0) || 'U').toUpperCase();
  })();

  const activeLang = activeLanguage || currentUser?.target_language || 'en';
  const langList = useMemo(() => {
    if (learningLanguages && learningLanguages.length > 0) {
      return Array.from(new Set(learningLanguages));
    }
    if (currentUser?.learning_languages && currentUser.learning_languages.length > 0) {
      return Array.from(new Set(currentUser.learning_languages));
    }
    return [activeLang];
  }, [learningLanguages, currentUser?.learning_languages, activeLang]);

  return (
    <View style={[styles.container, !isDark && styles.containerLight, { paddingTop: topPadding }]}>
      {/* LEFT: Brand Logo & Title */}
      <View style={styles.brandRow}>
        <PronounceItLogo size={36} />
        <View>
          <Text style={[styles.brandTitle, !isDark && styles.brandTitleLight]}>PronounceIt</Text>
          {!isPhone && (
            <Text style={[styles.brandSubtitle, !isDark && styles.brandSubtitleLight]}>
              Inglés & Fonética
            </Text>
          )}
        </View>
      </View>

      {/* CENTER: Navigation Tabs (Tablet & Desktop) */}
      {showTopNavTabs && (
        <View style={[styles.navTabs, !isDark && styles.navTabsLight]}>
          {/* Vocabulario / Biblioteca */}
          <TouchableOpacity
            style={[
              styles.navTabButton,
              activeTab === 'vocabulary' && styles.navTabButtonActive,
            ]}
            onPress={() => onTabChange('vocabulary')}
            activeOpacity={0.8}
          >
            <BookOpen
              size={15}
              color={activeTab === 'vocabulary' ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.textMuted)}
            />
            <Text
              style={[
                styles.navTabText,
                !isDark && styles.navTabTextLight,
                activeTab === 'vocabulary' && (isDark ? styles.navTabTextActive : styles.navTabTextActiveLight),
              ]}
            >
              Vocabulario / Biblioteca
            </Text>
          </TouchableOpacity>

          {/* Práctica con Flashcards */}
          <TouchableOpacity
            style={[
              styles.navTabButton,
              activeTab === 'flashcards' && styles.navTabButtonActive,
            ]}
            onPress={() => onTabChange('flashcards')}
            activeOpacity={0.8}
          >
            <Layers
              size={15}
              color={activeTab === 'flashcards' ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.textMuted)}
            />
            <Text
              style={[
                styles.navTabText,
                !isDark && styles.navTabTextLight,
                activeTab === 'flashcards' && (isDark ? styles.navTabTextActive : styles.navTabTextActiveLight),
              ]}
            >
              Práctica con Flashcards
            </Text>
          </TouchableOpacity>

          {/* Test */}
          <TouchableOpacity
            style={[
              styles.navTabButton,
              activeTab === 'test' && styles.navTabButtonActive,
            ]}
            onPress={() => onTabChange('test')}
            activeOpacity={0.8}
          >
            <ClipboardCheck
              size={15}
              color={activeTab === 'test' ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.textMuted)}
            />
            <Text
              style={[
                styles.navTabText,
                !isDark && styles.navTabTextLight,
                activeTab === 'test' && (isDark ? styles.navTabTextActive : styles.navTabTextActiveLight),
              ]}
            >
              Test
            </Text>
          </TouchableOpacity>

          {/* Estadísticas */}
          <TouchableOpacity
            style={[
              styles.navTabButton,
              activeTab === 'stats' && styles.navTabButtonActive,
            ]}
            onPress={() => onTabChange('stats')}
            activeOpacity={0.8}
          >
            <BarChart3
              size={15}
              color={activeTab === 'stats' ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.textMuted)}
            />
            <Text
              style={[
                styles.navTabText,
                !isDark && styles.navTabTextLight,
                activeTab === 'stats' && (isDark ? styles.navTabTextActive : styles.navTabTextActiveLight),
              ]}
            >
              Estadísticas
            </Text>
          </TouchableOpacity>

          {/* Configuración */}
          <TouchableOpacity
            style={[
              styles.navTabButton,
              activeTab === 'settings' && styles.navTabButtonActive,
            ]}
            onPress={() => onTabChange('settings')}
            activeOpacity={0.8}
          >
            <Settings
              size={15}
              color={activeTab === 'settings' ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.textMuted)}
            />
            <Text
              style={[
                styles.navTabText,
                !isDark && styles.navTabTextLight,
                activeTab === 'settings' && (isDark ? styles.navTabTextActive : styles.navTabTextActiveLight),
              ]}
            >
              Configuración
            </Text>
          </TouchableOpacity>

          {/* Botón de alternancia de Tema: Sol si modo oscuro, Luna si modo claro */}
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              !isDark && styles.themeToggleBtnLight,
            ]}
            onPress={onToggleTheme}
            activeOpacity={0.75}
            accessibilityLabel={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {isDark ? (
              <Sun size={16} color="#fbbf24" />
            ) : (
              <Moon size={16} color="#6366f1" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* RIGHT: Language Switcher Flags + Add (+) Button + Offline Badge + User Avatar */}
      <View style={styles.rightActions}>
        {/* Language Switcher Bar: Dropdown if multiple languages, or single flag if 1 language */}
        <View style={styles.langSwitcherWrapper}>
          <View style={[styles.langSwitcherContainer, !isDark && styles.langSwitcherContainerLight]}>
            {langList.length > 1 ? (
              <TouchableOpacity
                style={[
                  styles.langDropdownTrigger,
                  showLangDropdown && styles.langDropdownTriggerOpen,
                  showLangDropdown && !isDark && styles.langDropdownTriggerOpenLight,
                ]}
                onPress={() => {
                  setShowLangDropdown((prev) => !prev);
                  setShowDropdown(false);
                }}
                activeOpacity={0.7}
                accessibilityLabel="Cambiar idioma de aprendizaje"
              >
                <CountryFlag code={activeLang} size={20} />
                <ChevronDown
                  size={13}
                  color={!isDark ? '#64748b' : '#94a3b8'}
                  style={{
                    transform: [{ rotate: showLangDropdown ? '180deg' : '0deg' }],
                    marginLeft: 4,
                  }}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.langSingleFlagBox}>
                <CountryFlag code={activeLang} size={20} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.langAddBtn, !isDark && styles.langAddBtnLight]}
              onPress={() => {
                setShowLangDropdown(false);
                setShowAddLangModal(true);
              }}
              activeOpacity={0.7}
              accessibilityLabel="Agregar nuevo idioma"
            >
              <Plus size={14} color={!isDark ? '#475569' : '#cbd5e1'} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Language Dropdown Menu (shown when user has more than 1 language) */}
          {langList.length > 1 && showLangDropdown && (
            <View style={[styles.langDropdownMenu, !isDark && styles.langDropdownMenuLight]}>
              <View style={[styles.langDropdownHeader, !isDark && styles.langDropdownHeaderLight]}>
                <Text style={[styles.langDropdownHeaderText, !isDark && styles.langDropdownHeaderTextLight]}>
                  Mis idiomas ({langList.length})
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 220 }} bounces={false}>
                {langList.map((langCode) => {
                  const isActive = langCode.toLowerCase() === activeLang.toLowerCase();
                  const langObj = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === langCode.toLowerCase());
                  const name = langObj ? langObj.name : langCode.toUpperCase();

                  return (
                    <TouchableOpacity
                      key={langCode}
                      style={[
                        styles.langDropdownItem,
                        !isDark && styles.langDropdownItemLight,
                        isActive && styles.langDropdownItemActive,
                        isActive && !isDark && styles.langDropdownItemActiveLight,
                      ]}
                      onPress={() => {
                        onSelectLanguage?.(langCode);
                        setShowLangDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.langDropdownItemLeft}>
                        <CountryFlag code={langCode} size={20} />
                        <Text
                          style={[
                            styles.langDropdownItemName,
                            !isDark && styles.langDropdownItemNameLight,
                            isActive && { color: THEME.colors.crimson, fontWeight: '700' },
                          ]}
                        >
                          {name}
                        </Text>
                      </View>

                      {isActive ? (
                        <Check size={15} color={THEME.colors.crimson} strokeWidth={2.5} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.dropdownDivider, !isDark && styles.dropdownDividerLight]} />

              <TouchableOpacity
                style={styles.langDropdownAddOption}
                onPress={() => {
                  setShowLangDropdown(false);
                  setShowAddLangModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.langDropdownAddIconBox}>
                  <Plus size={13} color="#ffffff" strokeWidth={2.5} />
                </View>
                <Text style={[styles.langDropdownAddText, !isDark && styles.langDropdownAddTextLight]}>
                  Agregar otro idioma
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Theme Toggle Mobile */}
        {!showTopNavTabs && (
          <TouchableOpacity
            style={[
              styles.themeToggleBtnMobile,
              !isDark && styles.themeToggleBtnLight,
            ]}
            onPress={onToggleTheme}
            activeOpacity={0.75}
            accessibilityLabel={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {isDark ? (
              <Sun size={17} color="#fbbf24" />
            ) : (
              <Moon size={17} color="#6366f1" />
            )}
          </TouchableOpacity>
        )}

        {/* Offline Badge */}
        {!isOnline && (
          <View style={styles.offlinePill}>
            <WifiOff size={12} color="#f59e0b" style={{ marginRight: 4 }} />
            <Text style={styles.offlinePillText}>Offline</Text>
          </View>
        )}

        {/* User Avatar Circle */}
        <View style={styles.userWrapper}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => {
              setShowDropdown(!showDropdown);
              setShowLangDropdown(false);
            }}
            activeOpacity={0.8}
          >
            {currentUser?.avatar_url ? (
              <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>{initial}</Text>
            )}
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {showDropdown && (
            <View style={[styles.dropdownMenu, !isDark && styles.dropdownMenuLight]}>
              <View style={[styles.dropdownHeader, !isDark && styles.dropdownHeaderLight]}>
                <View style={styles.dropdownAvatar}>
                  {currentUser?.avatar_url ? (
                    <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownName, !isDark && styles.dropdownNameLight]} numberOfLines={1}>
                    {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
                  </Text>
                  <Text style={[styles.dropdownEmail, !isDark && styles.dropdownEmailLight]} numberOfLines={1}>
                    {currentUser?.email || 'estudiante@pronounceit.com'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onOpenEditProfile();
                }}
              >
                <User size={14} color={THEME.colors.crimsonLight} />
                <Text style={[styles.dropdownItemText, !isDark && styles.dropdownItemTextLight]}>Editar perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onTabChange('settings');
                }}
              >
                <Settings size={14} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                <Text style={[styles.dropdownItemText, !isDark && styles.dropdownItemTextLight]}>Ajustes de pronunciación</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onTabChange('stats');
                }}
              >
                <BarChart3 size={14} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                <Text style={[styles.dropdownItemText, !isDark && styles.dropdownItemTextLight]}>Mi progreso léxico</Text>
              </TouchableOpacity>

              {!isOnline && (
                <View style={styles.dropdownOfflineNotice}>
                  <WifiOff size={13} color="#f59e0b" style={{ marginRight: 6 }} />
                  <Text style={styles.dropdownOfflineText}>
                    Modo sin conexión: datos guardados en el dispositivo.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onToggleTheme?.();
                }}
              >
                {isDark ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="#6366f1" />}
                <Text style={[styles.dropdownItemText, !isDark && styles.dropdownItemTextLight]}>
                  {isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDivider, !isDark && styles.dropdownDividerLight]} />

              <TouchableOpacity
                style={[styles.dropdownItem, { paddingVertical: 8 }]}
                onPress={() => {
                  setShowDropdown(false);
                  setShowDeleteModal(true);
                }}
              >
                <UserX size={14} color="#f87171" />
                <Text style={[styles.dropdownItemText, { color: '#f87171', fontWeight: '600' }]}>
                  Darme de baja
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownItem, { paddingVertical: 8 }]}
                onPress={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                <LogOut size={14} color="#f87171" />
                <Text style={[styles.dropdownItemText, { color: '#f87171', fontWeight: '600' }]}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Darme de baja"
        message="¿Estás seguro de que deseas darte de baja? Esta acción eliminará permanentemente tu cuenta, todas tus palabras y tu progreso de aprendizaje. Esta acción no se puede deshacer."
        confirmText="Sí, darme de baja"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setShowDeleteModal(false);
          onDeleteAccount?.();
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Modal para agregar nuevo idioma de aprendizaje */}
      <LanguagePickerModal
        isOpen={showAddLangModal}
        onClose={() => setShowAddLangModal(false)}
        selectedCode={activeLang}
        onSelect={(code) => {
          setShowAddLangModal(false);
          onAddLanguage?.(code);
        }}
        title="Agregar idioma para aprender"
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0c0915',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
    fontWeight: '500',
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 3,
    borderRadius: THEME.radius.lg,
  },
  navTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navTabButtonActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderColor: 'rgba(230, 46, 76, 0.45)',
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  navTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  themeToggleBtnLight: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  themeToggleBtnMobile: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  // Note: themeToggleBtnLight is also applied to themeToggleBtnMobile in light mode (reused below in JSX)
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langSwitcherWrapper: {
    position: 'relative',
    zIndex: 102,
  },
  langSwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langSwitcherContainerLight: {
    backgroundColor: '#f1f5f9',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  langDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}),
  },
  langDropdownTriggerOpen: {
    backgroundColor: 'rgba(230, 46, 76, 0.14)',
    borderColor: THEME.colors.crimson,
  },
  langDropdownTriggerOpenLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderColor: THEME.colors.crimson,
  },
  langSingleFlagBox: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}),
  },
  langAddBtnLight: {
    borderColor: 'rgba(0, 0, 0, 0.22)',
    backgroundColor: '#ffffff',
  },
  langDropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 42,
    width: 220,
    backgroundColor: '#161026',
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 200,
  },
  langDropdownMenuLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
  },
  langDropdownHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  langDropdownHeaderLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  langDropdownHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  langDropdownHeaderTextLight: {
    color: '#64748b',
  },
  langDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}),
  },
  langDropdownItemLight: {},
  langDropdownItemActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.14)',
  },
  langDropdownItemActiveLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
  },
  langDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langDropdownItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f8fafc',
  },
  langDropdownItemNameLight: {
    color: '#1e293b',
  },
  langDropdownItemNative: {
    fontSize: 11,
    color: '#94a3b8',
  },
  langDropdownItemNativeLight: {
    color: '#64748b',
  },
  langDropdownAddOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}),
  },
  langDropdownAddIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langDropdownAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  langDropdownAddTextLight: {
    color: '#0f172a',
  },
  userWrapper: {
    position: 'relative',
    zIndex: 101,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.crimson,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 44,
    width: 240,
    backgroundColor: '#161026',
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 200,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dropdownAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  dropdownEmail: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dropdownItemText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  offlinePillText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dropdownOfflineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 10,
    marginVertical: 4,
  },
  dropdownOfflineText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },

  // Light Mode Overrides
  containerLight: {
    backgroundColor: '#ffffff',
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  brandTitleLight: {
    color: '#0f172a',
  },
  brandSubtitleLight: {
    color: '#64748b',
  },
  navTabsLight: {
    backgroundColor: '#f1f5f9',
  },
  navTabTextLight: {
    color: '#64748b',
  },
  navTabTextActiveLight: {
    color: '#e62e4c',
    fontWeight: '700',
  },
  dropdownMenuLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
  },
  dropdownHeaderLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  dropdownNameLight: {
    color: '#0f172a',
  },
  dropdownEmailLight: {
    color: '#64748b',
  },
  dropdownItemTextLight: {
    color: '#334155',
  },
  dropdownDividerLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
