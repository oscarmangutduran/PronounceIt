import { Router, Request, Response } from 'express';

const router = Router();
const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

export interface NotionCategoryPayload {
  id?: string;
  name: string;
  subcategories?: { id?: string; name: string; count?: number }[];
}

export interface NotionWordPayload {
  id?: string;
  word: string;
  translation: string;
  ipa?: string;
  phoneticGuide?: string;
  exampleEn?: string;
  exampleEs?: string;
  level?: string;
  status?: string;
  categoryGroup?: string;
  categoryGroups?: string[];
  categorySub?: string;
  categorySubs?: string[];
  partOfSpeech?: string;
  language?: string;
}

/**
 * Normalizes a Notion property name for accent-insensitive and separator-insensitive matching.
 * e.g. "Sub categoría", "Sub-categoría", "Subcategoría" -> "sub categoria" / "subcategoria"
 */
function normalizePropKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts a clean 32-hex-char Notion Database ID from either a raw ID,
 * a hyphenated UUID, or a full Notion URL.
 */
export function extractNotionDatabaseId(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  const withoutQuery = trimmed.split('?')[0];
  const hexMatches = withoutQuery.replace(/-/g, '').match(/[0-9a-fA-F]{32}/g);
  if (hexMatches && hexMatches.length > 0) {
    return hexMatches[hexMatches.length - 1].toLowerCase();
  }
  return null;
}

function resolveNotionToken(clientToken?: string): string {
  const token =
    (clientToken || '').trim() ||
    (process.env.NOTION_API_KEY || '').trim() ||
    (process.env.NOTION_TOKEN || '').trim() ||
    (process.env.EXPO_PUBLIC_NOTION_API_KEY || '').trim();
  return token;
}

export function getCleanWordCategories(word: Partial<NotionWordPayload & any>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categoryGroups) && word.categoryGroups.length > 0) {
    raw.push(...word.categoryGroups);
  }
  if (word.categoryGroup) {
    raw.push(...String(word.categoryGroup).split(','));
  }
  if (Array.isArray(word.categories) && word.categories.length > 0) {
    raw.push(...word.categories.map((c: any) => (typeof c === 'string' ? c : c?.name)));
  }
  if (word.category) {
    raw.push(...String(word.category).split(','));
  }
  if (word.cat) {
    raw.push(...String(word.cat).split(','));
  }
  const cleaned = Array.from(
    new Set(
      raw
        .map((c) => String(c || '').trim())
        .filter(Boolean)
    )
  );
  const nonGeneral = cleaned.filter((c) => c.toLowerCase() !== 'general');
  if (nonGeneral.length > 0) return nonGeneral;
  return cleaned.length > 0 ? cleaned : ['General'];
}

export function getCleanWordSubcategories(word: Partial<NotionWordPayload & any>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categorySubs) && word.categorySubs.length > 0) {
    raw.push(...word.categorySubs);
  }
  if (word.categorySub) {
    raw.push(...String(word.categorySub).split(','));
  }
  if (Array.isArray(word.subcategories) && word.subcategories.length > 0) {
    raw.push(...word.subcategories.map((s: any) => (typeof s === 'string' ? s : s?.name)));
  }
  if (word.subcategory) {
    raw.push(...String(word.subcategory).split(','));
  }
  if (word.subCategory) {
    raw.push(...String(word.subCategory).split(','));
  }
  if (word.sub) {
    raw.push(...String(word.sub).split(','));
  }
  return Array.from(
    new Set(
      raw
        .map((s) => String(s || '').trim())
        .filter((s) => Boolean(s) && s.toLowerCase() !== 'general')
    )
  );
}

/**
 * Maps word status to the Notion gallery badges shown in the user's Notion view:
 * - 'nueva' -> 'Nuevo' (brown/amber)
 * - 'en_repaso' -> 'Repasar' (blue)
 * - 'dominada' -> 'Aprendido' (purple)
 * Also respects existing option names if the user's database uses 'Dominada' or 'Repasando'.
 */
function resolveStatusOptionName(status?: string, existingOptions?: { name: string }[]): string {
  const opts = Array.isArray(existingOptions) ? existingOptions.map((o) => o.name) : [];
  const hasOpt = (name: string) => opts.some((o) => o.toLowerCase() === name.toLowerCase());

  if (status === 'dominada' || status === 'mastered') {
    if (hasOpt('Aprendido')) return 'Aprendido';
    if (hasOpt('Dominada')) return 'Dominada';
    return 'Aprendido';
  }
  if (status === 'en_repaso' || status === 'reviewing' || status === 'learning') {
    if (hasOpt('Repasar')) return 'Repasar';
    if (hasOpt('Repasando')) return 'Repasando';
    return 'Repasar';
  }
  if (hasOpt('Nuevo')) return 'Nuevo';
  if (hasOpt('Nueva')) return 'Nueva';
  return 'Nuevo';
}

function mapNotionStatusToAppStatus(notionStatus?: string): 'nueva' | 'en_repaso' | 'dominada' {
  const clean = (notionStatus || '').trim().toLowerCase();
  if (['aprendido', 'dominada', 'dominado', 'mastered', 'learned'].includes(clean)) {
    return 'dominada';
  }
  if (['repasar', 'repasando', 'en repaso', 'en_repaso', 'review', 'reviewing', 'learning'].includes(clean)) {
    return 'en_repaso';
  }
  return 'nueva';
}

