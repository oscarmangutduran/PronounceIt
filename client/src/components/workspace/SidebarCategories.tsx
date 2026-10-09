import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  BookOpen,
  Star,
  Clock,
  CheckCircle2,
  Folder,
  Plus,
  ChevronDown,
  ChevronRight,
  Pin,
  Bookmark,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import { CategoryItem } from '../../types';
import { THEME } from '../../theme';
import { vocabService } from '../../lib/vocabularyStore';
import { ConfirmModal } from '../common/ConfirmModal';
import { CategoryFormModal, CategoryFormMode } from './CategoryFormModal';
import { useResponsive } from '../../lib/useResponsive';

export type SelectedFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'review' }
  | { type: 'mastered' }
  | { type: 'level'; level: string }
  | { type: 'category'; group: string; sub?: string };

interface SidebarCategoriesProps {
  categories: CategoryItem[];
  selectedFilter: SelectedFilter;
  onSelectFilter: (filter: SelectedFilter) => void;
  totalWords: number;
  favoritesCount: number;
  reviewCount: number;
  masteredCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddNewCategory?: () => void;
  isDark?: boolean;
}

export const SidebarCategories: React.FC<SidebarCategoriesProps> = ({
  categories,
  selectedFilter,
  onSelectFilter,
  totalWords,
  favoritesCount,
  reviewCount,
  masteredCount,
  onAddNewCategory,
  isDark = true,
}) => {
  const { showSidebarSplit } = useResponsive();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: CategoryFormMode;
    categoryId?: string;
    subId?: string;
    categoryName?: string;
    initialValue: string;
  }>({
    isOpen: false,
    mode: 'create_category',
    initialValue: '',
  });

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryItem | null>(null);
  const [deleteSubTarget, setDeleteSubTarget] = useState<{
    category: CategoryItem;
    subcategory: { id: string; name: string; count: number };
  } | null>(null);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleOpenCreateCategory = () => {
    setFormModal({
      isOpen: true,
      mode: 'create_category',
      initialValue: '',
    });
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setFormModal({
      isOpen: true,
      mode: 'edit_category',
      categoryId: cat.id,
      initialValue: cat.name,
    });
  };

  const handleOpenCreateSubcategory = (cat: CategoryItem) => {
    setFormModal({
      isOpen: true,
      mode: 'create_subcategory',
      categoryId: cat.id,
      categoryName: cat.name,
      initialValue: '',
    });
  };

  const handleOpenEditSubcategory = (
    cat: CategoryItem,
    sub: { id: string; name: string; count: number }
  ) => {
    setFormModal({
      isOpen: true,
      mode: 'edit_subcategory',
      categoryId: cat.id,
      subId: sub.id,
      categoryName: cat.name,
      initialValue: sub.name,
    });
  };

  const handleFormSubmit = (name: string) => {
    if (formModal.mode === 'create_category') {
      const created = vocabService.addCategory(name);
      setExpandedGroups((prev) => ({ ...prev, [created.name]: true }));
    } else if (formModal.mode === 'edit_category' && formModal.categoryId) {
      vocabService.editCategory(formModal.categoryId, name);
    } else if (formModal.mode === 'create_subcategory' && formModal.categoryId) {
      vocabService.addSubcategory(formModal.categoryId, name);
      if (formModal.categoryName) {
        setExpandedGroups((prev) => ({ ...prev, [formModal.categoryName!]: true }));
      }
    } else if (formModal.mode === 'edit_subcategory' && formModal.categoryId && formModal.subId) {
      vocabService.editSubcategory(formModal.categoryId, formModal.subId, name);
    }
  };

  const isSelected = (type: string, key?: string, subKey?: string) => {
    if (selectedFilter.type === 'all' && type === 'all') return true;
    if (selectedFilter.type === 'favorites' && type === 'favorites') return true;
    if (selectedFilter.type === 'review' && type === 'review') return true;
    if (selectedFilter.type === 'mastered' && type === 'mastered') return true;
    if (selectedFilter.type === 'category' && type === 'category') {
      if (subKey) {
        return selectedFilter.group === key && selectedFilter.sub === subKey;
      }
      return selectedFilter.group === key && !selectedFilter.sub;
    }
    return false;
  };

  const retentionPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // MOBILE / TABLET PORTRAIT: Compact Horizontal Scroll
  if (!showSidebarSplit) {
    return (
      <View style={[styles.mobileContainer, !isDark && styles.mobileContainerLight]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollList}
        >
          {/* Todas */}
          <TouchableOpacity
            style={[styles.chip, !isDark && styles.chipLight, isSelected('all') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'all' })}
            activeOpacity={0.75}
          >
            <BookOpen size={14} color={isSelected('all') ? '#ffffff' : (!isDark ? '#64748b' : THEME.colors.textMuted)} />
            <Text style={[styles.chipText, !isDark && styles.chipTextLight, isSelected('all') && styles.chipTextActive]}>
              Todas
            </Text>
            <View style={[styles.badge, !isDark && styles.badgeLight, isSelected('all') && styles.badgeActive]}>
              <Text style={[styles.badgeText, !isDark && styles.badgeTextLight, isSelected('all') && styles.badgeTextActive]}>
                {totalWords}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Favoritas */}
          <TouchableOpacity
            style={[styles.chip, !isDark && styles.chipLight, isSelected('favorites') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'favorites' })}
            activeOpacity={0.75}
          >
            <Star
              size={14}
              color={isSelected('favorites') ? '#ffffff' : '#eab308'}
              fill={isSelected('favorites') ? '#ffffff' : 'transparent'}
            />
            <Text style={[styles.chipText, !isDark && styles.chipTextLight, isSelected('favorites') && styles.chipTextActive]}>
              Favoritas
            </Text>
            <View style={[styles.badge, !isDark && styles.badgeLight, isSelected('favorites') && styles.badgeActive]}>
              <Text style={[styles.badgeText, !isDark && styles.badgeTextLight, isSelected('favorites') && styles.badgeTextActive]}>
                {favoritesCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Por repasar */}
          <TouchableOpacity
            style={[styles.chip, !isDark && styles.chipLight, isSelected('review') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'review' })}
            activeOpacity={0.75}
          >
            <Clock size={14} color={isSelected('review') ? '#ffffff' : '#f87171'} />
            <Text style={[styles.chipText, !isDark && styles.chipTextLight, isSelected('review') && styles.chipTextActive]}>
              Por repasar
            </Text>
            <View style={[styles.badge, !isDark && styles.badgeLight, isSelected('review') && styles.badgeActive]}>
              <Text style={[styles.badgeText, !isDark && styles.badgeTextLight, isSelected('review') && styles.badgeTextActive]}>
                {reviewCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Categories */}
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, !isDark && styles.chipLight, isSelected('category', cat.name) && styles.chipActive]}
              onPress={() => onSelectFilter({ type: 'category', group: cat.name })}
              activeOpacity={0.75}
            >
              <Folder size={14} color={isSelected('category', cat.name) ? '#ffffff' : '#38bdf8'} />
              <Text style={[styles.chipText, !isDark && styles.chipTextLight, isSelected('category', cat.name) && styles.chipTextActive]}>
                {cat.name}
              </Text>
              <View style={[styles.badge, !isDark && styles.badgeLight, isSelected('category', cat.name) && styles.badgeActive]}>
                <Text style={[styles.badgeText, !isDark && styles.badgeTextLight, isSelected('category', cat.name) && styles.badgeTextActive]}>
                  {cat.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* + Nueva Categoría button */}
          <TouchableOpacity
            style={[styles.chip, !isDark && styles.chipLight, styles.chipNew, !isDark && styles.chipNewLight]}
            onPress={handleOpenCreateCategory}
            activeOpacity={0.75}
          >
            <Plus size={13} color="#e62e4c" />
            <Text style={[styles.chipText, { color: '#e62e4c', fontWeight: '700' }]}>
              Categoría
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <CategoryFormModal
          isOpen={formModal.isOpen}
          mode={formModal.mode}
          initialValue={formModal.initialValue}
          categoryName={formModal.categoryName}
          onClose={() => setFormModal((prev) => ({ ...prev, isOpen: false }))}
          onSubmit={handleFormSubmit}
        />
      </View>
    );
  }

  // DESKTOP: Full Luxury Vertical Sidebar with Cards

  // ── COLLAPSED STATE ──────────────────────────────────────────
  if (isCollapsed) {
    return (
      <View style={[styles.collapsedContainer, !isDark && styles.collapsedContainerLight]}>
        {/* Expand button */}
        <TouchableOpacity
          style={[styles.collapsedToggleBtn, !isDark && styles.collapsedToggleBtnLight]}
          onPress={() => setIsCollapsed(false)}
          activeOpacity={0.8}
          accessibilityLabel="Expandir menú lateral"
        >
          <PanelLeftOpen size={16} color={THEME.colors.crimsonLight} />
        </TouchableOpacity>

        {/* Quick filter icons */}
        <TouchableOpacity
          style={[styles.collapsedIconBtn, !isDark && styles.collapsedIconBtnLight, isSelected('all') && styles.collapsedIconBtnActive]}
          onPress={() => onSelectFilter({ type: 'all' })}
          activeOpacity={0.8}
        >
          <BookOpen size={15} color={isSelected('all') ? '#ffffff' : (!isDark ? '#64748b' : THEME.colors.textMuted)} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.collapsedIconBtn, !isDark && styles.collapsedIconBtnLight, isSelected('favorites') && styles.collapsedIconBtnActive]}
          onPress={() => onSelectFilter({ type: 'favorites' })}
          activeOpacity={0.8}
        >
          <Star size={15} color={isSelected('favorites') ? '#ffffff' : '#f59e0b'} fill={isSelected('favorites') ? '#ffffff' : 'transparent'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.collapsedIconBtn, !isDark && styles.collapsedIconBtnLight, isSelected('review') && styles.collapsedIconBtnActive]}
          onPress={() => onSelectFilter({ type: 'review' })}
          activeOpacity={0.8}
        >
          <Clock size={15} color={isSelected('review') ? '#ffffff' : '#fb7185'} />
        </TouchableOpacity>

        <View style={[styles.collapsedDivider, !isDark && styles.collapsedDividerLight]} />

        {categories.slice(0, 5).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.collapsedIconBtn,
              !isDark && styles.collapsedIconBtnLight,
              isSelected('category', cat.name) && styles.collapsedIconBtnActive,
            ]}
            onPress={() => onSelectFilter({ type: 'category', group: cat.name })}
            activeOpacity={0.8}
          >
            <Folder size={15} color={isSelected('category', cat.name) ? '#ffffff' : '#38bdf8'} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── EXPANDED STATE ────────────────────────────────────────────
  return (
    <View style={styles.desktopContainer}>
      {/* CARD 1: Categorías */}
      <View style={[styles.sidebarCard, !isDark && styles.sidebarCardLight]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Folder size={16} color="#ff4d6d" />
            <Text style={[styles.cardTitle, !isDark && styles.cardTitleLight]}>Categorías</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.totalBadge, !isDark && styles.totalBadgeLight]}>
              <Text style={[styles.totalBadgeText, !isDark && styles.totalBadgeTextLight]}>{totalWords} total</Text>
            </View>
            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={() => setIsCollapsed(true)}
              activeOpacity={0.8}
              accessibilityLabel="Ocultar menú lateral"
            >
              <PanelLeftClose size={14} color={!isDark ? '#94a3b8' : THEME.colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Button: + Nueva Categoría */}
        <TouchableOpacity
          style={[styles.newCategoryBtn, !isDark && styles.newCategoryBtnLight]}
          onPress={handleOpenCreateCategory}
          activeOpacity={0.8}
        >
          <Plus size={14} color={THEME.colors.crimsonLight} style={{ marginRight: 6 }} />
          <Text style={styles.newCategoryBtnText}>Nueva Categoría</Text>
        </TouchableOpacity>

        {/* Standard Category Items */}
        <View style={styles.categoryList}>
          {/* Todas las palabras */}
          <TouchableOpacity
            style={[
              styles.categoryItem,
              isSelected('all') && (isDark ? styles.categoryItemActive : styles.categoryItemActiveLight),
            ]}
            onPress={() => onSelectFilter({ type: 'all' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <BookOpen
                size={15}
                color={isSelected('all') ? THEME.colors.crimson : (!isDark ? '#64748b' : THEME.colors.crimsonLight)}
              />
              <Text
                style={[
                  styles.itemText,
                  !isDark && styles.itemTextLight,
                  isSelected('all') && styles.itemTextActive,
                ]}
              >
                Todas las palabras
              </Text>
            </View>
            <View
              style={[
                styles.countBadge,
                !isDark && styles.countBadgeLight,
                isSelected('all') && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  !isDark && styles.countBadgeTextLight,
                  isSelected('all') && styles.countBadgeTextActive,
                ]}
              >
                {totalWords}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Favoritas */}
          <TouchableOpacity
            style={[
              styles.categoryItem,
              isSelected('favorites') && (isDark ? styles.categoryItemActive : styles.categoryItemActiveLight),
            ]}
            onPress={() => onSelectFilter({ type: 'favorites' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <Star
                size={15}
                color="#f59e0b"
                fill="#f59e0b"
              />
              <Text
                style={[
                  styles.itemText,
                  !isDark && styles.itemTextLight,
                  isSelected('favorites') && styles.itemTextActive,
                ]}
              >
                Favoritas
              </Text>
            </View>
            <View
              style={[
                styles.countBadge,
                !isDark && styles.countBadgeLight,
                isSelected('favorites') && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  !isDark && styles.countBadgeTextLight,
                  isSelected('favorites') && styles.countBadgeTextActive,
                ]}
              >
                {favoritesCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Por repasar hoy */}
          <TouchableOpacity
            style={[
              styles.categoryItem,
              isSelected('review') && (isDark ? styles.categoryItemActive : styles.categoryItemActiveLight),
            ]}
            onPress={() => onSelectFilter({ type: 'review' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <Clock size={15} color="#fb7185" />
              <Text
                style={[
                  styles.itemText,
                  !isDark && styles.itemTextLight,
                  isSelected('review') && styles.itemTextActive,
                ]}
              >
                Por repasar hoy
              </Text>
            </View>
            <View
              style={[
                styles.countBadge,
                !isDark && styles.countBadgeLight,
                isSelected('review') && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  !isDark && styles.countBadgeTextLight,
                  isSelected('review') && styles.countBadgeTextActive,
                ]}
              >
                {reviewCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Divider: TEMARIOS DE ESTUDIO */}
        <View style={[styles.sectionDivider, !isDark && styles.sectionDividerLight]}>
          <Text style={[styles.sectionDividerText, !isDark && styles.sectionDividerTextLight]}>
            TEMARIOS DE ESTUDIO
          </Text>
        </View>

        {/* Categories Tree or Empty State */}
        {categories.length === 0 ? (
          <View style={styles.emptyCategoriesBox}>
            <Folder size={22} color={THEME.colors.textSubtle} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyCategoriesTitle}>Sin categorías creadas</Text>
            <Text style={styles.emptyCategoriesSub}>
              Crea tus propios temarios para organizar tus palabras por temas.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={handleOpenCreateCategory}
              activeOpacity={0.85}
            >
              <Plus size={12} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.emptyCreateBtnText}>Crear Categoría</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.treeList}>
            {categories.map((cat) => {
              const isExpanded = !!expandedGroups[cat.name];
              const groupActive = isSelected('category', cat.name);

              return (
                <View key={cat.id} style={styles.treeNode}>
                  {/* Group Header */}
                  <TouchableOpacity
                    style={[
                      styles.treeHeader,
                      groupActive && (isDark ? styles.treeHeaderActive : styles.treeHeaderActiveLight),
                    ]}
                    onPress={() => onSelectFilter({ type: 'category', group: cat.name })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.treeHeaderLeft}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleGroup(cat.name);
                        }}
                        style={{ padding: 2 }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} color={!isDark ? '#94a3b8' : THEME.colors.textSubtle} />
                        ) : (
                          <ChevronRight size={14} color={!isDark ? '#94a3b8' : THEME.colors.textSubtle} />
                        )}
                      </TouchableOpacity>
                      <Folder size={14} color="#ff4d6d" />
                      <Text style={[styles.treeHeaderText, !isDark && styles.treeHeaderTextLight]}>{cat.name}</Text>
                    </View>

                    <View style={styles.actionsContainer}>
                      {/* Action: Add subcategory */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleOpenCreateSubcategory(cat);
                        }}
                        accessibilityLabel="Añadir subcategoría"
                      >
                        <Plus size={12} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                      </TouchableOpacity>

                      {/* Action: Edit category */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleOpenEditCategory(cat);
                        }}
                        accessibilityLabel="Editar categoría"
                      >
                        <Edit2 size={11} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                      </TouchableOpacity>

                      {/* Action: Delete category */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setDeleteCategoryTarget(cat);
                        }}
                        accessibilityLabel="Eliminar categoría"
                      >
                        <Trash2 size={11} color="#f87171" />
                      </TouchableOpacity>

                      {/* Count Badge */}
                      <Text style={[styles.treeCountText, !isDark && styles.treeCountTextLight]}>{cat.count}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Subcategories */}
                  {isExpanded && cat.subcategories && cat.subcategories.length > 0 && (
                    <View style={[styles.subList, !isDark && styles.subListLight]}>
                      {cat.subcategories.map((sub) => {
                        const subActive = isSelected('category', cat.name, sub.name);
                        return (
                          <TouchableOpacity
                            key={sub.id}
                            style={[styles.subItem, subActive && styles.subItemActive]}
                            onPress={() =>
                              onSelectFilter({
                                type: 'category',
                                group: cat.name,
                                sub: sub.name,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <View style={styles.subItemLeft}>
                              <Pin size={11} color={subActive ? '#ffffff' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)} />
                              <Text
                                style={[
                                  styles.subItemText,
                                  !isDark && styles.subItemTextLight,
                                  subActive && styles.subItemTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {sub.name}
                              </Text>
                            </View>

                            <View style={styles.actionsContainer}>
                              {/* Edit subcategory */}
                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  handleOpenEditSubcategory(cat, sub);
                                }}
                              >
                                <Edit2 size={10} color={subActive ? '#ffffff' : (!isDark ? '#64748b' : THEME.colors.textMuted)} />
                              </TouchableOpacity>

                              {/* Delete subcategory */}
                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setDeleteSubTarget({ category: cat, subcategory: sub });
                                }}
                              >
                                <Trash2 size={10} color="#f87171" />
                              </TouchableOpacity>

                              <Text
                                style={[
                                  styles.subCountText,
                                  !isDark && styles.subCountTextLight,
                                  subActive && styles.subCountTextActive,
                                ]}
                              >
                                {sub.count}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* CARD 2: Retención Lexical */}
      <View style={[styles.sidebarCard, !isDark && styles.sidebarCardLight]}>
        <View style={styles.retentionHeader}>
          <View style={styles.cardHeaderLeft}>
            <CheckCircle2 size={16} color="#34d399" />
            <Text style={[styles.retentionTitle, !isDark && styles.retentionTitleLight]}>Retención Lexical</Text>
          </View>
          <Text style={styles.retentionPercentText}>{retentionPercent}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarBg, !isDark && styles.progressBarBgLight]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, retentionPercent))}%` },
            ]}
          />
        </View>

        {/* Stats breakdown */}
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Dominadas</Text>
            <Text style={[styles.statValueWhite, !isDark && styles.statValueDark]}>{masteredCount} términos</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>Meta semanal</Text>
            <Text style={styles.statValueCrimson}>120 términos</Text>
          </View>
        </View>

        {/* Bottom divider and SRS badge */}
        <View style={[styles.srsRow, !isDark && styles.srsRowLight]}>
          <Text style={styles.srsLabel}>Repetición espaciada</Text>
          <View style={styles.srsBadge}>
            <View style={styles.srsDot} />
            <Text style={styles.srsText}>Activa</Text>
          </View>
        </View>
      </View>

      {/* Create / Edit Category Modal */}
      <CategoryFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialValue={formModal.initialValue}
        categoryName={formModal.categoryName}
        onClose={() => setFormModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Category Confirmation Modal (Cascade to all its words) */}
      <ConfirmModal
        isOpen={!!deleteCategoryTarget}
        title={`¿Eliminar categoría "${deleteCategoryTarget?.name}"?`}
        message={
          (deleteCategoryTarget?.count || 0) > 0
            ? `Esta categoría contiene ${deleteCategoryTarget?.count} palabra(s). Al eliminarla, también se eliminarán permanentemente todas las palabras asociadas a ella.`
            : 'Esta categoría no tiene palabras asociadas. Se eliminará de tus temarios.'
        }
        confirmText="Eliminar Categoría y Palabras"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deleteCategoryTarget) {
            vocabService.deleteCategory(deleteCategoryTarget.id);
            if (
              selectedFilter.type === 'category' &&
              selectedFilter.group.toLowerCase() === deleteCategoryTarget.name.toLowerCase()
            ) {
              onSelectFilter({ type: 'all' });
            }
            setDeleteCategoryTarget(null);
          }
        }}
        onCancel={() => setDeleteCategoryTarget(null)}
      />

      {/* Delete Subcategory Confirmation Modal (Cascade to words in this subcategory) */}
      <ConfirmModal
        isOpen={!!deleteSubTarget}
        title={`¿Eliminar subcategoría "${deleteSubTarget?.subcategory.name}"?`}
        message={
          (deleteSubTarget?.subcategory.count || 0) > 0
            ? `Esta subcategoría contiene ${deleteSubTarget?.subcategory.count} palabra(s). Al eliminarla, también se eliminarán permanentemente todas las palabras que pertenecen a ella.`
            : 'Esta subcategoría no tiene palabras asociadas. Se eliminará de la categoría.'
        }
        confirmText="Eliminar Subcategoría y Palabras"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deleteSubTarget) {
            vocabService.deleteSubcategory(
              deleteSubTarget.category.id,
              deleteSubTarget.subcategory.id
            );
            if (
              selectedFilter.type === 'category' &&
              selectedFilter.group.toLowerCase() === deleteSubTarget.category.name.toLowerCase() &&
              selectedFilter.sub?.toLowerCase() === deleteSubTarget.subcategory.name.toLowerCase()
            ) {
              onSelectFilter({ type: 'category', group: deleteSubTarget.category.name });
            }
            setDeleteSubTarget(null);
          }
        }}
        onCancel={() => setDeleteSubTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile styles
  mobileContainer: {
    paddingVertical: 10,
    backgroundColor: '#0c0915',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  mobileScrollList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: THEME.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
  },
  badgeTextActive: {
    color: '#ffffff',
  },

  // Desktop styles
  desktopContainer: {
    width: 280,
    gap: 16,
  },

  // Collapsed sidebar
  collapsedContainer: {
    width: 52,
    gap: 6,
    alignItems: 'center',
    paddingTop: 4,
  },
  collapsedToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(230, 46, 76, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  collapsedIconBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedIconBtnActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  collapsedDivider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 2,
  },
  sidebarCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.xl,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSubtle,
  },
  collapseBtn: {
    padding: 4,
  },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.45)',
    borderRadius: THEME.radius.md,
    paddingVertical: 9,
    marginBottom: 14,
    backgroundColor: 'rgba(230, 46, 76, 0.06)',
  },
  newCategoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.crimsonLight,
  },
  categoryList: {
    gap: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
  },
  categoryItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  itemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSubtle,
  },
  countBadgeTextActive: {
    color: '#ffffff',
  },
  sectionDivider: {
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    letterSpacing: 0.8,
  },
  treeList: {
    gap: 4,
  },
  treeNode: {
    marginBottom: 2,
  },
  treeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: THEME.radius.sm,
  },
  treeHeaderActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  treeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  treeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  treeCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSubtle,
  },
  subList: {
    paddingLeft: 22,
    marginTop: 2,
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 14,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.radius.sm,
  },
  subItemActive: {
    backgroundColor: THEME.colors.crimson,
  },
  subItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subItemText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  subItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSubtle,
  },
  subCountTextActive: {
    color: '#ffffff',
  },

  // Retención Lexical Card styles
  retentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  retentionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  retentionPercentText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ff4d6d',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.crimson,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
    marginBottom: 2,
  },
  statValueWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statValueCrimson: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff4d6d',
  },
  srsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  srsLabel: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
  },
  srsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  srsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  srsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCategoriesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyCategoriesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptyCategoriesSub: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 15,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimson,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyCreateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  chipNew: {
    borderColor: 'rgba(230, 46, 76, 0.4)',
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
  },

  // Light Mode Overrides
  mobileContainerLight: {
    backgroundColor: '#ffffff',
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  chipNewLight: {
    borderColor: 'rgba(230, 46, 76, 0.35)',
    backgroundColor: 'rgba(230, 46, 76, 0.06)',
  },
  collapsedContainerLight: {
    backgroundColor: 'transparent',
  },
  collapsedToggleBtnLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderColor: 'rgba(230, 46, 76, 0.25)',
  },
  collapsedIconBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  collapsedDividerLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  chipLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  chipTextLight: {
    color: '#334155',
  },
  badgeLight: {
    backgroundColor: '#f1f5f9',
  },
  badgeTextLight: {
    color: '#64748b',
  },
  sidebarCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
  },
  cardTitleLight: {
    color: '#0f172a',
  },
  totalBadgeLight: {
    backgroundColor: '#f1f5f9',
  },
  totalBadgeTextLight: {
    color: '#64748b',
  },
  newCategoryBtnLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.06)',
    borderColor: 'rgba(230, 46, 76, 0.3)',
  },
  categoryItemActiveLight: {
    backgroundColor: '#f1f5f9',
  },
  itemTextLight: {
    color: '#334155',
  },
  countBadgeLight: {
    backgroundColor: '#f1f5f9',
  },
  countBadgeTextLight: {
    color: '#64748b',
  },
  sectionDividerLight: {
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  sectionDividerTextLight: {
    color: '#64748b',
  },
  treeHeaderActiveLight: {
    backgroundColor: '#f1f5f9',
  },
  treeHeaderTextLight: {
    color: '#0f172a',
  },
  treeCountTextLight: {
    color: '#64748b',
  },
  subListLight: {
    borderLeftColor: 'rgba(0, 0, 0, 0.08)',
  },
  subItemTextLight: {
    color: '#475569',
  },
  subCountTextLight: {
    color: '#64748b',
  },
  retentionTitleLight: {
    color: '#0f172a',
  },
  progressBarBgLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  statValueDark: {
    color: '#0f172a',
  },
  srsRowLight: {
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
});

