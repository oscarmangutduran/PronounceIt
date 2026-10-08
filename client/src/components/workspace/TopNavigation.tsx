import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  Settings,
  Search,
  User,
  LogOut,
  UserPen,
  WifiOff,
} from 'lucide-react-native';
import { UserProfile, MainNavTab } from '../../types';
import { THEME } from '../../theme';
import { PronounceItLogo } from '../common/PronounceItLogo';
import { useResponsive } from '../../lib/useResponsive';
import { networkService } from '../../lib/networkService';

interface TopNavigationProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenEditProfile: () => void;
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
  const { width, showTopNavTabs, isPhone } = useResponsive();
  const showSearch = !isPhone && width >= 800;
  const [showDropdown, setShowDropdown] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());

  useEffect(() => {
    return networkService.subscribe(setIsOnline);
  }, []);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : (Platform.OS === 'ios' ? 44 : 12)
  );

  const initial = (currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* LEFT: Brand Logo & Title */}
      <View style={styles.brandRow}>
        <PronounceItLogo size={36} />
        <View>
          <Text style={styles.brandTitle}>PronounceIt</Text>
          {!isPhone && <Text style={styles.brandSubtitle}>Inglés & Fonética</Text>}
        </View>
      </View>

      {/* CENTER: Navigation Tabs (Tablet & Desktop) */}
      {showTopNavTabs && (
        <View style={styles.navTabs}>
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
              color={activeTab === 'vocabulary' ? THEME.colors.crimson : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'vocabulary' && styles.navTabTextActive,
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
              color={activeTab === 'flashcards' ? THEME.colors.crimson : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'flashcards' && styles.navTabTextActive,
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
              color={activeTab === 'test' ? THEME.colors.crimson : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'test' && styles.navTabTextActive,
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
              color={activeTab === 'stats' ? THEME.colors.crimson : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'stats' && styles.navTabTextActive,
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
              color={activeTab === 'settings' ? THEME.colors.crimson : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'settings' && styles.navTabTextActive,
              ]}
            >
              Configuración
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIGHT: Search + User Avatar */}
      <View style={styles.rightActions}>
        {/* Quick Search */}
        {showSearch && (
          <View style={styles.searchBox}>
            <Search size={14} color={THEME.colors.textSubtle} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar término o IPA..."
              placeholderTextColor={THEME.colors.textSubtle}
              value={searchTerm}
              onChangeText={onSearchChange}
            />
            <View style={styles.kbdBadge}>
              <Text style={styles.kbdText}>⌘K</Text>
            </View>
          </View>
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
            onPress={() => setShowDropdown(!showDropdown)}
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
            <View style={styles.dropdownMenu}>
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatar}>
                  {currentUser?.avatar_url ? (
                    <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownName} numberOfLines={1}>
                    {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
                  </Text>
                  <Text style={styles.dropdownEmail} numberOfLines={1}>
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
                <Text style={styles.dropdownItemText}>Editar perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onTabChange('settings');
                }}
              >
                <Settings size={14} color={THEME.colors.textMuted} />
                <Text style={styles.dropdownItemText}>Ajustes de pronunciación</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onTabChange('stats');
                }}
              >
                <BarChart3 size={14} color={THEME.colors.textMuted} />
                <Text style={styles.dropdownItemText}>Mi progreso léxico</Text>
              </TouchableOpacity>

              {!isOnline && (
                <View style={styles.dropdownOfflineNotice}>
                  <WifiOff size={13} color="#f59e0b" style={{ marginRight: 6 }} />
                  <Text style={styles.dropdownOfflineText}>
                    Modo sin conexión: datos guardados en el dispositivo.
                  </Text>
                </View>
              )}

              <View style={styles.dropdownDivider} />

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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 10,
    height: 36,
    width: 220,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  kbdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  kbdText: {
    color: THEME.colors.textSubtle,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
});