function formatPhoneticSlash(word: NotionWordPayload): string {
  const raw = (word.ipa || word.phoneticGuide || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') && raw.endsWith('/')) return raw;
  return `/${raw.replace(/^\/+|\/+$/g, '').replace(/^"+|"+$/g, '')}/`;
}

function buildExampleRichText(word: NotionWordPayload): any[] {
  const en = (word.exampleEn || '').trim();
  const esRaw = (word.exampleEs || '').trim();
  const richText: any[] = [];

  if (en) {
    richText.push({
      type: 'text',
      text: {
        content: esRaw ? `${en}\n` : en,
      },
    });
  }

  if (esRaw) {
    const esFormatted =
      esRaw.startsWith('(') && esRaw.endsWith(')') ? esRaw : `(${esRaw})`;
    richText.push({
      type: 'text',
      text: {
        content: esFormatted,
      },
      annotations: {
        italic: true,
        color: 'gray',
      },
    });
  }

  return richText;
}

function parseExampleFromNotionText(rawText: string): { exampleEn: string; exampleEs: string } {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return { exampleEn: '', exampleEs: '' };

  const match = trimmed.match(/^([\s\S]*?)[\s\n]*\(([^()]+)\)\s*$/);
  if (match) {
    return {
      exampleEn: match[1].trim().replace(/^"+|"+$/g, ''),
      exampleEs: match[2].trim().replace(/^"+|"+$/g, ''),
    };
  }
  return { exampleEn: trimmed, exampleEs: '' };
}

async function notionFetch(path: string, token: string, options: RequestInit = {}, retries = 3): Promise<{ ok: boolean; status: number; data: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${NOTION_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data: any = await res.json().catch(() => ({}));

    // Handle Notion 429 rate limits (3 req/s) or transient 502/503 with automatic backoff
    if ((res.status === 429 || res.status === 502 || res.status === 503) && attempt < retries) {
      const retryAfterSec = Number(res.headers.get('retry-after')) || 0;
      const delayMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 4000) : 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    return { ok: res.ok, status: res.status, data };
  }
  return { ok: false, status: 429, data: { message: 'Notion API rate limit exceeded' } };
}

const SUBCATEGORY_CANDIDATES = [
  'sub categoria',
  'subcategoria',
  'sub categorias',
  'subcategorias',
  'subcategory',
  'subcategories',
  'sub-categoria',
  'sub-categorias',
  'sub-category',
  'sub-categories',
  'sub_categoria',
  'sub_categorias',
  'sub_category',
  'sub_categories',
];

const CATEGORY_CANDIDATES = ['categoria', 'categorias', 'category', 'categories'];

/**
 * Ensures the target Notion database has all required properties AND creates any missing
 * Categoría / Sub categoría options in a fault-tolerant 2-step process so a schema PATCH
 * never fails due to existing option colors.
 */
async function ensureDatabaseSchema(
  databaseId: string,
  token: string,
  categoriesPayload?: NotionCategoryPayload[],
  wordsPayload?: NotionWordPayload[]
) {
  let dbRes = await notionFetch(`/databases/${databaseId}`, token, { method: 'GET' });
  if (!dbRes.ok) {
    return dbRes;
  }

  const getPropsMap = (propsObj: Record<string, any>) => {
    const map = new Map<string, string>();
    Object.keys(propsObj || {}).forEach((k) => {
      map.set(normalizePropKey(k), k);
    });
    return map;
  };

  let existingProps: Record<string, any> = dbRes.data?.properties || {};
  let normalizedMap = getPropsMap(existingProps);

  const findExistingPropName = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const found = normalizedMap.get(normalizePropKey(c));
      if (found) return found;
    }
    return null;
  };

  // STEP 1: Create any missing columns with clean empty schema definitions first
  const missingColumns: Record<string, any> = {};

  if (!findExistingPropName(['pronunciacion', 'fonetica', 'ipa'])) {
    missingColumns['Pronunciación'] = { rich_text: {} };
  }
  if (!findExistingPropName(['espanol', 'traduccion', 'significado'])) {
    missingColumns['Español'] = { rich_text: {} };
  }
  if (!findExistingPropName(['ejemplo', 'frase', 'oracion', 'example'])) {
    missingColumns['Ejemplo'] = { rich_text: {} };
  }
  if (!findExistingPropName(['estado', 'status'])) {
    missingColumns['Estado'] = {
      select: {
        options: [
          { name: 'Nuevo', color: 'brown' },
          { name: 'Repasar', color: 'blue' },
          { name: 'Aprendido', color: 'purple' },
          { name: 'Dominada', color: 'default' },
          { name: 'Repasando', color: 'gray' },
        ],
      },
    };
  }
  if (!findExistingPropName(CATEGORY_CANDIDATES)) {
    missingColumns['Categoría'] = { select: {} };
  }
  if (!findExistingPropName(SUBCATEGORY_CANDIDATES)) {
    missingColumns['Sub categoría'] = { select: {} };
  }
  if (!findExistingPropName(['nivel', 'level', 'mcer', 'cefr'])) {
    missingColumns['Nivel'] = {
      select: {
        options: [
          { name: 'A1', color: 'green' },
          { name: 'A2', color: 'green' },
          { name: 'B1', color: 'yellow' },
          { name: 'B2', color: 'orange' },
          { name: 'C1', color: 'purple' },
          { name: 'C2', color: 'pink' },
        ],
      },
    };
  }

  if (Object.keys(missingColumns).length > 0) {
    const createColsRes = await notionFetch(`/databases/${databaseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties: missingColumns }),
    });
    if (createColsRes.ok) {
      dbRes = createColsRes;
      existingProps = dbRes.data?.properties || {};
      normalizedMap = getPropsMap(existingProps);
    } else {
      // Fallback: create each missing column individually so one never blocks another
      for (const [colName, colDef] of Object.entries(missingColumns)) {
        const singleRes = await notionFetch(`/databases/${databaseId}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ properties: { [colName]: colDef } }),
        });
        if (singleRes.ok) {
          dbRes = singleRes;
        }
      }
      existingProps = dbRes.data?.properties || {};
      normalizedMap = getPropsMap(existingProps);
    }
  }

  // STEP 2: Collect all unique categories and subcategories (deduplicated case/accent/space-insensitively)
  const desiredCategoryMap = new Map<string, string>();
  const desiredSubcategoryMap = new Map<string, string>();

  const addDesiredCat = (rawName: string) => {
    const clean = String(rawName || '').trim().replace(/\s+/g, ' ').replace(/,/g, ' ').slice(0, 95);
    const norm = normalizePropKey(clean);
    if (norm && norm !== 'general' && !desiredCategoryMap.has(norm)) {
      desiredCategoryMap.set(norm, clean);
    }
  };

  const addDesiredSub = (rawName: string) => {
    const clean = String(rawName || '').trim().replace(/\s+/g, ' ').replace(/,/g, ' ').slice(0, 95);
    const norm = normalizePropKey(clean);
    if (norm && norm !== 'general' && !desiredSubcategoryMap.has(norm)) {
      desiredSubcategoryMap.set(norm, clean);
    }
  };

  if (Array.isArray(categoriesPayload)) {
    for (const cat of categoriesPayload) {
      addDesiredCat(cat?.name || '');
      if (Array.isArray(cat?.subcategories)) {
        for (const sub of cat.subcategories) {
          addDesiredSub(sub?.name || '');
        }
      }
    }
  }

  if (Array.isArray(wordsPayload)) {
    for (const w of wordsPayload) {
      if (!w) continue;
      for (const cName of getCleanWordCategories(w)) {
        addDesiredCat(cName);
      }
      for (const sName of getCleanWordSubcategories(w)) {
        addDesiredSub(sName);
      }
    }
  }

  const desiredCategoryNames = new Set<string>(desiredCategoryMap.values());
  const desiredSubcategoryNames = new Set<string>(desiredSubcategoryMap.values());

  const addOptionsToPropertyIfNeeded = async (propName: string | null, desiredNames: Set<string>) => {
    if (!propName || desiredNames.size === 0) return;
    const propDef = existingProps[propName];
    if (!propDef || (propDef.type !== 'select' && propDef.type !== 'multi_select')) return;

    const propType = propDef.type;
    const currentOptions: any[] = propDef[propType]?.options || [];
    const existingNamesNorm = new Set(
      currentOptions.map((o: any) => normalizePropKey(String(o?.name || '')))
    );
    const newNames = Array.from(desiredNames).filter(
      (n) => !existingNamesNorm.has(normalizePropKey(n))
    );

    if (newNames.length === 0) return;

    // In Notion API, EVERY option object MUST have 'name'. Passing { id } without name causes HTTP 400 validation_error!
    const mergedOptionsWithId = [
      ...currentOptions.map((o: any) => ({
        name: o.name,
        ...(o.id ? { id: o.id } : {}),
      })),
      ...newNames.map((name) => ({ name })),
    ];

    let optPatchRes = await notionFetch(`/databases/${databaseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [propName]: {
            [propType]: {
              options: mergedOptionsWithId,
            },
          },
        },
      }),
    });

    // Fallback: if Notion rejects update with option IDs, retry sending pure name objects
    if (!optPatchRes.ok) {
      console.warn(`[Notion Schema] Retrying options update for "${propName}" with names only:`, optPatchRes.data?.message);
      const mergedOptionsNameOnly = [
        ...currentOptions.map((o: any) => ({ name: o.name })),
        ...newNames.map((name) => ({ name })),
      ];
      optPatchRes = await notionFetch(`/databases/${databaseId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          properties: {
            [propName]: {
              [propType]: {
                options: mergedOptionsNameOnly,
              },
            },
          },
        }),
      });
    }

    if (optPatchRes.ok) {
      dbRes = optPatchRes;
      existingProps = dbRes.data?.properties || {};
      normalizedMap = getPropsMap(existingProps);
      console.log(`[Notion Schema] Successfully registered ${newNames.length} options in "${propName}":`, newNames);
    } else {
      console.error(`[Notion Schema] Failed to add options to "${propName}":`, optPatchRes.status, optPatchRes.data);
    }
  };

  await addOptionsToPropertyIfNeeded(findExistingPropName(CATEGORY_CANDIDATES), desiredCategoryNames);
  await addOptionsToPropertyIfNeeded(findExistingPropName(SUBCATEGORY_CANDIDATES), desiredSubcategoryNames);

  // Automatically attempt to create & align Gallery Views (tabs) for subcategories via Notion Views API
  const subPropActualName = findExistingPropName(SUBCATEGORY_CANDIDATES) || 'Sub categoría';
  await ensureDatabaseViews(databaseId, token, desiredSubcategoryNames, existingProps, subPropActualName);

  return dbRes;
}

