import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Search,
  Plus,
  Volume2,
  Star,
  Trash2,
  Edit2,
  Layers,
  Download,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState<number>(6);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter words
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      // 1. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchWord = w.word.toLowerCase().includes(query);
        const matchTrans = w.translation.toLowerCase().includes(query);
        const matchIpa = (w.ipa || '').toLowerCase().includes(query);
        const matchGuide = (w.phoneticGuide || '').toLowerCase().includes(query);
        if (!matchWord && !matchTrans && !matchIpa && !matchGuide) return false;
      }

      // 2. Level filter
      if (levelFilter !== 'all' && w.level !== levelFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all' && w.status !== statusFilter) {
        return false;
      }

      // 4. Sidebar filter
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
  }, [words, searchTerm, levelFilter, statusFilter, selectedFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredWords.length / rowsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * rowsPerPage;
  const pageWords = filteredWords.slice(startIndex, startIndex + rowsPerPage);

  const getBreadcrumbTitle = () => {
    if (selectedFilter.type === 'favorites') return 'Favoritas';
    if (selectedFilter.type === 'review') return 'Por repasar hoy';
    if (selectedFilter.type === 'mastered') return 'Dominadas';
    if (selectedFilter.type === 'category') {
      return selectedFilter.sub
        ? `${selectedFilter.group} / ${selectedFilter.sub}`
        : selectedFilter.group;
    }
    return 'Todas las palabras';
  };

  const getSectionTitle = () => {
    if (selectedFilter.type === 'favorites') return 'Favoritas';
    if (selectedFilter.type === 'review') return 'Por repasar hoy';
    if (selectedFilter.type === 'mastered') return 'Dominadas';
    if (selectedFilter.type === 'category') {
      return selectedFilter.sub ? selectedFilter.sub : selectedFilter.group;
    }
    return 'Todas las palabras';
  };

  const confirmDelete = (word: WordItem) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Seguro que deseas eliminar "${word.word}"?`)) {
        onDeleteWord(word.id);
      }
    } else {
      Alert.alert(
        'Eliminar palabra',
        `¿Seguro que deseas eliminar "${word.word}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteWord(word.id) },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header: Breadcrumb, Title & Top Action Buttons */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={styles.breadcrumbText}>Biblioteca / {getBreadcrumbTitle()}</Text>
          <View style={styles.titleWithBadge}>
            <Text style={styles.mainTitle}>{getSectionTitle()}</Text>
            <View style={styles.levelBadgePill}>
              <Text style={styles.levelBadgePillText}>A1 - C2</Text>
            </View>
          </View>
          <Text style={styles.subtitleText}>{filteredWords.length} palabras registradas</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          {/* Exportar / Importar */}
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={onOpenExportModal}
            activeOpacity={0.8}
          >
            <Download size={14} color={THEME.colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.btnOutlineText}>Exportar / Importar</Text>
          </TouchableOpacity>

          {/* Practicar */}
          <TouchableOpacity
            style={styles.btnPurple}
            onPress={onStartPractice}
            activeOpacity={0.8}
          >
            <Layers size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.btnPurpleText}>Practicar</Text>
          </TouchableOpacity>

          {/* + Añadir Palabra */}
          <TouchableOpacity
            style={styles.btnCrimson}
            onPress={onOpenAddModal}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.btnCrimsonText}>Añadir Palabra</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Filter Bar */}
      <View style={styles.filterBar}>
        {/* Search input with ⌘F */}
        <View style={styles.searchInputContainer}>
          <Search size={15} color={THEME.colors.textSubtle} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por palabra en inglés, español o fonética..."
            placeholderTextColor={THEME.colors.textSubtle}
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              setCurrentPage(1);
            }}
          />
          <View style={styles.kbdBadge}>
            <Text style={styles.kbdText}>⌘F</Text>
          </View>
        </View>

        {/* Dropdown 1: Level */}
        <View style={styles.selectWrapper}>
          <Text style={styles.selectText}>Nivel: Todos (A1-C2)</Text>
          <ChevronDown size={14} color={THEME.colors.textSubtle} />
        </View>

        {/* Dropdown 2: Status */}
        <View style={styles.selectWrapper}>
          <Text style={styles.selectText}>Estado: Todos</Text>
          <ChevronDown size={14} color={THEME.colors.textSubtle} />
        </View>
      </View>

      {/* 3. Table Card */}
      <View style={styles.tableCard}>
        {/* Table Column Headers */}
        {isDesktop && (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colHeader, { flex: 1.5 }]}>PALABRA (INGLÉS)</Text>
            <Text style={[styles.colHeader, { flex: 1.5 }]}>FONÉTICA & PRONUNCIACIÓN</Text>
            <Text style={[styles.colHeader, { flex: 1.5 }]}>TRADUCCIÓN (ESPAÑOL)</Text>
            <Text style={[styles.colHeader, { flex: 2.2 }]}>FRASE DE EJEMPLO (BILINGÜE)</Text>
            <Text style={[styles.colHeader, { flex: 1.3, textAlign: 'right' }]}>
              ESTADO & ACCIONES
            </Text>
          </View>
        )}

        {/* Table Content or Empty State */}
        {pageWords.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconBox}>
              <BookOpen size={28} color="#e62e4c" />
            </View>
            <Text style={styles.emptyTitle}>No hay palabras en esta sección</Text>
            <Text style={styles.emptySubtitle}>
              Las categorías Grammar y Readings están listas para que comiences a agregar tus
              propias palabras y expresiones.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onOpenAddModal}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyActionBtnText}>Añadir primera palabra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.tableBody}>
            {pageWords.map((word) => (
              <View key={word.id} style={styles.tableRow}>
                {/* 1. Word (English) */}
                <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.speakerBtn}
                    onPress={() => vocabService.speak(word.word)}
                  >
                    <Volume2 size={14} color={THEME.colors.crimsonLight} />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.rowWord}>{word.word}</Text>
                    {word.level && <Text style={styles.rowLevelTag}>{word.level}</Text>}
                  </View>
                </View>

                {/* 2. Phonetics */}
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.rowIpa}>{word.ipa || '—'}</Text>
                  {word.phoneticGuide ? (
                    <Text style={styles.rowGuide}>{word.phoneticGuide}</Text>
                  ) : null}
                </View>

                {/* 3. Translation */}
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.rowTranslation}>{word.translation}</Text>
                </View>

                {/* 4. Example Sentence */}
                <View style={{ flex: 2.2 }}>
                  <Text style={styles.rowExampleEn} numberOfLines={2}>
                    {word.exampleSentence || '—'}
                  </Text>
                  {word.exampleTranslation ? (
                    <Text style={styles.rowExampleEs} numberOfLines={2}>
                      {word.exampleTranslation}
                    </Text>
                  ) : null}
                </View>

                {/* 5. Status & Actions */}
                <View
                  style={{
                    flex: 1.3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  {/* Status badge */}
                  <View
                    style={[
                      styles.statusPill,
                      word.status === 'dominada' && styles.statusMastered,
                      word.status === 'en_repaso' && styles.statusReview,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{word.status}</Text>
                  </View>

                  {/* Favorite star */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => onToggleFavorite(word.id)}
                  >
                    <Star
                      size={14}
                      color={word.isFavorite ? '#f59e0b' : THEME.colors.textSubtle}
                      fill={word.isFavorite ? '#f59e0b' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Edit */}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onEditWord(word)}>
                    <Edit2 size={13} color={THEME.colors.textMuted} />
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(word)}>
                    <Trash2 size={13} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 4. Table Pagination Footer */}
        <View style={styles.paginationFooter}>
          {/* Showing count */}
          <View style={styles.paginationLeft}>
            <Text style={styles.paginationText}>
              Mostrando{' '}
              <Text style={styles.paginationBold}>
                {filteredWords.length > 0 ? startIndex + 1 : 0}
              </Text>{' '}
              -{' '}
              <Text style={styles.paginationBold}>
                {startIndex + pageWords.length}
              </Text>{' '}
              de <Text style={styles.paginationBold}>{filteredWords.length}</Text> palabras
            </Text>

            {/* Rows per page */}
            <View style={styles.rowsPerPageBox}>
              <Text style={styles.paginationText}>Filas por página:</Text>
              <View style={styles.rowsSelect}>
                <Text style={styles.rowsSelectText}>6</Text>
                <ChevronDown size={12} color={THEME.colors.textSubtle} />
              </View>
            </View>
          </View>

          {/* Keyboard Shortcuts Hint (Desktop only) */}
          {isDesktop && (
            <View style={styles.shortcutHints}>
              <View style={styles.shortcutItem}>
                <View style={styles.kbdBox}>
                  <Text style={styles.kbdBoxText}>Espacio</Text>
                </View>
                <Text style={styles.shortcutText}>Audio</Text>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.kbdBox}>
                  <Text style={styles.kbdBoxText}>N</Text>
                </View>
                <Text style={styles.shortcutText}>Nueva palabra</Text>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.kbdBox}>
                  <Text style={styles.kbdBoxText}>P</Text>
                </View>
                <Text style={styles.shortcutText}>Comenzar práctica</Text>
              </View>
            </View>
          )}

          {/* Pagination Controls */}
          <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[styles.pageBtn, validPage <= 1 && styles.pageBtnDisabled]}
              disabled={validPage <= 1}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} color={validPage <= 1 ? '#475569' : '#ffffff'} />
            </TouchableOpacity>

            <Text style={styles.pageNumberText}>
              Pág. {validPage} de {totalPages}
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, validPage >= totalPages && styles.pageBtnDisabled]}
              disabled={validPage >= totalPages}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={14} color={validPage >= totalPages ? '#475569' : '#ffffff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerTitles: {
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textSubtle,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  levelBadgePill: {
    backgroundColor: '#e62e4c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitleText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    height: 38,
  },
  btnOutlineText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  btnPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 16,
    height: 38,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPurpleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCrimson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e62e4c',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 16,
    height: 38,
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  btnCrimsonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchInputContainer: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#140f22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: THEME.radius.xl,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  kbdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kbdText: {
    color: THEME.colors.textSubtle,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#140f22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: THEME.radius.xl,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  selectText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Table Card
  tableCard: {
    backgroundColor: '#120d1e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: THEME.radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 4,
    flex: 1,
    minHeight: 400,
    justifyContent: 'space-between',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    letterSpacing: 0.8,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  speakerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWord: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  rowLevelTag: {
    fontSize: 10,
    color: THEME.colors.crimsonLight,
    fontWeight: '600',
  },
  rowIpa: {
    fontSize: 12,
    color: '#93c5fd',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  rowGuide: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
  },
  rowTranslation: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  rowExampleEn: {
    fontSize: 11,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  rowExampleEs: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusMastered: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusReview: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  iconBtn: {
    padding: 6,
  },

  // Empty state
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
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
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 440,
    marginBottom: 24,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e62e4c',
    borderRadius: THEME.radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Pagination Footer
  paginationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0e0a18',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    flexWrap: 'wrap',
    gap: 12,
  },
  paginationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  paginationText: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
  },
  paginationBold: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowsPerPageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowsSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  rowsSelectText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  shortcutHints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kbdBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kbdBoxText: {
    fontSize: 10,
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shortcutText: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageNumberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ff758c',
  },
});
