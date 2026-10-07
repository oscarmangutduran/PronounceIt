import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Sparkles,
  Star,
  Clock,
  CheckCircle,
  Folder,
  Plus,
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
  const isSelected = (type: string, key?: string) => {
    if (selectedFilter.type === 'all' && type === 'all') return true;
    if (selectedFilter.type === 'favorites' && type === 'favorites') return true;
    if (selectedFilter.type === 'review' && type === 'review') return true;
    if (selectedFilter.type === 'mastered' && type === 'mastered') return true;
    if (selectedFilter.type === 'category' && type === 'category' && selectedFilter.group === key) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* All */}
        <TouchableOpacity
          style={[styles.chip, isSelected('all') && styles.chipActive]}
          onPress={() => onSelectFilter({ type: 'all' })}
          activeOpacity={0.75}
        >
          <Sparkles
            size={14}
            color={isSelected('all') ? '#ffffff' : THEME.colors.textMuted}
          />
          <Text style={[styles.chipText, isSelected('all') && styles.chipTextActive]}>
            Todas
          </Text>
          <View style={[styles.badge, isSelected('all') && styles.badgeActive]}>
            <Text style={[styles.badgeText, isSelected('all') && styles.badgeTextActive]}>
              {totalWords}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Favorites */}
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
            Favoritos
          </Text>
          <View style={[styles.badge, isSelected('favorites') && styles.badgeActive]}>
            <Text style={[styles.badgeText, isSelected('favorites') && styles.badgeTextActive]}>
              {favoritesCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* In review */}
        <TouchableOpacity
          style={[styles.chip, isSelected('review') && styles.chipActive]}
          onPress={() => onSelectFilter({ type: 'review' })}
          activeOpacity={0.75}
        >
          <Clock
            size={14}
            color={isSelected('review') ? '#ffffff' : THEME.colors.amber}
          />
          <Text style={[styles.chipText, isSelected('review') && styles.chipTextActive]}>
            En Repaso
          </Text>
          <View style={[styles.badge, isSelected('review') && styles.badgeActive]}>
            <Text style={[styles.badgeText, isSelected('review') && styles.badgeTextActive]}>
              {reviewCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Mastered */}
        <TouchableOpacity
          style={[styles.chip, isSelected('mastered') && styles.chipActive]}
          onPress={() => onSelectFilter({ type: 'mastered' })}
          activeOpacity={0.75}
        >
          <CheckCircle
            size={14}
            color={isSelected('mastered') ? '#ffffff' : THEME.colors.emerald}
          />
          <Text style={[styles.chipText, isSelected('mastered') && styles.chipTextActive]}>
            Dominadas
          </Text>
          <View style={[styles.badge, isSelected('mastered') && styles.badgeActive]}>
            <Text style={[styles.badgeText, isSelected('mastered') && styles.badgeTextActive]}>
              {masteredCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const active = isSelected('category', cat.name);
          return (
            <TouchableOpacity
              key={cat.id || cat.name}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelectFilter({ type: 'category', group: cat.name })}
              activeOpacity={0.75}
            >
              <Folder
                size={14}
                color={active ? '#ffffff' : THEME.colors.textMuted}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {cat.name}
              </Text>
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {cat.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {onAddNewCategory && (
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={onAddNewCategory}
            activeOpacity={0.75}
          >
            <Plus size={14} color={THEME.colors.crimsonLight} />
            <Text style={styles.addCategoryText}>Nueva</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 12, 24, 0.6)',
  },
  scrollList: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    gap: 6,
  },
  chipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
  },
  badgeTextActive: {
    color: '#ffffff',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(230, 46, 76, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    gap: 4,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  addCategoryText: {
    fontSize: 12,
    color: THEME.colors.crimsonLight,
    fontWeight: '600',
  },
});