async function notionViewsFetch(path: string, token: string, options: RequestInit = {}, retries = 3): Promise<{ ok: boolean; status: number; data: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${NOTION_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2026-03-11',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data: any = await res.json().catch(() => ({}));

    if ((res.status === 429 || res.status === 502 || res.status === 503) && attempt < retries) {
      const retryAfterSec = Number(res.headers.get('retry-after')) || 0;
      const delayMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 4000) : 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    return { ok: res.ok, status: res.status, data };
  }
  return { ok: false, status: 429, data: { message: 'Notion Views API rate limit exceeded' } };
}

function buildSubcategoryViewFilter(
  subPropName: string,
  subPropType: string,
  cleanSub: string
): Record<string, any> {
  if (subPropType === 'multi_select') {
    return {
      property: subPropName,
      type: 'multi_select',
      multi_select: { contains: cleanSub },
    };
  }
  if (subPropType === 'rich_text') {
    return {
      property: subPropName,
      type: 'rich_text',
      rich_text: { contains: cleanSub },
    };
  }
  return {
    property: subPropName,
    type: 'select',
    select: { equals: cleanSub },
  };
}

function sanitizeGalleryConfiguration(rawConfig: any): Record<string, any> | null {
  if (!rawConfig || typeof rawConfig !== 'object') return null;
  const cleaned: Record<string, any> = { type: 'gallery' };
  const allowedKeys = [
    'cover',
    'cover_size',
    'cover_aspect',
    'card_layout',
    'card_preview',
    'card_size',
    'fit_image',
    'properties',
    'wrap',
    'wrap_cells',
  ];
  for (const k of allowedKeys) {
    if (rawConfig[k] !== undefined && rawConfig[k] !== null) {
      cleaned[k] = rawConfig[k];
    }
  }
  return cleaned;
}

function buildFallbackGalleryConfiguration(dbProperties: Record<string, any>): Record<string, any> {
  const showCandidates = new Set([
    'pronunciacion',
    'fonetica',
    'ipa',
    'espanol',
    'traduccion',
    'significado',
    'ejemplo',
    'frase',
    'oracion',
    'example',
    'estado',
    'status',
  ]);
  const propsConfig: { property_id: string; visible: boolean }[] = [];
  for (const [propName, propDef] of Object.entries(dbProperties || {})) {
    const propId = propDef?.id;
    if (!propId) continue;
    const isTitle = propDef?.type === 'title';
    const visible = isTitle || showCandidates.has(normalizePropKey(propName));
    propsConfig.push({ property_id: propId, visible });
  }
  return {
    type: 'gallery',
    cover: { type: 'none' },
    ...(propsConfig.length > 0 ? { properties: propsConfig } : {}),
  };
}

/**
 * Automatically creates & synchronizes Notion Database Views (Tabs) for subcategories using Notion's Views API (v2026-03-11).
 * - Clones the EXACT card layout/configuration from the user's existing configured Gallery view (e.g. "The little Prince")
 *   so every subcategory tab looks identical (Title + Pronunciation + Spanish + Example + Status badge).
 * - Resolves full view details via GET /v1/views/{id}, deletes duplicate views, and updates existing subcategory views
 *   that were created with an unconfigured layout or missing filter.
 */
