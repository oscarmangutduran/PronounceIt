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
} from 'lucide-react-native';
import { CategoryItem } from '../../types';
import { THEME } from '../../theme';

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
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Grammar: true,
    Readings: true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
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

  // MOBILE: Compact Horizontal Scroll
  if (!isDesktop) {
    return (
      <View style={styles.mobileContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollList}
        >
          {/* Todas */}
          <TouchableOpacity
            style={[styles.chip, isSelected('all') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'all' })}
            activeOpacity={0.75}
          >
            <BookOpen size={14} color={isSelected('all') ? '#ffffff' : THEME.colors.textMuted} />
            <Text style={[styles.chipText, isSelected('all') && styles.chipTextActive]}>
              Todas
            </Text>
            <View style={[styles.badge, isSelected('all') && styles.badgeActive]}>
              <Text style={[styles.badgeText, isSelected('all') && styles.badgeTextActive]}>
                {totalWords}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Favoritas */}
          <TouchableOpacity
            style={[styles.chip, isSelected('favorites') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'favorites' })}
            activeOpacity={0.75}
          >
            <Star
              size={14}
              color={isSelected('favorites') ? '#ffffff' : '#eab308'}
              fill={isSelected('favorites') ? '#ffffff' : 'transparent'}
            />
            <Text style={[styles.chipText, isSelected('favorites') && styles.chipTextActive]}>
              Favoritas
            </Text>
            <View style={[styles.badge, isSelected('favorites') && styles.badgeActive]}>
              <Text style={[styles.badgeText, isSelected('favorites') && styles.badgeTextActive]}>
                {favoritesCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Por repasar */}
          <TouchableOpacity
            style={[styles.chip, isSelected('review') && styles.chipActive]}
            onPress={() => onSelectFilter({ type: 'review' })}
            activeOpacity={0.75}
          >
            <Clock size={14} color={isSelected('review') ? '#ffffff' : '#f87171'} />
            <Text style={[styles.chipText, isSelected('review') && styles.chipTextActive]}>
              Por repasar
            </Text>
            <View style={[styles.badge, isSelected('review') && styles.badgeActive]}>
              <Text style={[styles.badgeText, isSelected('review') && styles.badgeTextActive]}>
                {reviewCount}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // DESKTOP: Full Luxury Vertical Sidebar with Cards
  return (
    <View style={styles.desktopContainer}>
      {/* CARD 1: Categorías */}
      <View style={styles.sidebarCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Folder size={16} color="#ff4d6d" />
            <Text style={styles.cardTitle}>Categorías</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalWords} total</Text>
            </View>
            <TouchableOpacity style={styles.collapseBtn}>
              <PanelLeftClose size={14} color={THEME.colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Button: + Nueva Categoría */}
        <TouchableOpacity
          style={styles.newCategoryBtn}
          onPress={onAddNewCategory}
          activeOpacity={0.8}
        >
          <Plus size={14} color={THEME.colors.crimsonLight} style={{ marginRight: 6 }} />
          <Text style={styles.newCategoryBtnText}>Nueva Categoría</Text>
        </TouchableOpacity>

        {/* Standard Category Items */}
        <View style={styles.categoryList}>
          {/* Todas las palabras */}
          <TouchableOpacity
            style={[styles.categoryItem, isSelected('all') && styles.categoryItemActive]}
            onPress={() => onSelectFilter({ type: 'all' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <BookOpen
                size={15}
                color={isSelected('all') ? '#ffffff' : THEME.colors.crimsonLight}
              />
              <Text style={[styles.itemText, isSelected('all') && styles.itemTextActive]}>
                Todas las palabras
              </Text>
            </View>
            <View style={[styles.countBadge, isSelected('all') && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, isSelected('all') && styles.countBadgeTextActive]}>
                {totalWords}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Favoritas */}
          <TouchableOpacity
            style={[styles.categoryItem, isSelected('favorites') && styles.categoryItemActive]}
            onPress={() => onSelectFilter({ type: 'favorites' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <Star
                size={15}
                color="#f59e0b"
                fill={isSelected('favorites') ? '#f59e0b' : '#f59e0b'}
              />
              <Text style={[styles.itemText, isSelected('favorites') && styles.itemTextActive]}>
                Favoritas
              </Text>
            </View>
            <View style={[styles.countBadge, isSelected('favorites') && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, isSelected('favorites') && styles.countBadgeTextActive]}>
                {favoritesCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Por repasar hoy */}
          <TouchableOpacity
            style={[styles.categoryItem, isSelected('review') && styles.categoryItemActive]}
            onPress={() => onSelectFilter({ type: 'review' })}
            activeOpacity={0.8}
          >
            <View style={styles.itemLeft}>
              <Clock size={15} color="#fb7185" />
              <Text style={[styles.itemText, isSelected('review') && styles.itemTextActive]}>
                Por repasar hoy
              </Text>
            </View>
            <View style={[styles.countBadge, isSelected('review') && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, isSelected('review') && styles.countBadgeTextActive]}>
                {reviewCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Divider: TEMARIOS DE ESTUDIO */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionDividerText}>TEMARIOS DE ESTUDIO</Text>
        </View>

        {/* Accordion Categories */}
        <View style={styles.treeList}>
          {categories.map((cat) => {
            const isExpanded = !!expandedGroups[cat.name];
            const groupActive = isSelected('category', cat.name);

            return (
              <View key={cat.id} style={styles.treeNode}>
                {/* Group Header */}
                <TouchableOpacity
                  style={[styles.treeHeader, groupActive && styles.treeHeaderActive]}
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
                        <ChevronDown size={14} color={THEME.colors.textSubtle} />
                      ) : (
                        <ChevronRight size={14} color={THEME.colors.textSubtle} />
                      )}
                    </TouchableOpacity>
                    <BookOpen
                      size={14}
                      color={cat.name === 'Grammar' ? '#f87171' : '#38bdf8'}
                    />
                    <Text style={styles.treeHeaderText}>{cat.name}</Text>
                  </View>
                  <Text style={styles.treeCountText}>{cat.count}</Text>
                </TouchableOpacity>

                {/* Subcategories */}
                {isExpanded && cat.subcategories && (
                  <View style={styles.subList}>
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
                            <Pin size={12} color={subActive ? '#ffffff' : THEME.colors.textSubtle} />
                            <Text style={[styles.subItemText, subActive && styles.subItemTextActive]}>
                              {sub.name}
                            </Text>
                          </View>
                          <Text style={[styles.subCountText, subActive && styles.subCountTextActive]}>
                            {sub.count}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* CARD 2: Retención Lexical */}
      <View style={styles.sidebarCard}>
        <View style={styles.retentionHeader}>
          <View style={styles.cardHeaderLeft}>
            <CheckCircle2 size={16} color="#34d399" />
            <Text style={styles.retentionTitle}>Retención Lexical</Text>
          </View>
          <Text style={styles.retentionPercentText}>{retentionPercent}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
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
            <Text style={styles.statValueWhite}>{masteredCount} términos</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>Meta semanal</Text>
            <Text style={styles.statValueCrimson}>120 términos</Text>
          </View>
        </View>

        {/* Bottom divider and SRS badge */}
        <View style={styles.srsRow}>
          <Text style={styles.srsLabel}>Repetición espaciada</Text>
          <View style={styles.srsBadge}>
            <View style={styles.srsDot} />
            <Text style={styles.srsText}>Activa</Text>
          </View>
        </View>
      </View>
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
  sidebarCard: {
    backgroundColor: '#140f22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
});
