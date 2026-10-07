import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Search,
  Plus,
  Volume2,
  Star,
  Trash2,
  Edit3,
  Layers,
  Download,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { WordItem, WordStatus } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { SelectedFilter } from './SidebarCategories';
import { THEME } from '../../theme';

interface VocabularyTableViewProps {
  words: WordItem[];
  selectedFilter: SelectedFilter;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onStartPractice: () => void;
  onEditWord: (word: WordItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: WordStatus) => void;
  onDeleteWord: (id: string) => void;
}

export const VocabularyTableView: React.FC<VocabularyTableViewProps> = ({
  words,
  selectedFilter,
  onOpenAddModal,
  onOpenExportModal,
  onStartPractice,
  onEditWord,
  onToggleFavorite,
  onUpdateStatus,
  onDeleteWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter words
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchWord = w.word.toLowerCase().includes(query);
        const matchTrans = w.translation.toLowerCase().includes(query);
        const matchIpa = w.ipa.toLowerCase().includes(query);
        const matchGuide = (w.phoneticGuide || '').toLowerCase().includes(query);
        if (!matchWord && !matchTrans && !matchIpa && !matchGuide) return false;
      }

      // 2. Filter Category / Status
      if (selectedFilter.type === 'favorites') return w.isFavorite;
      if (selectedFilter.type === 'review') return w.status === 'en_repaso';
      if (selectedFilter.type === 'mastered') return w.status === 'dominada';
      if (selectedFilter.type === 'level') return w.level === selectedFilter.level;
      if (selectedFilter.type === 'category') {
        if (w.categoryGroup !== selectedFilter.group) return false;
        if (selectedFilter.sub && w.categorySub !== selectedFilter.sub) return false;
      }

      return true;
    });
  }, [words, searchTerm, selectedFilter]);

  const confirmDelete = (word: WordItem) => {
    Alert.alert(
      'Eliminar palabra',
      `¿Seguro que deseas eliminar "${word.word}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteWord(word.id) },
      ]
    );
  };

  const cycleStatus = (word: WordItem) => {
    const nextStatus: Record<WordStatus, WordStatus> = {
      nueva: 'en_repaso',
      en_repaso: 'dominada',
      dominada: 'nueva',
    };
    onUpdateStatus(word.id, nextStatus[word.status] || 'nueva');
  };

  const renderWordItem = ({ item }: { item: WordItem }) => {
    const isMastered = item.status === 'dominada';
    const isReview = item.status === 'en_repaso';

    return (
      <View style={styles.card}>
        {/* Top Card Row */}
        <View style={styles.cardHeader}>
          <View style={styles.wordTitleRow}>
            <Text style={styles.wordText}>{item.word}</Text>

            <TouchableOpacity
              style={styles.speakerBtn}
              onPress={() => vocabService.speak(item.word)}
              activeOpacity={0.7}
            >
              <Volume2 size={16} color={THEME.colors.crimsonLight} />
            </TouchableOpacity>

            {item.partOfSpeech ? (
              <View style={styles.posBadge}>
                <Text style={styles.posBadgeText}>{item.partOfSpeech}</Text>
              </View>
            ) : null}

            {item.level ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{item.level}</Text>
              </View>
            ) : null}
          </View>

          {/* Favorite & Options */}
          <View style={styles.cardHeaderActions}>
            <TouchableOpacity
              onPress={() => onToggleFavorite(item.id)}
              style={styles.actionIconBtn}
            >
              <Star
                size={18}
                color={item.isFavorite ? '#eab308' : THEME.colors.textSubtle}
                fill={item.isFavorite ? '#eab308' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onEditWord(item)}
              style={styles.actionIconBtn}
            >
              <Edit3 size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={styles.actionIconBtn}
            >
              <Trash2 size={16} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Phonetics */}
        <View style={styles.phoneticsRow}>
          {item.phoneticGuide ? (
            <View style={styles.phoneticGuideBadge}>
              <Text style={styles.phoneticGuideText}>
                {item.phoneticGuide.startsWith('"') ? item.phoneticGuide : `"${item.phoneticGuide}"`}
              </Text>
            </View>
          ) : null}

          {item.ipa ? (
            <Text style={styles.ipaText}>{item.ipa}</Text>
          ) : null}
        </View>

        {/* Translation */}
        <View style={styles.translationRow}>
          <Text style={styles.translationText}>{item.translation}</Text>
        </View>

        {/* Example Sentences */}
        {item.exampleEn ? (
          <View style={styles.exampleBox}>
            <Text style={styles.exampleEn}>{item.exampleEn}</Text>
            {item.exampleEs ? (
              <Text style={styles.exampleEs}>{item.exampleEs}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Footer: Category & Status */}
        <View style={styles.cardFooter}>
          <Text style={styles.categorySubText}>
            {item.categoryGroup || 'General'}
            {item.categorySub ? ` • ${item.categorySub}` : ''}
          </Text>

          <TouchableOpacity
            style={[
              styles.statusPill,
              isMastered && styles.statusPillMastered,
              isReview && styles.statusPillReview,
            ]}
            onPress={() => cycleStatus(item)}
            activeOpacity={0.8}
          >
            {isMastered ? (
              <CheckCircle size={12} color={THEME.colors.emerald} />
            ) : isReview ? (
              <Clock size={12} color={THEME.colors.amber} />
            ) : (
              <Sparkles size={12} color={THEME.colors.cyan} />
            )}
            <Text
              style={[
                styles.statusPillText,
                isMastered && styles.statusTextMastered,
                isReview && styles.statusTextReview,
              ]}
            >
              {isMastered ? 'Dominada' : isReview ? 'En repaso' : 'Nueva'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Controls Row */}
      <View style={styles.controlsBar}>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Search size={16} color={THEME.colors.textSubtle} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar palabras, traducción o pronunciación..."
            placeholderTextColor={THEME.colors.textSubtle}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Actions Button Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryAddBtn}
            onPress={onOpenAddModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryAddBtnText}>Añadir Palabra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onStartPractice}
            activeOpacity={0.8}
          >
            <Layers size={16} color={THEME.colors.crimsonLight} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Flashcards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconOnlyBtn}
            onPress={onOpenExportModal}
            activeOpacity={0.8}
          >
            <Download size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Words Feed */}
      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BookOpen size={32} color={THEME.colors.crimsonLight} />
            </View>
            <Text style={styles.emptyTitle}>No hay palabras registradas</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm
                ? 'No se encontraron coincidencias para tu búsqueda.'
                : 'Empieza agregando tu primera palabra o importa un archivo de vocabulario.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={onOpenAddModal}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>Añadir mi primera palabra</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  controlsBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    borderRadius: THEME.radius.md,
    height: 42,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 42,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  iconOnlyBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  speakerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posBadgeText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  levelBadge: {
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
  },
  levelBadgeText: {
    color: THEME.colors.crimsonLight,
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  phoneticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  phoneticGuideBadge: {
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phoneticGuideText: {
    color: '#ff8a9e',
    fontSize: 12,
    fontWeight: '700',
  },
  ipaText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  translationRow: {
    marginTop: 8,
  },
  translationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  exampleBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.crimsonLight,
    gap: 4,
  },
  exampleEn: {
    color: '#f1f5f9',
    fontSize: 12,
    lineHeight: 17,
  },
  exampleEs: {
    color: THEME.colors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  categorySubText: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusPillReview: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusPillMastered: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.cyan,
  },
  statusTextReview: {
    color: THEME.colors.amber,
  },
  statusTextMastered: {
    color: THEME.colors.emerald,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 300,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