async function ensureDatabaseViews(
  databaseId: string,
  token: string,
  desiredSubcategoryNames: Set<string>,
  dbProperties: Record<string, any> = {},
  subPropName = 'Sub categoría'
) {
  if (desiredSubcategoryNames.size === 0) return;
  try {
    // 1. Fetch database container with Notion-Version: 2026-03-11 to obtain data_source_id
    const dbContainerRes = await notionViewsFetch(`/databases/${databaseId}`, token, { method: 'GET' });
    if (!dbContainerRes.ok) {
      console.warn('[Notion Views] Could not retrieve database with version 2026-03-11:', dbContainerRes.status);
      return;
    }

    const dataSourceId = dbContainerRes.data?.data_sources?.[0]?.id;
    if (!dataSourceId) {
      console.warn('[Notion Views] No data_sources array found in database response');
      return;
    }

    // 2. Fetch ALL existing view references for this database (with pagination)
    const rawViewRefs: any[] = [];
    let startCursor: string | undefined = undefined;
    let pagesFetched = 0;

    while (pagesFetched < 10) {
      const query = startCursor
        ? `/views?database_id=${databaseId}&start_cursor=${encodeURIComponent(startCursor)}`
        : `/views?database_id=${databaseId}`;
      const viewsRes = await notionViewsFetch(query, token, { method: 'GET' });

      if (!viewsRes.ok || !Array.isArray(viewsRes.data?.results)) {
        console.warn('[Notion Views] Could not list existing views; aborting view creation to avoid duplicates:', viewsRes.status);
        return;
      }

      rawViewRefs.push(...viewsRes.data.results);
      pagesFetched += 1;
      if (viewsRes.data?.has_more && viewsRes.data?.next_cursor) {
        startCursor = viewsRes.data.next_cursor;
      } else {
        break;
      }
    }

    // 3. Resolve FULL view objects via GET /v1/views/{id} so we have `name`, `type`, `configuration`, and `filter`
    type ResolvedView = {
      id: string;
      name: string;
      type: string;
      configuration: any;
      filter: any;
    };
    const viewsByNormName = new Map<string, ResolvedView[]>();
    const allResolvedViews: ResolvedView[] = [];

    for (const ref of rawViewRefs) {
      if (!ref?.id) continue;
      const detailRes = await notionViewsFetch(`/views/${ref.id}`, token, { method: 'GET' });
      if (!detailRes.ok) {
        console.warn('[Notion Views] Failed to fetch view details; aborting view sync to prevent duplicates:', ref.id, detailRes.status);
        return;
      }

      const viewData = detailRes.data || {};
      const viewName = String(viewData?.name || ref?.name || '').trim();
      const norm = normalizePropKey(viewName);
      if (!norm) continue;

      const resolved: ResolvedView = {
        id: ref.id,
        name: viewName,
        type: String(viewData?.type || ref?.type || ''),
        configuration: viewData?.configuration || null,
        filter: viewData?.filter || null,
      };
      allResolvedViews.push(resolved);
      const list = viewsByNormName.get(norm) || [];
      list.push(resolved);
      viewsByNormName.set(norm, list);
    }

    // 4. Find the user's configured Gallery view to use as the exact visual template for all subcategories
    const preferredTemplateNorms = ['the little prince', 'halloween', 'meses', 'dias de la semana'];
    const countVisibleProps = (v: ResolvedView): number => {
      const props = v.configuration?.properties;
      if (!Array.isArray(props)) return 0;
      return props.filter((p: any) => p?.visible).length;
    };

    const galleryViews = allResolvedViews.filter((v) => v.type === 'gallery');
    let templateView: ResolvedView | null = null;

    for (const pref of preferredTemplateNorms) {
      const match = galleryViews.find(
        (v) => normalizePropKey(v.name) === pref && countVisibleProps(v) >= 2
      );
      if (match) {
        templateView = match;
        break;
      }
    }
    if (!templateView && galleryViews.length > 0) {
      const sorted = [...galleryViews].sort((a, b) => countVisibleProps(b) - countVisibleProps(a));
      if (countVisibleProps(sorted[0]) > 0) {
        templateView = sorted[0];
      }
    }

    const templateGalleryConfig =
      (templateView ? sanitizeGalleryConfiguration(templateView.configuration) : null) ||
      buildFallbackGalleryConfiguration(dbProperties);
    const templateVisibleCount = Array.isArray(templateGalleryConfig.properties)
      ? templateGalleryConfig.properties.filter((p: any) => p?.visible).length
      : 0;

    // 5. Delete duplicate views sharing the exact same normalized name (keep the best configured one)
    for (const [norm, list] of viewsByNormName.entries()) {
      if (list.length <= 1) continue;
      list.sort((a, b) => {
        const scoreA = (a.type === 'gallery' ? 10 : 0) + countVisibleProps(a) * 2 + (a.filter ? 3 : 0);
        const scoreB = (b.type === 'gallery' ? 10 : 0) + countVisibleProps(b) * 2 + (b.filter ? 3 : 0);
        return scoreB - scoreA;
      });
      const keep = list[0];
      const duplicates = list.slice(1);
      viewsByNormName.set(norm, [keep]);

      for (const dup of duplicates) {
        const delRes = await notionViewsFetch(`/views/${dup.id}`, token, { method: 'DELETE' });
        if (delRes.ok) {
          console.log(`[Notion Views] Deleted duplicate view "${dup.name}" (${dup.id})`);
        } else {
          console.warn(`[Notion Views] Could not delete duplicate view "${dup.name}":`, delRes.status, delRes.data?.message);
        }
      }
    }

    const subPropType = dbProperties[subPropName]?.type || 'select';

    // 6. For each desired subcategory:
    //    - If the view does NOT exist, create it with the exact template gallery layout + subcategory filter.
    //    - If the view ALREADY exists but doesn't match the template gallery card layout or lacks a filter, PATCH it!
    for (const subName of desiredSubcategoryNames) {
      const cleanSub = String(subName || '').trim().replace(/\s+/g, ' ');
      const normSub = normalizePropKey(cleanSub);
      if (!normSub || normSub === 'general') continue;

      const subFilter = buildSubcategoryViewFilter(subPropName, subPropType, cleanSub);
      const existingList = viewsByNormName.get(normSub);

      if (existingList && existingList.length > 0) {
        const existingView = existingList[0];
        if (templateView && existingView.id === templateView.id) continue;

        const existingVisible = countVisibleProps(existingView);
        const needsLayoutSync =
          existingView.type === 'gallery' &&
          ((templateVisibleCount > 0 && existingVisible < templateVisibleCount) ||
            JSON.stringify(existingView.configuration?.cover || null) !==
              JSON.stringify(templateGalleryConfig.cover || null));
        const needsFilterSync = !existingView.filter;

        if (needsLayoutSync || needsFilterSync) {
          const patchBody: Record<string, any> = {};
          if (needsLayoutSync) patchBody.configuration = templateGalleryConfig;
          if (needsFilterSync) patchBody.filter = subFilter;

          let patchRes = await notionViewsFetch(`/views/${existingView.id}`, token, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });

          // Fallback: if Notion rejects full cloned config, try updating only configuration.properties + cover
          if (!patchRes.ok && patchRes.status === 400 && needsLayoutSync) {
            const minimalConfig: Record<string, any> = { type: 'gallery' };
            if (templateGalleryConfig.cover) minimalConfig.cover = templateGalleryConfig.cover;
            if (templateGalleryConfig.properties) minimalConfig.properties = templateGalleryConfig.properties;
            patchRes = await notionViewsFetch(`/views/${existingView.id}`, token, {
              method: 'PATCH',
              body: JSON.stringify({
                configuration: minimalConfig,
                ...(needsFilterSync ? { filter: subFilter } : {}),
              }),
            });
          }

          if (patchRes.ok) {
            console.log(`[Notion Views] Aligned gallery layout/filter for existing view "${cleanSub}"`);
          } else {
            console.warn(`[Notion Views] Could not align view "${cleanSub}":`, patchRes.status, patchRes.data?.message);
          }
        }
        continue;
      }

      const createViewRes = await notionViewsFetch('/views', token, {
        method: 'POST',
        body: JSON.stringify({
          database_id: databaseId,
          data_source_id: dataSourceId,
          name: cleanSub,
          type: 'gallery',
          configuration: templateGalleryConfig,
          filter: subFilter,
        }),
      });

      if (createViewRes.ok) {
        console.log(`[Notion Views] Successfully created gallery view tab for "${cleanSub}" matching template`);
        viewsByNormName.set(normSub, [
          {
            id: createViewRes.data?.id || '',
            name: cleanSub,
            type: 'gallery',
            configuration: templateGalleryConfig,
            filter: subFilter,
          },
        ]);
      } else {
        console.warn(`[Notion Views] Could not create templated view tab for "${cleanSub}":`, createViewRes.status, createViewRes.data?.message);
        if (createViewRes.status === 400) {
          // Fallback: try with minimal gallery config + filter
          const minimalConfig: Record<string, any> = { type: 'gallery' };
          if (templateGalleryConfig.cover) minimalConfig.cover = templateGalleryConfig.cover;
          if (templateGalleryConfig.properties) minimalConfig.properties = templateGalleryConfig.properties;

          let fallbackViewRes = await notionViewsFetch('/views', token, {
            method: 'POST',
            body: JSON.stringify({
              database_id: databaseId,
              data_source_id: dataSourceId,
              name: cleanSub,
              type: 'gallery',
              configuration: minimalConfig,
              filter: subFilter,
            }),
          });
          if (!fallbackViewRes.ok) {
            fallbackViewRes = await notionViewsFetch('/views', token, {
              method: 'POST',
              body: JSON.stringify({
                database_id: databaseId,
                data_source_id: dataSourceId,
                name: cleanSub,
                type: 'gallery',
              }),
            });
          }
          if (fallbackViewRes.ok) {
            viewsByNormName.set(normSub, [
              {
                id: fallbackViewRes.data?.id || '',
                name: cleanSub,
                type: 'gallery',
                configuration: minimalConfig,
                filter: subFilter,
              },
            ]);
            console.log(`[Notion Views] Fallback gallery view created for "${cleanSub}"`);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Notion Views] Exception while creating database views:', err?.message);
  }
}

function buildNotionPageProperties(
  dbProperties: Record<string, any>,
  word: NotionWordPayload
): { titlePropName: string; properties: Record<string, any> } {
  const props: Record<string, any> = {};
  let titlePropName = 'Name';

  // 1. Find title property
  for (const [propName, propDef] of Object.entries(dbProperties)) {
    if (propDef?.type === 'title') {
      titlePropName = propName;
      break;
    }
  }

  props[titlePropName] = {
    title: [
      {
        text: {
          content: (word.word || '').trim() || 'Sin título',
        },
      },
    ],
  };

  const findProp = (candidates: string[]): { name: string; type: string; def: any } | null => {
    const normalizedCandidates = candidates.map(normalizePropKey);
    for (const [propName, propDef] of Object.entries(dbProperties)) {
      const norm = normalizePropKey(propName);
      if (normalizedCandidates.includes(norm)) {
        return { name: propName, type: propDef?.type, def: propDef };
      }
    }
    return null;
  };

  const setPropValue = (
    propInfo: { name: string; type: string; def?: any } | null,
    rawValues: string | string[]
  ) => {
    if (!propInfo) return;
    const values = (Array.isArray(rawValues) ? rawValues : [rawValues])
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    if (values.length === 0) return;

    if (propInfo.type === 'rich_text') {
      props[propInfo.name] = {
        rich_text: [{ text: { content: values.join(', ').slice(0, 1990) } }],
      };
    } else if (propInfo.type === 'select') {
      props[propInfo.name] = {
        select: { name: values[0].replace(/,/g, ' ').slice(0, 95) },
      };
    } else if (propInfo.type === 'multi_select') {
      props[propInfo.name] = {
        multi_select: values.map((name) => ({ name: name.replace(/,/g, ' ').slice(0, 95) })),
      };
    } else if (propInfo.type === 'status') {
      props[propInfo.name] = {
        status: { name: values[0] },
      };
    }
  };

  // 2. Pronunciación (/ˈθristy/)
  const phoneticText = formatPhoneticSlash(word);
  setPropValue(findProp(['pronunciacion', 'fonetica', 'ipa']), phoneticText);

  // 3. Español (Sediento)
  setPropValue(
    findProp(['espanol', 'traduccion', 'significado']),
    word.translation || ''
  );

  // 4. Ejemplo: English sentence on line 1 + gray italic (Spanish translation) on line 2
  const ejemploProp = findProp(['ejemplo', 'frase', 'oracion', 'example']);
  const exampleRichText = buildExampleRichText(word);
  if (ejemploProp && exampleRichText.length > 0) {
    if (ejemploProp.type === 'rich_text') {
      props[ejemploProp.name] = {
        rich_text: exampleRichText,
      };
    } else {
      const fallbackText = [
        (word.exampleEn || '').trim(),
        word.exampleEs ? `(${word.exampleEs.trim()})` : '',
      ]
        .filter(Boolean)
        .join('\n');
      setPropValue(ejemploProp, fallbackText);
    }
  }

  // 5. Estado: Nuevo / Repasar / Aprendido (or Dominada / Repasando)
  const estadoProp = findProp(['estado', 'status']);
  if (estadoProp) {
    const existingOpts =
      estadoProp.def?.select?.options || estadoProp.def?.status?.options || [];
    const statusLabel = resolveStatusOptionName(word.status, existingOpts);
    if (estadoProp.type === 'select') {
      props[estadoProp.name] = { select: { name: statusLabel } };
    } else if (estadoProp.type === 'rich_text') {
      setPropValue(estadoProp, statusLabel);
    }
  }

  // 6. Categoría
  const cleanCategories = getCleanWordCategories(word);
  const catProp = findProp(CATEGORY_CANDIDATES) || { name: 'Categoría', type: 'select', def: {} };
  setPropValue(catProp, cleanCategories);

  // 7. Sub categoría (supports single select, multi_select, or rich_text)
  const cleanSubcategories = getCleanWordSubcategories(word);
  if (cleanSubcategories.length > 0) {
    const subProp = findProp(SUBCATEGORY_CANDIDATES) || {
      name: 'Sub categoría',
      type: 'select',
      def: {},
    };
    setPropValue(subProp, cleanSubcategories);
  }

  // 8. Nivel (A1, A2, B1, B2, C1, C2)
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const cleanLevel = (word.level || 'B1').trim().toUpperCase();
  const finalLevel = validLevels.includes(cleanLevel) ? cleanLevel : 'B1';
  setPropValue(findProp(['nivel', 'level', 'mcer', 'cefr']), finalLevel);

  return { titlePropName, properties: props };
}

/**
 * Builds page body blocks matching the Gallery Card layout in case the user's
 * Notion Gallery view has "Card preview: Page content" enabled:
 * - Line 1: /jɔːnd/   Bostezó
 * - Line 2: English example sentence + gray italic (Spanish translation)
 */
function buildNotionPageChildren(word: NotionWordPayload): any[] {
  const phoneticText = formatPhoneticSlash(word);
  const translationText = (word.translation || '').trim();
  const blocks: any[] = [];

  if (phoneticText || translationText) {
    const headerRichText: any[] = [];
    if (phoneticText) {
      headerRichText.push({
        type: 'text',
        text: { content: translationText ? `${phoneticText}   ` : phoneticText },
      });
    }
    if (translationText) {
      headerRichText.push({
        type: 'text',
        text: { content: translationText },
      });
    }
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: headerRichText,
      },
    });
  }

  const exampleRichText = buildExampleRichText(word);
  if (exampleRichText.length > 0) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: exampleRichText,
      },
    });
  }

  return blocks;
}

