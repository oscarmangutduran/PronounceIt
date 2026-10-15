import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
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
  Folder,
  Award,
  Activity,
  Check,
  X,
} from 'lucide-react-native';
import { WordItem, WordStatus } from '../../types';
import { vocabService, getWordCategories, getWordSubcategories } from '../../lib/vocabularyStore';
import { SelectedFilter } from './SidebarCategories';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';
import { useResponsive } from '../../lib/useResponsive';

interface VocabularyTableViewProps {
  words: WordItem[];
  selectedFilter: SelectedFilter;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenAddModal: () => void;
  onOpenAddCategoryModal?: () => void;
  onOpenExportModal: () => void;
  onStartPractice: () => void;
  onEditWord: (word: WordItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: WordStatus) => void;
  onDeleteWord: (id: string) => void;
  isDark?: boolean;
}

const LEVEL_OPTIONS = [
  { id: 'all', label: 'Todos los niveles', sublabel: 'A1 - C2', desc: 'Muestra palabras de cualquier nivel', badgeBg: 'rgba(56, 189, 248, 0.2)', badgeColor: '#38bdf8' },
  { id: 'A1', label: 'A1 - Principiante', sublabel: 'Principiante', desc: 'Vocabulario esencial y cotidiano', badgeBg: 'rgba(16, 185, 129, 0.2)', badgeColor: '#10b981' },
  { id: 'A2', label: 'A2 - Elemental', sublabel: 'Elemental', desc: 'Expresiones y frases básicas', badgeBg: 'rgba(34, 197, 94, 0.2)', badgeColor: '#22c55e' },
  { id: 'B1', label: 'B1 - Intermedio', sublabel: 'Intermedio', desc: 'Situaciones de viajes y trabajo', badgeBg: 'rgba(234, 179, 8, 0.2)', badgeColor: '#eab308' },
  { id: 'B2', label: 'B2 - Intermedio Alto', sublabel: 'Intermedio Alto', desc: 'Textos complejos y argumentación', badgeBg: 'rgba(249, 115, 22, 0.2)', badgeColor: '#f97316' },
  { id: 'C1', label: 'C1 - Avanzado', sublabel: 'Avanzado', desc: 'Fluidez y vocabulario especializado', badgeBg: 'rgba(168, 85, 247, 0.2)', badgeColor: '#a855f7' },
  { id: 'C2', label: 'C2 - Maestría', sublabel: 'Maestría', desc: 'Precisión y matices nativos', badgeBg: 'rgba(236, 72, 153, 0.2)', badgeColor: '#ec4899' },
] as const;

const STATUS_OPTIONS = [
  { id: 'all', label: 'Todos los estados', desc: 'Todas las palabras registradas', dotColor: '#38bdf8' },
  { id: 'nueva', label: 'Nuevas', desc: 'Palabras agregadas recientemente sin dominar', dotColor: '#94a3b8' },
  { id: 'en_repaso', label: 'En repaso', desc: 'Palabras activas para practicar en tu SRS', dotColor: '#f59e0b' },
  { id: 'dominada', label: 'Dominadas', desc: 'Términos aprendidos con éxito', dotColor: '#10b981' },
] as const;

