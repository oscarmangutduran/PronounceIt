import type { CategoryItem } from '../types/index';

/**
 * Deduplica y normaliza un listado de categorías, asegurando que:
 * 1. No existan categorías repetidas por nombre (comparación insensible a mayúsculas y espacios).
 * 2. Si existen duplicados con diferentes IDs o subcategorías, se fusionan sus subcategorías.
 * 3. Las subcategorías internas también quedan deduplicadas por nombre.
 */
export function deduplicateCategories(categories: CategoryItem[]): CategoryItem[] {
  if (!Array.isArray(categories)) return [];
  const map = new Map<string, CategoryItem>();

  for (const cat of categories) {
    if (!cat || typeof cat.name !== 'string') continue;
    const trimmedName = cat.name.trim();
    const key = trimmedName.toLowerCase();
    if (!key) continue;

    if (!map.has(key)) {
      const subMap = new Map<string, { id: string; name: string; count: number }>();
      (cat.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim();
        const subKey = subTrimmed.toLowerCase();
        if (subKey && !subMap.has(subKey)) {
          subMap.set(subKey, {
            id: s.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: subTrimmed,
            count: s.count || 0,
          });
        }
      });

      map.set(key, {
        ...cat,
        id: cat.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: trimmedName,
        icon: cat.icon || 'Folder',
        count: cat.count || 0,
        subcategories: Array.from(subMap.values()),
      });
    } else {
      const existing = map.get(key)!;
      const subMap = new Map<string, { id: string; name: string; count: number }>();

      (existing.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim();
        const subKey = subTrimmed.toLowerCase();
        if (subKey && !subMap.has(subKey)) {
          subMap.set(subKey, { ...s, name: subTrimmed });
        }
      });

      (cat.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim();
        const subKey = subTrimmed.toLowerCase();
        if (subKey && !subMap.has(subKey)) {
          subMap.set(subKey, {
            id: s.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: subTrimmed,
            count: s.count || 0,
          });
        }
      });

      existing.subcategories = Array.from(subMap.values());
    }
  }

  return Array.from(map.values());
}