function readNotionPropertyValues(propVal: any): string[] {
  if (!propVal) return [];
  const t = propVal.type;
  if (t === 'title' && Array.isArray(propVal.title)) {
    const joined = propVal.title.map((x: any) => x?.plain_text || '').join('').trim();
    return joined ? [joined] : [];
  }
  if (t === 'rich_text' && Array.isArray(propVal.rich_text)) {
    const joined = propVal.rich_text.map((x: any) => x?.plain_text || '').join('').trim();
    return joined ? [joined] : [];
  }
  if (t === 'select' && propVal.select?.name) {
    return [String(propVal.select.name).trim()].filter(Boolean);
  }
  if (t === 'multi_select' && Array.isArray(propVal.multi_select)) {
    return propVal.multi_select.map((x: any) => String(x?.name || '').trim()).filter(Boolean);
  }
  if (t === 'status' && propVal.status?.name) {
    return [String(propVal.status.name).trim()].filter(Boolean);
  }
  return [];
}

function parseNotionPageToWord(page: any): (NotionWordPayload & { notionPageId: string }) | null {
  const pageProps: Record<string, any> = page?.properties || {};
  let wordTitle = '';

  for (const [, propDef] of Object.entries(pageProps)) {
    if (propDef?.type === 'title') {
      const vals = readNotionPropertyValues(propDef);
      wordTitle = vals[0] || '';
      break;
    }
  }

  if (!wordTitle) return null;

  const findValues = (candidates: string[]): string[] => {
    const normCandidates = candidates.map(normalizePropKey);
    for (const [propName, propDef] of Object.entries(pageProps)) {
      if (normCandidates.includes(normalizePropKey(propName))) {
        return readNotionPropertyValues(propDef);
      }
    }
    return [];
  };

  const ipaRaw = findValues(['pronunciacion', 'fonetica', 'ipa'])[0] || '';
  const translationRaw = findValues(['espanol', 'traduccion', 'significado'])[0] || '';
  const ejemploRaw = findValues(['ejemplo', 'frase', 'oracion', 'example'])[0] || '';
  const { exampleEn, exampleEs } = parseExampleFromNotionText(ejemploRaw);
  const estadoRaw = findValues(['estado', 'status'])[0] || '';
  const levelRaw = (findValues(['nivel', 'level', 'mcer', 'cefr'])[0] || 'B1').toUpperCase();
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const level = validLevels.includes(levelRaw) ? levelRaw : 'B1';

  const catVals = findValues(CATEGORY_CANDIDATES)
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryGroups = catVals.length > 0 ? catVals : ['General'];

  const subVals = findValues(SUBCATEGORY_CANDIDATES)
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && s.toLowerCase() !== 'general');

  return {
    notionPageId: page.id,
    word: wordTitle,
    translation: translationRaw || wordTitle,
    ipa: ipaRaw,
    phoneticGuide: ipaRaw ? ipaRaw.replace(/^\/+|\/+$/g, '') : '',
    exampleEn,
    exampleEs,
    level,
    status: mapNotionStatusToAppStatus(estadoRaw),
    categoryGroups,
    categoryGroup: categoryGroups.join(', '),
    categorySubs: subVals,
    categorySub: subVals.join(', '),
  };
}

