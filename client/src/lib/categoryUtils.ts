import type { CategoryItem, WordItem } from '../types/index';

/**
 * Normaliza un nombre de categoría, subcategoría o palabra para comparaciones
 * estrictas sin duplicados (insensible a mayúsculas, tildes y espacios múltiples).
 */
export function normalizeEntityKey(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Deduplica y normaliza un listado de categorías, asegurando que:
 * 1. No existan categorías repetidas por nombre e idioma (insensible a mayúsculas, tildes y espacios).
 * 2. Si existen duplicados con diferentes IDs o subcategorías, se fusionan sus subcategorías.
 * 3. Las subcategorías internas también quedan deduplicadas por nombre normalizado y sin 'General'.
 */
export function deduplicateCategories(categories: CategoryItem[]): CategoryItem[] {
  if (!Array.isArray(categories)) return [];
  const map = new Map<string, CategoryItem>();

  for (const cat of categories) {
    if (!cat || typeof cat.name !== 'string') continue;
    const trimmedName = cat.name.trim().replace(/\s+/g, ' ');
    const normName = normalizeEntityKey(trimmedName);
    if (!normName) continue;
    const lang = (cat.language || 'en').trim().toLowerCase();
    const key = `${lang}::${normName}`;

    if (!map.has(key)) {
      const subMap = new Map<string, { id: string; name: string; count: number }>();
      (cat.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim().replace(/\s+/g, ' ');
        const subKey = normalizeEntityKey(subTrimmed);
        if (subKey && subKey !== 'general' && !subMap.has(subKey)) {
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
        language: lang,
        icon: cat.icon || 'Folder',
        count: cat.count || 0,
        subcategories: Array.from(subMap.values()),
      });
    } else {
      const existing = map.get(key)!;
      const subMap = new Map<string, { id: string; name: string; count: number }>();

      (existing.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim().replace(/\s+/g, ' ');
        const subKey = normalizeEntityKey(subTrimmed);
        if (subKey && subKey !== 'general' && !subMap.has(subKey)) {
          subMap.set(subKey, { ...s, name: subTrimmed });
        }
      });

      (cat.subcategories || []).forEach((s) => {
        if (!s || typeof s.name !== 'string') return;
        const subTrimmed = s.name.trim().replace(/\s+/g, ' ');
        const subKey = normalizeEntityKey(subTrimmed);
        if (subKey && subKey !== 'general' && !subMap.has(subKey)) {
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

/**
 * Deduplica palabras por (idioma + palabra normalizada), fusionando categorías y subcategorías
 * para evitar cualquier palabra repetida en el estado local o tras sincronizaciones.
 */
export function deduplicateWords(words: WordItem[]): WordItem[] {
  if (!Array.isArray(words)) return [];
  const map = new Map<string, WordItem>();

  const dedupeStrings = (arr: string[], excludeGeneral = false): string[] => {
    const seen = new Map<string, string>();
    for (const raw of arr) {
      const clean = String(raw || '').trim().replace(/\s+/g, ' ');
      const k = normalizeEntityKey(clean);
      if (!k) continue;
      if (excludeGeneral && k === 'general') continue;
      if (!seen.has(k)) seen.set(k, clean);
    }
    return Array.from(seen.values());
  };

  for (const w of words) {
    if (!w || typeof w.word !== 'string') continue;
    const cleanWord = w.word.trim().replace(/\s+/g, ' ');
    const normWord = normalizeEntityKey(cleanWord);
    if (!normWord) continue;
    const lang = (w.language || 'en').trim().toLowerCase();
    const key = `${lang}::${normWord}`;

    if (!map.has(key)) {
      map.set(key, { ...w, word: cleanWord, language: lang });
    } else {
      const existing = map.get(key)!;
      const existingCats = [
        ...(Array.isArray(existing.categoryGroups) ? existing.categoryGroups : []),
        ...(existing.categoryGroup ? existing.categoryGroup.split(',') : []),
      ];
      const incomingCats = [
        ...(Array.isArray(w.categoryGroups) ? w.categoryGroups : []),
        ...(w.categoryGroup ? w.categoryGroup.split(',') : []),
      ];
      const mergedCatsNonGeneral = dedupeStrings([...existingCats, ...incomingCats], true);
      const finalCats = mergedCatsNonGeneral.length > 0 ? mergedCatsNonGeneral : ['General'];

      const existingSubs = [
        ...(Array.isArray(existing.categorySubs) ? existing.categorySubs : []),
        ...(existing.categorySub ? existing.categorySub.split(',') : []),
      ];
      const incomingSubs = [
        ...(Array.isArray(w.categorySubs) ? w.categorySubs : []),
        ...(w.categorySub ? w.categorySub.split(',') : []),
      ];
      const finalSubs = dedupeStrings([...existingSubs, ...incomingSubs], true);

      map.set(key, {
        ...existing,
        translation: existing.translation || w.translation,
        ipa: existing.ipa || w.ipa,
        phoneticGuide: existing.phoneticGuide || w.phoneticGuide,
        exampleEn: existing.exampleEn || w.exampleEn,
        exampleEs: existing.exampleEs || w.exampleEs,
        categoryGroups: finalCats,
        categoryGroup: finalCats.join(', '),
        categorySubs: finalSubs,
        categorySub: finalSubs.join(', '),
      });
    }
  }

  return Array.from(map.values());
}
