import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  BookOpen,
  User,
  LogOut,
  Sparkles,
  Search,
} from 'lucide-react-native';
import { UserProfile, MainNavTab } from '../../types';
import { THEME } from '../../theme';
import { PronounceItLogo } from '../common/PronounceItLogo';

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
  currentUser,
  onLogout,
  onOpenEditProfile,
}) => {
  return (
    <View style={styles.container}>
      {/* Brand logo & title */}
      <View style={styles.brandRow}>
        <PronounceItLogo size={36} />
        <View>
          <Text style={styles.brandTitle}>PronounceIt</Text>
          <Text style={styles.brandSubtitle}>Inglés & Fonética</Text>
        </View>
      </View>

      {/* User profile & actions */}
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={onOpenEditProfile}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {currentUser?.full_name || currentUser?.username || 'Invitado'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 15, 33, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    maxWidth: 150,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    maxWidth: 80,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: THEME.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
});
