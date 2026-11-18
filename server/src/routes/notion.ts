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

async function notionFetch(path: string, token: string, options: RequestInit = {}) {
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
  return { ok: res.ok, status: res.status, data };
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

  // STEP 2: Collect all unique categories and subcategories from payload and register options
  const desiredCategoryNames = new Set<string>();
  const desiredSubcategoryNames = new Set<string>();

  if (Array.isArray(categoriesPayload)) {
    for (const cat of categoriesPayload) {
      const cName = String(cat?.name || '').trim();
      if (cName && cName.toLowerCase() !== 'general') {
        desiredCategoryNames.add(cName.replace(/,/g, ' ').slice(0, 95));
      }
      if (Array.isArray(cat?.subcategories)) {
        for (const sub of cat.subcategories) {
          const sName = String(sub?.name || '').trim();
          if (sName && sName.toLowerCase() !== 'general') {
            desiredSubcategoryNames.add(sName.replace(/,/g, ' ').slice(0, 95));
          }
        }
      }
    }
  }

  if (Array.isArray(wordsPayload)) {
    for (const w of wordsPayload) {
      if (!w) continue;
      for (const cName of getCleanWordCategories(w)) {
        if (cName && cName.toLowerCase() !== 'general') {
          desiredCategoryNames.add(cName.replace(/,/g, ' ').slice(0, 95));
        }
      }
      for (const sName of getCleanWordSubcategories(w)) {
        if (sName && sName.toLowerCase() !== 'general') {
          desiredSubcategoryNames.add(sName.replace(/,/g, ' ').slice(0, 95));
        }
      }
    }
  }

  const addOptionsToPropertyIfNeeded = async (propName: string | null, desiredNames: Set<string>) => {
    if (!propName || desiredNames.size === 0) return;
    const propDef = existingProps[propName];
    if (!propDef || (propDef.type !== 'select' && propDef.type !== 'multi_select')) return;

    const propType = propDef.type;
    const currentOptions: any[] = propDef[propType]?.options || [];
    const existingNamesLower = new Set(
      currentOptions.map((o: any) => String(o?.name || '').trim().toLowerCase())
    );
    const newNames = Array.from(desiredNames).filter(
      (n) => !existingNamesLower.has(n.toLowerCase())
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

  return dbRes;
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

  // Also include Category and Subcategory tags in the page content for Notion Gallery views using "Card preview: Page content"
  const cats = getCleanWordCategories(word).filter((c) => c.toLowerCase() !== 'general');
  const subs = getCleanWordSubcategories(word);
  if (cats.length > 0 || subs.length > 0) {
    const metaText = [
      cats.length > 0 ? `📁 ${cats.join(', ')}` : '',
      subs.length > 0 ? `🏷️ ${subs.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('   •   ');

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: metaText },
            annotations: {
              italic: true,
              color: 'gray',
            },
          },
        ],
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

  while (pagesFetched < 10) {
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const queryRes = await notionFetch(`/databases/${databaseId}/query`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!queryRes.ok || !Array.isArray(queryRes.data?.results)) {
      break;
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

async function upsertWordInNotion(
  databaseId: string,
  token: string,
  dbProperties: Record<string, any>,
  word: NotionWordPayload,
  existingPagesByWordLower?: Map<string, (NotionWordPayload & { notionPageId: string })[]>
) {
  const wordKey = (word.word || '').trim().toLowerCase();
  const matchingPages = existingPagesByWordLower?.get(wordKey) || [];
  const existingPage = matchingPages[0];

  // Merge subcategories & categories if the Notion page already had a subcategory that the local word lacked
  const localSubs = getCleanWordSubcategories(word);
  const existingNotionSubs = existingPage ? getCleanWordSubcategories(existingPage) : [];
  const mergedSubs = Array.from(new Set([...localSubs, ...existingNotionSubs]));

  const localCats = getCleanWordCategories(word);
  const existingNotionCats = existingPage ? getCleanWordCategories(existingPage) : [];
  const mergedCats =
    localCats.length === 1 &&
    localCats[0].toLowerCase() === 'general' &&
    existingNotionCats.some((c) => c.toLowerCase() !== 'general')
      ? existingNotionCats.filter((c) => c.toLowerCase() !== 'general')
      : Array.from(new Set([...localCats, ...existingNotionCats.filter((c) => c.toLowerCase() !== 'general')]));

  const enrichedWord: NotionWordPayload = {
    ...word,
    categoryGroups: mergedCats.length > 0 ? mergedCats : ['General'],
    categoryGroup: (mergedCats.length > 0 ? mergedCats : ['General']).join(', '),
    categorySubs: mergedSubs,
    categorySub: mergedSubs.join(', '),
  };

  const { titlePropName, properties } = buildNotionPageProperties(dbProperties, enrichedWord);

  if (matchingPages.length > 0) {
    // Update primary page and any duplicate pages for the same word
    const patchRes = await notionFetch(`/pages/${matchingPages[0].notionPageId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
    if (matchingPages.length > 1) {
      for (let i = 1; i < matchingPages.length; i++) {
        await notionFetch(`/pages/${matchingPages[i].notionPageId}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ properties }),
        }).catch(() => {});
      }
    }
    return { res: patchRes, mergedWord: enrichedWord };
  }

  // Fallback query if map wasn't preloaded
  if (!existingPagesByWordLower) {
    const queryRes = await notionFetch(`/databases/${databaseId}/query`, token, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: titlePropName,
          title: {
            equals: (word.word || '').trim(),
          },
        },
        page_size: 5,
      }),
    });

    if (queryRes.ok && Array.isArray(queryRes.data?.results) && queryRes.data.results.length > 0) {
      const existingPageId = queryRes.data.results[0].id;
      const patchRes = await notionFetch(`/pages/${existingPageId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      return { res: patchRes, mergedWord: enrichedWord };
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

    const notionWords = await fetchAllNotionPages(databaseId, token);

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
      const key = (nw.word || '').trim().toLowerCase();
      if (!key) continue;
      const list = existingMap.get(key) || [];
      list.push(nw);
      existingMap.set(key, list);
    }

    const dbProperties = dbRes.data?.properties || {};
    let syncedCount = 0;
    let failedCount = 0;
    const syncedWordsMap = new Map<string, NotionWordPayload>();

    for (const [key, nwList] of existingMap.entries()) {
      if (nwList[0]) syncedWordsMap.set(key, nwList[0]);
    }

    // 2. Process words in parallel chunks of 4 to stay well within Vercel's serverless timeout
    const validWords = words.filter((w) => w && w.word);
    const CHUNK_SIZE = 4;

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
          syncedWordsMap.set((mergedWord.word || '').trim().toLowerCase(), mergedWord);
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
