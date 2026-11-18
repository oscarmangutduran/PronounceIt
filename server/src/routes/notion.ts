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

export function getCleanWordCategories(word: Partial<NotionWordPayload>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categoryGroups) && word.categoryGroups.length > 0) {
    raw.push(...word.categoryGroups);
  }
  if (word.categoryGroup) {
    raw.push(...word.categoryGroup.split(','));
  }
  const cleaned = Array.from(
    new Set(
      raw
        .map((c) => String(c || '').trim())
        .filter(Boolean)
    )
  );
  return cleaned.length > 0 ? cleaned : ['General'];
}

export function getCleanWordSubcategories(word: Partial<NotionWordPayload>): string[] {
  const raw: string[] = [];
  if (Array.isArray(word.categorySubs) && word.categorySubs.length > 0) {
    raw.push(...word.categorySubs);
  }
  if (word.categorySub) {
    raw.push(...word.categorySub.split(','));
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

  // Pattern 1: "English sentence\n(Spanish sentence)" or "English sentence (Spanish sentence)"
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

/**
 * Ensures the target Notion database has the exact properties matching the user's Notion Gallery & Page view
 * AND creates any missing Categoría / Sub categoría options in the Notion database schema so all
 * categories and subcategories exist in Notion.
 */
async function ensureDatabaseSchema(
  databaseId: string,
  token: string,
  categoriesPayload?: NotionCategoryPayload[],
  wordsPayload?: NotionWordPayload[]
) {
  const dbRes = await notionFetch(`/databases/${databaseId}`, token, { method: 'GET' });
  if (!dbRes.ok) {
    return dbRes;
  }

  const existingProps: Record<string, any> = dbRes.data?.properties || {};
  const existingKeysLower = new Map<string, string>();
  Object.keys(existingProps).forEach((k) => {
    existingKeysLower.set(k.trim().toLowerCase(), k);
  });

  const findExistingPropName = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const found = existingKeysLower.get(c.toLowerCase());
      if (found) return found;
    }
    return null;
  };

  // Collect all unique categories and subcategories from payload
  const desiredCategoryNames = new Set<string>();
  const desiredSubcategoryNames = new Set<string>();

  if (Array.isArray(categoriesPayload)) {
    for (const cat of categoriesPayload) {
      const cName = String(cat?.name || '').trim();
      if (cName) desiredCategoryNames.add(cName.replace(/,/g, ' ').slice(0, 95));
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
        if (cName) desiredCategoryNames.add(cName.replace(/,/g, ' ').slice(0, 95));
      }
      for (const sName of getCleanWordSubcategories(w)) {
        if (sName) desiredSubcategoryNames.add(sName.replace(/,/g, ' ').slice(0, 95));
      }
    }
  }

  const patchProperties: Record<string, any> = {};

  if (!findExistingPropName(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa'])) {
    patchProperties['Pronunciación'] = { rich_text: {} };
  }
  if (!findExistingPropName(['español', 'espanol', 'traducción', 'traduccion', 'significado'])) {
    patchProperties['Español'] = { rich_text: {} };
  }
  if (!findExistingPropName(['ejemplo', 'frase', 'oración', 'oracion', 'example'])) {
    patchProperties['Ejemplo'] = { rich_text: {} };
  }
  if (!findExistingPropName(['estado', 'status'])) {
    patchProperties['Estado'] = {
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

  // Categoría property + options
  const catPropName = findExistingPropName(['categoría', 'categoria', 'category']);
  if (!catPropName) {
    patchProperties['Categoría'] = {
      select: {
        options: Array.from(desiredCategoryNames).map((name) => ({ name })),
      },
    };
  } else {
    const catPropDef = existingProps[catPropName];
    if (catPropDef?.type === 'select' || catPropDef?.type === 'multi_select') {
      const propType = catPropDef.type;
      const currentOptions: any[] = catPropDef[propType]?.options || [];
      const existingOptionNamesLower = new Set(
        currentOptions.map((o: any) => String(o?.name || '').trim().toLowerCase())
      );
      const newOptionsToAdd = Array.from(desiredCategoryNames).filter(
        (name) => !existingOptionNamesLower.has(name.toLowerCase())
      );
      if (newOptionsToAdd.length > 0) {
        patchProperties[catPropName] = {
          [propType]: {
            options: [
              ...currentOptions.map((o: any) => ({ name: o.name, color: o.color })),
              ...newOptionsToAdd.map((name) => ({ name })),
            ],
          },
        };
      }
    }
  }

  // Sub categoría property + options
  const subPropName = findExistingPropName([
    'sub categoría',
    'sub categoria',
    'subcategoría',
    'subcategoria',
    'sub-categoría',
    'sub-categoria',
    'subcategory',
  ]);
  if (!subPropName) {
    patchProperties['Sub categoría'] = {
      select: {
        options: Array.from(desiredSubcategoryNames).map((name) => ({ name })),
      },
    };
  } else {
    const subPropDef = existingProps[subPropName];
    if (subPropDef?.type === 'select' || subPropDef?.type === 'multi_select') {
      const propType = subPropDef.type;
      const currentOptions: any[] = subPropDef[propType]?.options || [];
      const existingOptionNamesLower = new Set(
        currentOptions.map((o: any) => String(o?.name || '').trim().toLowerCase())
      );
      const newOptionsToAdd = Array.from(desiredSubcategoryNames).filter(
        (name) => !existingOptionNamesLower.has(name.toLowerCase())
      );
      if (newOptionsToAdd.length > 0) {
        patchProperties[subPropName] = {
          [propType]: {
            options: [
              ...currentOptions.map((o: any) => ({ name: o.name, color: o.color })),
              ...newOptionsToAdd.map((name) => ({ name })),
            ],
          },
        };
      }
    }
  }

  if (!findExistingPropName(['nivel', 'level', 'mcer', 'cefr'])) {
    patchProperties['Nivel'] = {
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

  if (Object.keys(patchProperties).length > 0) {
    const patchRes = await notionFetch(`/databases/${databaseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties: patchProperties }),
    });
    if (patchRes.ok) {
      return patchRes;
    }
  }

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
    for (const [propName, propDef] of Object.entries(dbProperties)) {
      const lower = propName.trim().toLowerCase();
      if (candidates.some((c) => c.toLowerCase() === lower)) {
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
  setPropValue(
    findProp(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa']),
    phoneticText
  );

  // 3. Español (Sediento)
  setPropValue(
    findProp(['español', 'espanol', 'traducción', 'traduccion', 'significado']),
    word.translation || ''
  );

  // 4. Ejemplo: English sentence on line 1 + gray italic (Spanish translation) on line 2
  const ejemploProp = findProp(['ejemplo', 'frase', 'oración', 'oracion', 'example']);
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
  setPropValue(findProp(['categoría', 'categoria', 'category']), cleanCategories);

  // 7. Sub categoría (supports single select, multi_select, or rich_text)
  const cleanSubcategories = getCleanWordSubcategories(word);
  if (cleanSubcategories.length > 0) {
    setPropValue(
      findProp([
        'sub categoría',
        'sub categoria',
        'subcategoría',
        'subcategoria',
        'sub-categoría',
        'sub-categoria',
        'subcategory',
      ]),
      cleanSubcategories
    );
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
    for (const [propName, propDef] of Object.entries(pageProps)) {
      const lower = propName.trim().toLowerCase();
      if (candidates.some((c) => c.toLowerCase() === lower)) {
        return readNotionPropertyValues(propDef);
      }
    }
    return [];
  };

  const ipaRaw = findValues(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa'])[0] || '';
  const translationRaw = findValues(['español', 'espanol', 'traducción', 'traduccion', 'significado'])[0] || '';
  const ejemploRaw = findValues(['ejemplo', 'frase', 'oración', 'oracion', 'example'])[0] || '';
  const { exampleEn, exampleEs } = parseExampleFromNotionText(ejemploRaw);
  const estadoRaw = findValues(['estado', 'status'])[0] || '';
  const levelRaw = (findValues(['nivel', 'level', 'mcer', 'cefr'])[0] || 'B1').toUpperCase();
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const level = validLevels.includes(levelRaw) ? levelRaw : 'B1';

  const catVals = findValues(['categoría', 'categoria', 'category'])
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryGroups = catVals.length > 0 ? catVals : ['General'];

  const subVals = findValues([
    'sub categoría',
    'sub categoria',
    'subcategoría',
    'subcategoria',
    'sub-categoría',
    'sub-categoria',
    'subcategory',
  ])
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
  existingPagesByWordLower?: Map<string, NotionWordPayload & { notionPageId: string }>
) {
  const wordKey = (word.word || '').trim().toLowerCase();
  const existingPage = existingPagesByWordLower?.get(wordKey);

  // Merge subcategories & categories if the Notion page already had a subcategory that the local word lacked
  const localSubs = getCleanWordSubcategories(word);
  const existingNotionSubs = existingPage ? getCleanWordSubcategories(existingPage) : [];
  const mergedSubs = Array.from(new Set([...localSubs, ...existingNotionSubs]));

  const localCats = getCleanWordCategories(word);
  const existingNotionCats = existingPage ? getCleanWordCategories(existingPage) : [];
  const mergedCats =
    localCats.length === 1 && localCats[0].toLowerCase() === 'general' && existingNotionCats.some((c) => c.toLowerCase() !== 'general')
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

  if (existingPage?.notionPageId) {
    const patchRes = await notionFetch(`/pages/${existingPage.notionPageId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
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
        page_size: 1,
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

// POST /api/notion/sync-bulk — Bidirectional sync: ensures all categories/subcategories exist in Notion & PronounceIt with their corresponding words
router.post('/sync-bulk', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, words, categories } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId || !token || !Array.isArray(words)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para la sincronización con Notion.',
      });
    }

    // 1. Fetch existing pages in Notion first so we know all categories, subcategories, and words already in Notion
    const existingNotionWords = await fetchAllNotionPages(databaseId, token);
    const existingMap = new Map<string, NotionWordPayload & { notionPageId: string }>();
    for (const nw of existingNotionWords) {
      const key = (nw.word || '').trim().toLowerCase();
      if (key && !existingMap.has(key)) {
        existingMap.set(key, nw);
      }
    }

    // 2. Ensure Notion database schema has all Categories & Subcategories from both PronounceIt and Notion
    const combinedWordsForSchema = [...words, ...existingNotionWords];
    const dbRes = await ensureDatabaseSchema(databaseId, token, categories, combinedWordsForSchema);
    if (!dbRes.ok) {
      return res.status(dbRes.status || 400).json({
        success: false,
        message: dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.',
      });
    }

    const dbProperties = dbRes.data?.properties || {};
    let syncedCount = 0;
    let failedCount = 0;
    const syncedWordsMap = new Map<string, NotionWordPayload>();

    // Seed with existing Notion words so any word that only exists in Notion is also returned to the client
    for (const [key, nw] of existingMap.entries()) {
      syncedWordsMap.set(key, nw);
    }

    // 3. Upsert every PronounceIt word into Notion with its Categoría and Sub categoría
    for (const w of words) {
      if (!w || !w.word) continue;
      const { res: pageRes, mergedWord } = await upsertWordInNotion(
        databaseId,
        token,
        dbProperties,
        w,
        existingMap
      );
      if (pageRes.ok) {
        syncedCount += 1;
        syncedWordsMap.set((mergedWord.word || '').trim().toLowerCase(), mergedWord);
      } else {
        failedCount += 1;
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
