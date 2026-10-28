import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Check, Globe } from 'lucide-react-native';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../../types';
import { THEME } from '../../theme';
import { CountryFlag } from './CountryFlag';

interface LanguagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  selectedCode?: string;
  onSelect: (code: string) => void;
  isDark?: boolean;
}

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  selectedCode = '',
  onSelect,
  isDark = true,
}) => {
  if (!isOpen) return null;

  const isLight = !isDark;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modalCard, isLight && styles.modalCardLight]}
          activeOpacity={1}
          onPress={(e) => {
            if (Platform.OS === 'web') {
              e.stopPropagation();
            }
          }}
        >
          {/* Header */}
          <View style={[styles.header, isLight && styles.headerLight]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBadge, isLight && styles.iconBadgeLight]}>
                <Globe size={18} color={THEME.colors.crimson} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, isLight && styles.titleLight]}>{title}</Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, isLight && styles.subtitleLight]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, isLight && styles.closeBtnLight]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={isLight ? '#64748b' : THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Languages List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => {
              const isSelected = lang.code === selectedCode;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.item,
                    isLight && styles.itemLight,
                    isSelected && styles.itemSelected,
                    isSelected && isLight && styles.itemSelectedLight,
                  ]}
                  onPress={() => {
                    onSelect(lang.code);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <CountryFlag code={lang.code} size={26} />
                    <View>
                      <Text
                        style={[
                          styles.langName,
                          isLight && styles.langNameLight,
                          isSelected && styles.langNameSelected,
                        ]}
                      >
                        {lang.name}
                      </Text>
                      <Text
                        style={[
                          styles.langCode,
                          isLight && styles.langCodeLight,
                          isSelected && styles.langCodeSelected,
                        ]}
                      >
                        {lang.code.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#161323',
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    maxHeight: '85%',
  },
  modalCardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLight: {
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBadgeLight: {
    backgroundColor: '#fee2e2',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  titleLight: {
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSubtle,
    marginTop: 2,
  },
  subtitleLight: {
    color: '#64748b',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLight: {
    backgroundColor: '#f1f5f9',
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    padding: 12,
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  itemSelected: {
    backgroundColor: 'rgba(230, 46, 76, 0.14)',
    borderColor: THEME.colors.crimson,
  },
  itemSelectedLight: {
    backgroundColor: '#fef2f2',
    borderColor: '#e62e4c',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagEmoji: {
    fontSize: 24,
  },
  langName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  langNameLight: {
    color: '#1e293b',
  },
  langNameSelected: {
    color: THEME.colors.crimsonLight,
    fontWeight: '700',
  },
  langCode: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  langCodeLight: {
    color: '#94a3b8',
  },
  langCodeSelected: {
    color: THEME.colors.crimson,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