export const VocabularyTableView: React.FC<VocabularyTableViewProps> = ({
  words,
  selectedFilter,
  onOpenAddModal,
  onOpenAddCategoryModal,
  onOpenExportModal,
  onStartPractice,
  onEditWord,
  onToggleFavorite,
  onUpdateStatus,
  onDeleteWord,
  isDark = true,
}) => {
  const { isTableView, isPhone, isDesktop, width } = useResponsive();
  const isCompact = isPhone || (width > 0 && width < 600);

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState<number>(6);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wordToDelete, setWordToDelete] = useState<WordItem | null>(null);

  // Word counts per level
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: words.length };
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach((lvl) => {
      counts[lvl] = words.filter((w) => w.level === lvl).length;
    });
    return counts;
  }, [words]);

  // Word counts per status
  const statusCounts = useMemo(() => {
    return {
      all: words.length,
      nueva: words.filter((w) => !w.status || w.status === 'nueva').length,
      en_repaso: words.filter((w) => w.status === 'en_repaso').length,
      dominada: words.filter((w) => w.status === 'dominada').length,
    };
  }, [words]);

  const handleSelectLevel = (levelId: string) => {
    setLevelFilter(levelId);
    setCurrentPage(1);
    setIsLevelModalOpen(false);
  };

  const handleSelectStatus = (statusId: string) => {
    setStatusFilter(statusId);
    setCurrentPage(1);
    setIsStatusModalOpen(false);
  };

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
      if (statusFilter !== 'all') {
        const effectiveStatus = w.status || 'nueva';
        if (effectiveStatus !== statusFilter) {
          return false;
        }
      }

      // 4. Sidebar filter
      if (selectedFilter.type === 'favorites') return w.isFavorite;
      if (selectedFilter.type === 'review') return w.status === 'en_repaso';
      if (selectedFilter.type === 'mastered') return w.status === 'dominada';
      if (selectedFilter.type === 'level') return w.level === selectedFilter.level;
      if (selectedFilter.type === 'category') {
        const groups = getWordCategories(w);
        if (!groups.some((g) => g.toLowerCase() === selectedFilter.group.toLowerCase())) return false;
        if (selectedFilter.sub) {
          const subs = getWordSubcategories(w);
          if (!subs.some((s) => s.toLowerCase() === selectedFilter.sub.toLowerCase())) return false;
        }
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
    setWordToDelete(word);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header: Breadcrumb, Title & Top Action Buttons */}
      <View style={[styles.headerRow, isCompact && styles.headerRowMobile]}>
        <View style={[styles.headerTitles, isCompact && styles.headerTitlesMobile]}>
          <Text style={[styles.breadcrumbText, !isDark && styles.breadcrumbTextLight]}>Biblioteca / {getBreadcrumbTitle()}</Text>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.mainTitle, !isDark && styles.mainTitleLight]}>{getSectionTitle()}</Text>
            <View style={styles.levelBadgePill}>
              <Text style={styles.levelBadgePillText}>A1 - C2</Text>
            </View>
          </View>
          <Text style={[styles.subtitleText, !isDark && styles.subtitleTextLight]}>{filteredWords.length} palabras registradas</Text>
        </View>

        {/* Action Buttons */}
        {isCompact ? (
          <View style={styles.headerActionsMobile}>
            {/* Primary actions: 1. Añadir Categoría  2. Añadir Palabra */}
            <View style={styles.primaryActionsMobileRow}>
              {/* 1. Añadir Categoría */}
              <TouchableOpacity
                style={[styles.btnCategoryMobile, !isDark && styles.btnCategoryMobileLight]}
                onPress={onOpenAddCategoryModal}
                activeOpacity={0.8}
              >
                <Folder size={14} color={!isDark ? '#e11d48' : '#ff758c'} style={{ marginRight: 6 }} />
                <Text
                  style={[styles.btnCategoryTextMobile, !isDark && styles.btnCategoryTextMobileLight]}
                  numberOfLines={1}
                >
                  Añadir Categoría
                </Text>
              </TouchableOpacity>

              {/* 2. Añadir Palabra */}
              <TouchableOpacity
                style={styles.btnCrimsonHalfMobile}
                onPress={onOpenAddModal}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnCrimsonTextHalfMobile} numberOfLines={1}>
                  Añadir Palabra
                </Text>
              </TouchableOpacity>
            </View>

            {/* Secondary actions: Exportar & Practicar side by side */}
            <View style={styles.secondaryActionsMobileRow}>
              <TouchableOpacity
                style={[styles.btnOutline, !isDark && styles.btnOutlineLight, styles.btnMobileHalf]}
                onPress={onOpenExportModal}
                activeOpacity={0.8}
              >
                <Download size={14} color={!isDark ? '#64748b' : THEME.colors.textMuted} style={{ marginRight: 6 }} />
                <Text
                  style={[styles.btnOutlineText, styles.btnMobileHalfText, !isDark && styles.btnOutlineTextLight]}
                  numberOfLines={1}
                >
                  Exportar / Importar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPurple, styles.btnMobileHalf]}
                onPress={onStartPractice}
                activeOpacity={0.8}
              >
                <Layers size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={[styles.btnPurpleText, styles.btnMobileHalfText]} numberOfLines={1}>
                  Practicar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.headerActions}>
            {/* Exportar / Importar */}
            <TouchableOpacity
              style={[styles.btnOutline, !isDark && styles.btnOutlineLight]}
              onPress={onOpenExportModal}
              activeOpacity={0.8}
            >
              <Download size={14} color={!isDark ? '#64748b' : THEME.colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.btnOutlineText, !isDark && styles.btnOutlineTextLight]}>Exportar / Importar</Text>
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

            {/* 1. Añadir Categoría */}
            <TouchableOpacity
              style={[styles.btnCategory, !isDark && styles.btnCategoryLight]}
              onPress={onOpenAddCategoryModal}
              activeOpacity={0.8}
            >
              <Folder size={14} color={!isDark ? '#e11d48' : '#ff758c'} style={{ marginRight: 6 }} />
              <Text style={[styles.btnCategoryText, !isDark && styles.btnCategoryTextLight]}>Añadir Categoría</Text>
            </TouchableOpacity>

            {/* 2. Añadir Palabra */}
            <TouchableOpacity
              style={styles.btnCrimson}
              onPress={onOpenAddModal}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnCrimsonText}>Añadir Palabra</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. Filter Bar */}
      <View style={styles.filterBar}>
        {/* Search input with ⌘F */}
        <View style={[styles.searchInputContainer, !isDark && styles.searchInputContainerLight]}>
          <Search size={15} color={!isDark ? '#94a3b8' : THEME.colors.textSubtle} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, !isDark && styles.searchInputLight]}
            placeholder="Buscar por palabra en inglés, español o fonética..."
            placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              setCurrentPage(1);
            }}
          />
          <View style={[styles.kbdBadge, !isDark && styles.kbdBadgeLight]}>
            <Text style={[styles.kbdText, !isDark && styles.kbdTextLight]}>⌘F</Text>
          </View>
        </View>

        {/* Dropdown 1: Level */}
        <TouchableOpacity
          style={[
            styles.selectWrapper,
            !isDark && styles.selectWrapperLight,
            levelFilter !== 'all' && (isDark ? styles.selectWrapperActive : styles.selectWrapperActiveLight),
          ]}
          onPress={() => setIsLevelModalOpen(true)}
          activeOpacity={0.75}
          accessibilityLabel="Filtrar por nivel de dificultad"
        >
          {levelFilter !== 'all' && <View style={styles.activeFilterDot} />}
          <Text
            style={[
              styles.selectText,
              !isDark && styles.selectTextLight,
              levelFilter !== 'all' && (isDark ? styles.selectTextActive : styles.selectTextActiveLight),
            ]}
            numberOfLines={1}
          >
            {levelFilter === 'all' ? 'Nivel: Todos (A1-C2)' : `Nivel: ${levelFilter}`}
          </Text>
          <ChevronDown
            size={14}
            color={levelFilter !== 'all' ? '#e62e4c' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)}
          />
        </TouchableOpacity>

        {/* Dropdown 2: Status */}
        <TouchableOpacity
          style={[
            styles.selectWrapper,
            !isDark && styles.selectWrapperLight,
            statusFilter !== 'all' && (isDark ? styles.selectWrapperActive : styles.selectWrapperActiveLight),
          ]}
          onPress={() => setIsStatusModalOpen(true)}
          activeOpacity={0.75}
          accessibilityLabel="Filtrar por estado de aprendizaje"
        >
          {statusFilter !== 'all' && <View style={styles.activeFilterDot} />}
          <Text
            style={[
              styles.selectText,
              !isDark && styles.selectTextLight,
              statusFilter !== 'all' && (isDark ? styles.selectTextActive : styles.selectTextActiveLight),
            ]}
            numberOfLines={1}
          >
            {statusFilter === 'all'
              ? 'Estado: Todos'
              : statusFilter === 'en_repaso'
              ? 'Estado: En repaso'
              : statusFilter === 'dominada'
              ? 'Estado: Dominadas'
              : 'Estado: Nuevas'}
          </Text>
          <ChevronDown
            size={14}
            color={statusFilter !== 'all' ? '#e62e4c' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)}
          />
        </TouchableOpacity>

        {/* Clear Filters Button (Visible only when a filter is active) */}
        {(levelFilter !== 'all' || statusFilter !== 'all') && (
          <TouchableOpacity
            style={[styles.clearFilterBtn, !isDark && styles.clearFilterBtnLight]}
            onPress={() => {
              setLevelFilter('all');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            activeOpacity={0.75}
            accessibilityLabel="Limpiar filtros de nivel y estado"
          >
            <X size={12} color={!isDark ? '#e11d48' : '#ff758c'} style={{ marginRight: 4 }} />
            <Text style={[styles.clearFilterText, !isDark && styles.clearFilterTextLight]}>
              Limpiar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Table / Card View */}
      <View style={[styles.tableCard, !isDark && styles.tableCardLight]}>
        {/* Table Column Headers (Only for wide table view) */}
        {isTableView && (
          <View style={[styles.tableHeaderRow, !isDark && styles.tableHeaderRowLight]}>
            <Text style={[styles.colHeader, !isDark && styles.colHeaderLight, { flex: 1.5 }]}>PALABRA (INGLÉS)</Text>
            <Text style={[styles.colHeader, !isDark && styles.colHeaderLight, { flex: 1.5 }]}>FONÉTICA & PRONUNCIACIÓN</Text>
            <Text style={[styles.colHeader, !isDark && styles.colHeaderLight, { flex: 1.5 }]}>TRADUCCIÓN (ESPAÑOL)</Text>
            <Text style={[styles.colHeader, !isDark && styles.colHeaderLight, { flex: 2.2 }]}>FRASE DE EJEMPLO (BILINGÜE)</Text>
            <Text style={[styles.colHeader, !isDark && styles.colHeaderLight, { flex: 1.3, textAlign: 'right' }]}>
              ESTADO & ACCIONES
            </Text>
          </View>
        )}

        {/* Content or Empty State */}
        {pageWords.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconBox}>
              <BookOpen size={28} color="#e62e4c" />
            </View>
            <Text style={[styles.emptyTitle, !isDark && styles.emptyTitleLight]}>
              {levelFilter !== 'all' || statusFilter !== 'all' || searchTerm.trim()
                ? 'No se encontraron palabras con estos filtros'
                : 'No hay palabras en esta sección'}
            </Text>
            <Text style={[styles.emptySubtitle, !isDark && styles.emptySubtitleLight]}>
              {levelFilter !== 'all' || statusFilter !== 'all' || searchTerm.trim()
                ? 'Prueba a cambiar el nivel, el estado o el término de búsqueda para ver más términos.'
                : 'Crea tus categorías y subcategorías temáticas para comenzar a organizar y añadir tus propias palabras y expresiones.'}
            </Text>
            {levelFilter !== 'all' || statusFilter !== 'all' || searchTerm.trim() ? (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  setLevelFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                activeOpacity={0.85}
              >
                <X size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Restablecer filtros</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={onOpenAddModal}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Añadir primera palabra</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : !isTableView ? (
          /* RESPONSIVE WORD CARDS (Mobile Portrait & Landscape, Tablet Portrait) */
          <ScrollView style={styles.tableBody} contentContainerStyle={styles.cardList}>
            {pageWords.map((word, index) => (
              <View key={`${word.id || index}_${index}`} style={[styles.wordCard, !isDark && styles.wordCardLight]}>
                {/* 1. Top Bar: Word, speaker, level tag + status pill, star, edit, delete */}
                <View style={styles.wordCardTop}>
                  <View style={styles.wordCardTitleArea}>
                    <TouchableOpacity
                      style={styles.speakerBtn}
                      onPress={() => vocabService.speak(word.word)}
                    >
                      <Volume2 size={16} color={THEME.colors.crimsonLight} />
                    </TouchableOpacity>
                    <View>
                      <Text style={[styles.cardWordTitle, !isDark && styles.cardWordTitleLight]}>{word.word}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {word.level && <Text style={styles.rowLevelTag}>{word.level}</Text>}
                        {word.partOfSpeech ? (
                          <View style={[styles.rowPosTag, !isDark && styles.rowPosTagLight]}>
                            <Text style={[styles.rowPosTagText, !isDark && styles.rowPosTagTextLight]}>
                              {word.partOfSpeech}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActionsArea}>
                    <View
                      style={[
                        styles.statusPill,
                        word.status === 'dominada' && styles.statusMastered,
                        word.status === 'en_repaso' && styles.statusReview,
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {word.status === 'dominada'
                          ? 'dominada'
                          : word.status === 'en_repaso'
                          ? 'en repaso'
                          : 'nueva'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => onToggleFavorite(word.id)}
                    >
                      <Star
                        size={16}
                        color={word.isFavorite ? '#f59e0b' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)}
                        fill={word.isFavorite ? '#f59e0b' : 'transparent'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => onEditWord(word)}>
                      <Edit2 size={15} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(word)}>
                      <Trash2 size={15} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Meta: Phonetics & Translation */}
                <View style={[styles.wordCardMetaRow, !isDark && styles.wordCardMetaRowLight]}>
                  <View style={styles.cardMetaBlock}>
                    <Text style={styles.cardMetaLabel}>FONÉTICA</Text>
                    <Text style={styles.rowIpa}>
                      {word.ipa || (word as any).phonetic || '—'}
                    </Text>
                    {(word.phoneticGuide || (word as any).phoneticNote) ? (
                      <Text style={styles.rowGuide}>
                        {word.phoneticGuide || (word as any).phoneticNote}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.cardMetaBlock}>
                    <Text style={styles.cardMetaLabel}>TRADUCCIÓN</Text>
                    <Text style={[styles.cardTranslationText, !isDark && styles.cardTranslationTextLight]}>{word.translation || '—'}</Text>
                  </View>
                </View>

                {/* 3. Example sentence (if present) */}
                {(word.exampleEn || (word as any).exampleSentence || (word as any).example) && (
                  <View style={[styles.cardExampleBlock, !isDark && styles.cardExampleBlockLight]}>
                    <Text style={[styles.cardExampleEn, !isDark && styles.cardExampleEnLight]}>
                      "{word.exampleEn || (word as any).exampleSentence || (word as any).example}"
                    </Text>
                    {(word.exampleEs || (word as any).exampleTranslation) ? (
                      <Text style={[styles.cardExampleEs, !isDark && styles.cardExampleEsLight]}>
                        {word.exampleEs || (word as any).exampleTranslation}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          /* FULL TABLE VIEW (Desktop and Tablet Landscape) */
          <ScrollView style={styles.tableBody}>
            {pageWords.map((word, index) => (
              <View key={`${word.id || index}_${index}`} style={[styles.tableRow, !isDark && styles.tableRowLight]}>
                {/* 1. Word (English) */}
                <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.speakerBtn}
                    onPress={() => vocabService.speak(word.word)}
                  >
                    <Volume2 size={14} color={THEME.colors.crimsonLight} />
                  </TouchableOpacity>
                  <View>
                    <Text style={[styles.rowWord, !isDark && styles.rowWordLight]}>{word.word}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {word.level && <Text style={styles.rowLevelTag}>{word.level}</Text>}
                      {word.partOfSpeech ? (
                        <View style={[styles.rowPosTag, !isDark && styles.rowPosTagLight]}>
                          <Text style={[styles.rowPosTagText, !isDark && styles.rowPosTagTextLight]}>
                            {word.partOfSpeech}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* 2. Phonetics */}
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.rowIpa}>
                    {word.ipa || (word as any).phonetic || '—'}
                  </Text>
                  {(word.phoneticGuide || (word as any).phoneticNote) ? (
                    <Text style={styles.rowGuide}>
                      {word.phoneticGuide || (word as any).phoneticNote}
                    </Text>
                  ) : null}
                </View>

                {/* 3. Translation */}
                <View style={{ flex: 1.5 }}>
                  <Text style={[styles.rowTranslation, !isDark && styles.rowTranslationLight]}>{word.translation || '—'}</Text>
                </View>

                {/* 4. Example Sentence */}
                <View style={{ flex: 2.2 }}>
                  <Text style={[styles.rowExampleEn, !isDark && styles.rowExampleEnLight]} numberOfLines={2}>
                    {word.exampleEn || (word as any).exampleSentence || (word as any).example || '—'}
                  </Text>
                  {(word.exampleEs || (word as any).exampleTranslation) ? (
                    <Text style={[styles.rowExampleEs, !isDark && styles.rowExampleEsLight]} numberOfLines={2}>
                      {word.exampleEs || (word as any).exampleTranslation}
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
                    <Text style={styles.statusPillText}>
                      {word.status === 'dominada'
                        ? 'dominada'
                        : word.status === 'en_repaso'
                        ? 'en repaso'
                        : 'nueva'}
                    </Text>
                  </View>

                  {/* Favorite star */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => onToggleFavorite(word.id)}
                  >
                    <Star
                      size={14}
                      color={word.isFavorite ? '#f59e0b' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)}
                      fill={word.isFavorite ? '#f59e0b' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Edit */}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onEditWord(word)}>
                    <Edit2 size={13} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
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
        <View style={[styles.paginationFooter, !isDark && styles.paginationFooterLight]}>
          {/* Showing count */}
          <View style={styles.paginationLeft}>
            <Text style={[styles.paginationText, !isDark && styles.paginationTextLight]}>
              Mostrando{' '}
              <Text style={[styles.paginationBold, !isDark && styles.paginationBoldLight]}>
                {filteredWords.length > 0 ? startIndex + 1 : 0}
              </Text>{' '}
              -{' '}
              <Text style={[styles.paginationBold, !isDark && styles.paginationBoldLight]}>
                {startIndex + pageWords.length}
              </Text>{' '}
              de <Text style={[styles.paginationBold, !isDark && styles.paginationBoldLight]}>{filteredWords.length}</Text> palabras
            </Text>

            {/* Rows per page */}
            <View style={styles.rowsPerPageBox}>
              <Text style={[styles.paginationText, !isDark && styles.paginationTextLight]}>Filas por página:</Text>
              <View style={[styles.rowsSelect, !isDark && styles.rowsSelectLight]}>
                <Text style={[styles.rowsSelectText, !isDark && styles.rowsSelectTextLight]}>6</Text>
                <ChevronDown size={12} color={!isDark ? '#94a3b8' : THEME.colors.textSubtle} />
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
              style={[styles.pageBtn, !isDark && styles.pageBtnLight, validPage <= 1 && styles.pageBtnDisabled]}
              disabled={validPage <= 1}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} color={validPage <= 1 ? '#94a3b8' : (!isDark ? '#0f172a' : '#ffffff')} />
            </TouchableOpacity>

            <Text style={styles.pageNumberText}>
              Pág. {validPage} de {totalPages}
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, !isDark && styles.pageBtnLight, validPage >= totalPages && styles.pageBtnDisabled]}
              disabled={validPage >= totalPages}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={14} color={validPage >= totalPages ? '#475569' : '#ffffff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!wordToDelete}
        title="Eliminar Palabra"
        message={`¿Estás seguro de que deseas eliminar permanentemente "${wordToDelete?.word}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (wordToDelete) {
            onDeleteWord(wordToDelete.id);
            setWordToDelete(null);
          }
        }}
        onCancel={() => setWordToDelete(null)}
      />

      {/* Level Selection Modal */}
      <Modal
        visible={isLevelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLevelModalOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsLevelModalOpen(false)}
          />
          <View style={[styles.pickerCard, !isDark && styles.pickerCardLight]}>
            {/* Header */}
            <View style={[styles.pickerHeader, !isDark && styles.pickerHeaderLight]}>
              <View style={styles.pickerHeaderLeft}>
                <View style={[styles.pickerIconCircle, !isDark && styles.pickerIconCircleLight]}>
                  <Award size={18} color="#e62e4c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, !isDark && styles.pickerTitleLight]}>
                    Nivel de dificultad
                  </Text>
                  <Text style={[styles.pickerSubtitle, !isDark && styles.pickerSubtitleLight]}>
                    Filtra por marco común europeo (MCER)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsLevelModalOpen(false)}
                style={[styles.pickerCloseBtn, !isDark && styles.pickerCloseBtnLight]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar selector de nivel"
              >
                <X size={18} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView style={styles.pickerBody} contentContainerStyle={styles.pickerBodyContent}>
              {LEVEL_OPTIONS.map((opt) => {
                const isSelected = levelFilter === opt.id;
                const count = levelCounts[opt.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.pickerItem,
                      !isDark && styles.pickerItemLight,
                      isSelected && (isDark ? styles.pickerItemActive : styles.pickerItemActiveLight),
                    ]}
                    onPress={() => handleSelectLevel(opt.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View
                        style={[
                          styles.levelOptionBadge,
                          { backgroundColor: opt.badgeBg },
                        ]}
                      >
                        <Text style={[styles.levelOptionBadgeText, { color: opt.badgeColor }]}>
                          {opt.id === 'all' ? 'ALL' : opt.id}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemLabel,
                            !isDark && styles.pickerItemLabelLight,
                            isSelected && styles.pickerItemLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.pickerItemDesc, !isDark && styles.pickerItemDescLight]}>
                          {opt.desc}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pickerItemRight}>
                      <View style={[styles.pickerCountBadge, !isDark && styles.pickerCountBadgeLight]}>
                        <Text style={[styles.pickerCountText, !isDark && styles.pickerCountTextLight]}>
                          {count}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.pickerCheckCircle,
                          isSelected && styles.pickerCheckCircleActive,
                          !isSelected && !isDark && styles.pickerCheckCircleInactiveLight,
                        ]}
                      >
                        {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={isStatusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStatusModalOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsStatusModalOpen(false)}
          />
          <View style={[styles.pickerCard, !isDark && styles.pickerCardLight]}>
            {/* Header */}
            <View style={[styles.pickerHeader, !isDark && styles.pickerHeaderLight]}>
              <View style={styles.pickerHeaderLeft}>
                <View style={[styles.pickerIconCircle, !isDark && styles.pickerIconCircleLight]}>
                  <Activity size={18} color="#e62e4c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, !isDark && styles.pickerTitleLight]}>
                    Estado de aprendizaje
                  </Text>
                  <Text style={[styles.pickerSubtitle, !isDark && styles.pickerSubtitleLight]}>
                    Filtra por tu progreso de estudio y repaso
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsStatusModalOpen(false)}
                style={[styles.pickerCloseBtn, !isDark && styles.pickerCloseBtnLight]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar selector de estado"
              >
                <X size={18} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView style={styles.pickerBody} contentContainerStyle={styles.pickerBodyContent}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = statusFilter === opt.id;
                const count = (statusCounts as Record<string, number>)[opt.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.pickerItem,
                      !isDark && styles.pickerItemLight,
                      isSelected && (isDark ? styles.pickerItemActive : styles.pickerItemActiveLight),
                    ]}
                    onPress={() => handleSelectStatus(opt.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View
                        style={[
                          styles.statusOptionDotWrap,
                          { backgroundColor: `${opt.dotColor}22` },
                        ]}
                      >
                        <View style={[styles.statusOptionDot, { backgroundColor: opt.dotColor }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemLabel,
                            !isDark && styles.pickerItemLabelLight,
                            isSelected && styles.pickerItemLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.pickerItemDesc, !isDark && styles.pickerItemDescLight]}>
                          {opt.desc}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pickerItemRight}>
                      <View style={[styles.pickerCountBadge, !isDark && styles.pickerCountBadgeLight]}>
                        <Text style={[styles.pickerCountText, !isDark && styles.pickerCountTextLight]}>
                          {count}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.pickerCheckCircle,
                          isSelected && styles.pickerCheckCircleActive,
                          !isSelected && !isDark && styles.pickerCheckCircleInactiveLight,
                        ]}
                      >
                        {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Mobile Action Buttons Layout
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  headerTitlesMobile: {
    width: '100%',
  },
  headerActionsMobile: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  primaryActionsMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  btnCategoryMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 8,
    height: 40,
  },
  btnCategoryMobileLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  btnCategoryTextMobile: {
    color: '#ff758c',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCategoryTextMobileLight: {
    color: '#e11d48',
  },
  btnCrimsonHalfMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e62e4c',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 8,
    height: 40,
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  btnCrimsonTextHalfMobile: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    height: 38,
  },
  btnCategoryLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  btnCategoryText: {
    color: '#ff758c',
    fontSize: 12,
    fontWeight: '700',
  },
  btnCategoryTextLight: {
    color: '#e11d48',
  },
  secondaryActionsMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  btnMobileHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 38,
  },
  btnMobileHalfText: {
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: THEME.colors.bgCardAlt,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
    backgroundColor: THEME.colors.bgCardAlt,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.xl,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  selectWrapperActive: {
    borderColor: 'rgba(230, 46, 76, 0.5)',
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
  },
  activeFilterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#e62e4c',
  },
  selectText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectTextActive: {
    color: '#ff758c',
    fontWeight: '700',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
    borderRadius: THEME.radius.xl,
    paddingHorizontal: 12,
    height: 42,
  },
  clearFilterText: {
    color: '#ff758c',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Filter Picker Modal ──────────────────────
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  pickerBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  pickerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  pickerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pickerBody: {
    maxHeight: 420,
  },
  pickerBodyContent: {
    padding: 12,
    gap: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderColor: 'rgba(230, 46, 76, 0.45)',
  },
  pickerItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelOptionBadge: {
    minWidth: 42,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  levelOptionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusOptionDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  pickerItemLabelActive: {
    color: '#ff758c',
    fontWeight: '700',
  },
  pickerItemDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  pickerItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pickerCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  pickerCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pickerCheckCircleActive: {
    backgroundColor: '#e62e4c',
    borderColor: '#e62e4c',
  },

  // Table Card
  tableCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
  rowPosTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
  },
  rowPosTagLight: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fca5a5',
  },
  rowPosTagText: {
    fontSize: 9,
    color: '#ff758c',
    fontWeight: '700',
  },
  rowPosTagTextLight: {
    color: '#e11d48',
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

  // Responsive Word Cards (Mobile & Tablet Portrait)
  cardList: {
    padding: 12,
    gap: 12,
  },
  wordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  wordCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordCardTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardWordTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  cardActionsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: THEME.radius.md,
    padding: 10,
    gap: 16,
  },
  cardMetaBlock: {
    flex: 1,
  },
  cardMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardTranslationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34d399',
  },
  cardExampleBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.crimson,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 3,
  },
  cardExampleEn: {
    fontSize: 12,
    color: '#e2e8f0',
    fontStyle: 'italic',
  },
  cardExampleEs: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
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
    backgroundColor: THEME.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
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

  // Light Mode Overrides
  breadcrumbTextLight: {
    color: '#64748b',
  },
  mainTitleLight: {
    color: '#0f172a',
  },
  subtitleTextLight: {
    color: '#64748b',
  },
  btnOutlineLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  btnOutlineTextLight: {
    color: '#334155',
  },
  searchInputContainerLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchInputLight: {
    color: '#0f172a',
  },
  kbdBadgeLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  kbdTextLight: {
    color: '#64748b',
  },
  selectWrapperLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectTextLight: {
    color: '#0f172a',
  },
  tableCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
  },
  tableHeaderRowLight: {
    backgroundColor: '#f8fafc',
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  colHeaderLight: {
    color: '#64748b',
  },
  tableRowLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  rowWordLight: {
    color: '#0f172a',
  },
  rowTranslationLight: {
    color: '#334155',
  },
  rowExampleEnLight: {
    color: '#0f172a',
  },
  rowExampleEsLight: {
    color: '#64748b',
  },
  wordCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
  },
  cardWordTitleLight: {
    color: '#0f172a',
  },
  wordCardMetaRowLight: {
    backgroundColor: '#f8fafc',
  },
  cardTranslationTextLight: {
    color: '#334155',
  },
  cardExampleBlockLight: {
    backgroundColor: '#f8fafc',
  },
  cardExampleEnLight: {
    color: '#0f172a',
  },
  cardExampleEsLight: {
    color: '#64748b',
  },
  paginationFooterLight: {
    backgroundColor: '#ffffff',
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  paginationTextLight: {
    color: '#64748b',
  },
  paginationBoldLight: {
    color: '#0f172a',
  },
  rowsSelectLight: {
    backgroundColor: '#f1f5f9',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  rowsSelectTextLight: {
    color: '#0f172a',
  },
  pageBtnLight: {
    backgroundColor: '#f1f5f9',
  },
  selectWrapperActiveLight: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
  },
  selectTextActiveLight: {
    color: '#e11d48',
    fontWeight: '700',
  },
  clearFilterBtnLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  clearFilterTextLight: {
    color: '#e11d48',
  },
  pickerCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
  },
  pickerHeaderLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  pickerIconCircleLight: {
    backgroundColor: '#fff1f2',
  },
  pickerTitleLight: {
    color: '#0f172a',
  },
  pickerSubtitleLight: {
    color: '#64748b',
  },
  pickerCloseBtnLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  pickerItemLight: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  pickerItemActiveLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  pickerItemLabelLight: {
    color: '#0f172a',
  },
  pickerItemDescLight: {
    color: '#64748b',
  },
  pickerCountBadgeLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  pickerCountTextLight: {
    color: '#475569',
  },
  pickerCheckCircleInactiveLight: {
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
});