async function fetchAllNotionPages(
  databaseId: string,
  token: string
): Promise<(NotionWordPayload & { notionPageId: string })[]> {
  const results: (NotionWordPayload & { notionPageId: string })[] = [];
  let startCursor: string | undefined = undefined;
  let pagesFetched = 0;

  while (pagesFetched < 20) {
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const queryRes = await notionFetch(`/databases/${databaseId}/query`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!queryRes.ok || !Array.isArray(queryRes.data?.results)) {
      throw new Error(
        `No se pudieron leer las páginas existentes de Notion (HTTP ${queryRes.status}): ${
          queryRes.data?.message || 'Error de consulta'
        }. Se abortó la escritura para evitar duplicados.`
      );
    }

    for (const page of queryRes.data.results) {
      if (page?.archived || page?.in_trash) continue;
      const parsed = parseNotionPageToWord(page);
      if (parsed) {
        results.push(parsed);
      }
    }

    pagesFetched += 1;
    if (queryRes.data?.has_more && queryRes.data?.next_cursor) {
      startCursor = queryRes.data.next_cursor;
    } else {
      break;
    }
  }

  return results;
}

/**
 * Archives duplicate pages in Notion for the same normalized word, keeping the richest/primary entry.
 */
async function cleanupDuplicateNotionPages(
  existingMap: Map<string, (NotionWordPayload & { notionPageId: string })[]>,
  token: string
): Promise<number> {
  let archivedCount = 0;
  for (const [key, list] of existingMap.entries()) {
    if (list.length <= 1) continue;

    // Sort so the page with subcategory + category + example stays first
    const score = (p: NotionWordPayload) => {
      let s = 0;
      if (getCleanWordSubcategories(p).length > 0) s += 4;
      if (getCleanWordCategories(p).some((c) => normalizePropKey(c) !== 'general')) s += 2;
      if (p.exampleEn) s += 1;
      if (p.ipa) s += 1;
      return s;
    };
    list.sort((a, b) => score(b) - score(a));

    const keep = list[0];
    const duplicates = list.slice(1);
    existingMap.set(key, [keep]);

    for (const dup of duplicates) {
      const archRes = await notionFetch(`/pages/${dup.notionPageId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true }),
      }).catch(() => ({ ok: false }));
      if (archRes.ok) {
        archivedCount += 1;
      }
    }
  }
  return archivedCount;
}

async function upsertWordInNotion(
  databaseId: string,
  token: string,
  dbProperties: Record<string, any>,
  word: NotionWordPayload,
  existingPagesByWordLower?: Map<string, (NotionWordPayload & { notionPageId: string })[]>
) {
  const wordKey = normalizePropKey(word.word || '');
  const matchingPages = existingPagesByWordLower?.get(wordKey) || [];
  const existingPage = matchingPages[0];

  // Merge subcategories & categories if the Notion page already had a subcategory that the local word lacked
  const localSubs = getCleanWordSubcategories(word);
  const existingNotionSubs = existingPage ? getCleanWordSubcategories(existingPage) : [];
  const subDedupMap = new Map<string, string>();
  [...localSubs, ...existingNotionSubs].forEach((s) => {
    const k = normalizePropKey(s);
    if (k && k !== 'general' && !subDedupMap.has(k)) subDedupMap.set(k, s.trim());
  });
  const mergedSubs = Array.from(subDedupMap.values());

  const localCats = getCleanWordCategories(word);
  const existingNotionCats = existingPage ? getCleanWordCategories(existingPage) : [];
  const catDedupMap = new Map<string, string>();
  const rawCats =
    localCats.length === 1 &&
    normalizePropKey(localCats[0]) === 'general' &&
    existingNotionCats.some((c) => normalizePropKey(c) !== 'general')
      ? existingNotionCats.filter((c) => normalizePropKey(c) !== 'general')
      : [...localCats, ...existingNotionCats.filter((c) => normalizePropKey(c) !== 'general')];
  rawCats.forEach((c) => {
    const k = normalizePropKey(c);
    if (k && !catDedupMap.has(k)) catDedupMap.set(k, c.trim());
  });
  const mergedCats = Array.from(catDedupMap.values());

  const enrichedWord: NotionWordPayload = {
    ...word,
    categoryGroups: mergedCats.length > 0 ? mergedCats : ['General'],
    categoryGroup: (mergedCats.length > 0 ? mergedCats : ['General']).join(', '),
    categorySubs: mergedSubs,
    categorySub: mergedSubs.join(', '),
  };

  const { titlePropName, properties } = buildNotionPageProperties(dbProperties, enrichedWord);

  if (matchingPages.length > 0) {
    // If the word, its category and its subcategory already exist in Notion, do nothing!
    if (existingPage) {
      const existingCats = getCleanWordCategories(existingPage);
      const existingSubs = getCleanWordSubcategories(existingPage);
      const targetCats = getCleanWordCategories(word);
      const targetSubs = getCleanWordSubcategories(word);

      const hasSameCategories =
        targetCats.length === 0 ||
        (targetCats.length === 1 && normalizePropKey(targetCats[0]) === 'general') ||
        targetCats.every((c) => existingCats.some((ec) => normalizePropKey(ec) === normalizePropKey(c)));

      const hasSameSubcategories =
        targetSubs.length === 0 ||
        targetSubs.every((s) => existingSubs.some((es) => normalizePropKey(es) === normalizePropKey(s)));

      if (hasSameCategories && hasSameSubcategories) {
        return {
          res: { ok: true, status: 200, data: { id: matchingPages[0].notionPageId } },
          mergedWord: existingPage,
          skipped: true,
        };
      }
    }

    // Only update if category or subcategory was missing in Notion
    const patchRes = await notionFetch(`/pages/${matchingPages[0].notionPageId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });

    try {
      const blocksRes = await notionFetch(`/blocks/${matchingPages[0].notionPageId}/children?page_size=2`, token, { method: 'GET' });
      if (blocksRes.ok && (!Array.isArray(blocksRes.data?.results) || blocksRes.data.results.length === 0)) {
        await notionFetch(`/blocks/${matchingPages[0].notionPageId}/children`, token, {
          method: 'PATCH',
          body: JSON.stringify({ children: buildNotionPageChildren(enrichedWord) }),
        });
      }
    } catch {}
    return { res: patchRes, mergedWord: enrichedWord };
  }

  // Fallback query if map wasn't preloaded (case & accent insensitive match to prevent duplicates)
  if (!existingPagesByWordLower) {
    const queryRes = await notionFetch(`/databases/${databaseId}/query`, token, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: titlePropName,
          title: {
            contains: (word.word || '').trim(),
          },
        },
        page_size: 20,
      }),
    });

    if (queryRes.ok && Array.isArray(queryRes.data?.results) && queryRes.data.results.length > 0) {
      const exactMatchRaw = queryRes.data.results.find((rawPage: any) => {
        if (rawPage?.archived || rawPage?.in_trash) return false;
        const parsed = parseNotionPageToWord(rawPage);
        return parsed && normalizePropKey(parsed.word) === wordKey;
      });

      if (exactMatchRaw) {
        const parsedExisting = parseNotionPageToWord(exactMatchRaw);
        if (parsedExisting) {
          const existingCats = getCleanWordCategories(parsedExisting);
          const existingSubs = getCleanWordSubcategories(parsedExisting);
          const targetCats = getCleanWordCategories(word);
          const targetSubs = getCleanWordSubcategories(word);

          const hasSameCategories =
            targetCats.length === 0 ||
            (targetCats.length === 1 && normalizePropKey(targetCats[0]) === 'general') ||
            targetCats.every((c) => existingCats.some((ec) => normalizePropKey(ec) === normalizePropKey(c)));

          const hasSameSubcategories =
            targetSubs.length === 0 ||
            targetSubs.every((s) => existingSubs.some((es) => normalizePropKey(es) === normalizePropKey(s)));

          if (hasSameCategories && hasSameSubcategories) {
            return {
              res: { ok: true, status: 200, data: { id: exactMatchRaw.id } },
              mergedWord: parsedExisting,
              skipped: true,
            };
          }
        }

        const patchRes = await notionFetch(`/pages/${exactMatchRaw.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ properties }),
        });
        return { res: patchRes, mergedWord: enrichedWord };
      }
    }
  }

  // Otherwise create a new page in the database
  const createRes = await notionFetch('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: buildNotionPageChildren(enrichedWord),
    }),
  });
  return { res: createRes, mergedWord: enrichedWord };
}

// POST /api/notion/verify — Verifies Database ID + Token, ensures schema & subcategories exist, and returns Notion words
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, categories, words } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId) {
      return res.status(400).json({
        success: false,
        message: 'El ID o enlace de la base de datos de Notion no es válido (debe contener 32 caracteres hexadecimales).',
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Por favor introduce tu Token de Integración de Notion (ntn_... o secret_...).',
      });
    }

    const dbRes = await ensureDatabaseSchema(databaseId, token, categories, words);
    if (!dbRes.ok) {
      const notionMsg = dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.';
      return res.status(dbRes.status || 400).json({
        success: false,
        message: `Error de Notion: ${notionMsg}. Asegúrate de haber conectado tu integración a la base de datos desde el menú ••• > Conexiones en Notion.`,
      });
    }

    const titleArr = dbRes.data?.title || [];
    const databaseTitle =
      Array.isArray(titleArr) && titleArr.length > 0
        ? titleArr.map((t: any) => t.plain_text || '').join('')
        : 'Base de Datos de Vocabulario';

    const notionWordsRaw = await fetchAllNotionPages(databaseId, token);
    const verifyMap = new Map<string, (NotionWordPayload & { notionPageId: string })[]>();
    for (const nw of notionWordsRaw) {
      const key = normalizePropKey(nw.word || '');
      if (!key) continue;
      const list = verifyMap.get(key) || [];
      list.push(nw);
      verifyMap.set(key, list);
    }
    await cleanupDuplicateNotionPages(verifyMap, token);
    const notionWords = Array.from(verifyMap.values()).map((list) => list[0]).filter(Boolean);

    return res.json({
      success: true,
      databaseId,
      databaseTitle,
      notionWords,
      message: `¡Conectado con éxito a "${databaseTitle}"! Columnas y subcategorías verificadas.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno verificando Notion.',
    });
  }
});

// POST /api/notion/sync-word — Creates or updates a single word (and its category/subcategory) in the user's Notion database
router.post('/sync-word', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, word, categories } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId || !token || !word || !word.word) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (databaseId, notionToken o word).',
      });
    }

    const dbRes = await ensureDatabaseSchema(databaseId, token, categories, [word]);
    if (!dbRes.ok) {
      return res.status(dbRes.status || 400).json({
        success: false,
        message: dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.',
      });
    }

    const dbProperties = dbRes.data?.properties || {};
    const { res: pageRes, mergedWord } = await upsertWordInNotion(databaseId, token, dbProperties, word);

    if (!pageRes.ok) {
      return res.status(pageRes.status || 400).json({
        success: false,
        message: pageRes.data?.message || 'Error al guardar la palabra en Notion.',
      });
    }

    return res.json({
      success: true,
      pageId: pageRes.data?.id,
      url: pageRes.data?.url,
      word: mergedWord,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno sincronizando palabra con Notion.',
    });
  }
});

// POST /api/notion/sync-bulk — Fast concurrent batch sync: ensures all categories/subcategories exist in Notion & PronounceIt with their corresponding words
router.post('/sync-bulk', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, words, categories, skipSchemaEnsure } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId || !token || !Array.isArray(words)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para la sincronización con Notion.',
      });
    }

    // 1. Fetch existing pages in Notion and ensure schema in parallel
    const [existingNotionWords, dbRes] = await Promise.all([
      fetchAllNotionPages(databaseId, token),
      skipSchemaEnsure
        ? notionFetch(`/databases/${databaseId}`, token, { method: 'GET' })
        : ensureDatabaseSchema(databaseId, token, categories, words),
    ]);

    if (!dbRes.ok) {
      return res.status(dbRes.status || 400).json({
        success: false,
        message: dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.',
      });
    }

    const existingMap = new Map<string, (NotionWordPayload & { notionPageId: string })[]>();
    for (const nw of existingNotionWords) {
      const key = normalizePropKey(nw.word || '');
      if (!key) continue;
      const list = existingMap.get(key) || [];
      list.push(nw);
      existingMap.set(key, list);
    }

    // Archive any existing duplicate pages in Notion before processing the batch
    await cleanupDuplicateNotionPages(existingMap, token);

    const dbProperties = dbRes.data?.properties || {};
    let syncedCount = 0;
    let failedCount = 0;
    const syncedWordsMap = new Map<string, NotionWordPayload>();

    for (const [key, nwList] of existingMap.entries()) {
      if (nwList[0]) syncedWordsMap.set(key, nwList[0]);
    }

    // 2. Deduplicate incoming words BEFORE parallel chunking so duplicates can never be created concurrently
    const uniqueWordsMap = new Map<string, NotionWordPayload>();
    for (const w of words) {
      if (!w || !w.word) continue;
      const key = normalizePropKey(w.word);
      if (key && !uniqueWordsMap.has(key)) {
        uniqueWordsMap.set(key, w);
      }
    }
    const validWords = Array.from(uniqueWordsMap.values());
    const CHUNK_SIZE = 2;

    for (let i = 0; i < validWords.length; i += CHUNK_SIZE) {
      const chunk = validWords.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((w) =>
          upsertWordInNotion(databaseId, token, dbProperties, w, existingMap).catch(() => ({
            res: { ok: false, status: 500, data: {} },
            mergedWord: w,
          }))
        )
      );

      for (const { res: pageRes, mergedWord } of chunkResults) {
        if (pageRes.ok) {
          syncedCount += 1;
          const normKey = normalizePropKey(mergedWord.word || '');
          syncedWordsMap.set(normKey, mergedWord);
          if (normKey && !existingMap.has(normKey) && pageRes.data?.id) {
            existingMap.set(normKey, [{ ...mergedWord, notionPageId: pageRes.data.id }]);
          }
        } else {
          failedCount += 1;
        }
      }
    }

    const allMergedNotionWords = Array.from(syncedWordsMap.values());

    return res.json({
      success: true,
      syncedCount,
      failedCount,
      notionWords: allMergedNotionWords,
      message: `Se han sincronizado ${syncedCount} palabra(s) y sus subcategorías con tu base de datos de Notion.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno en sincronización masiva con Notion.',
    });
  }
});

export default router;
