import { Router, Request, Response } from 'express';

const router = Router();
const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

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

function formatPhoneticSlash(word: NotionWordPayload): string {
  const raw = (word.ipa || word.phoneticGuide || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') && raw.endsWith('/')) return raw;
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
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
 * Ensures the target Notion database has the exact properties matching the user's Notion Gallery & Page view:
 * - Pronunciación (rich_text) -> /ˈθristy/
 * - Español (rich_text) -> Sediento
 * - Ejemplo (rich_text) -> English sentence + newline + gray italic (Spanish sentence)
 * - Estado (select) -> Nuevo (brown), Repasar (blue), Aprendido (purple), Dominada (default), Repasando (default)
 * - Categoría (select) -> Rutinas
 * - Sub categoría (select) -> Meses
 * - Nivel (select) -> A1, A2, B1, B2, C1, C2
 */
async function ensureDatabaseSchema(databaseId: string, token: string) {
  const dbRes = await notionFetch(`/databases/${databaseId}`, token, { method: 'GET' });
  if (!dbRes.ok) {
    return dbRes;
  }

  const existingProps: Record<string, any> = dbRes.data?.properties || {};
  const existingKeysLower = new Map<string, string>();
  Object.keys(existingProps).forEach((k) => {
    existingKeysLower.set(k.trim().toLowerCase(), k);
  });

  const hasAny = (candidates: string[]) =>
    candidates.some((c) => existingKeysLower.has(c.toLowerCase()));

  const missingProperties: Record<string, any> = {};

  if (!hasAny(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa'])) {
    missingProperties['Pronunciación'] = { rich_text: {} };
  }
  if (!hasAny(['español', 'espanol', 'traducción', 'traduccion', 'significado'])) {
    missingProperties['Español'] = { rich_text: {} };
  }
  if (!hasAny(['ejemplo', 'frase', 'oración', 'oracion', 'example'])) {
    missingProperties['Ejemplo'] = { rich_text: {} };
  }
  if (!hasAny(['estado', 'status'])) {
    missingProperties['Estado'] = {
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
  if (!hasAny(['categoría', 'categoria', 'category'])) {
    missingProperties['Categoría'] = { select: {} };
  }
  if (!hasAny(['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria'])) {
    missingProperties['Sub categoría'] = { select: {} };
  }
  if (!hasAny(['nivel', 'level', 'mcer', 'cefr'])) {
    missingProperties['Nivel'] = {
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

  if (Object.keys(missingProperties).length > 0) {
    const patchRes = await notionFetch(`/databases/${databaseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties: missingProperties }),
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

  const setPropValue = (propInfo: { name: string; type: string; def?: any } | null, rawValue: string) => {
    if (!propInfo || !rawValue) return;
    const cleanVal = rawValue.trim();
    if (!cleanVal) return;

    if (propInfo.type === 'rich_text') {
      props[propInfo.name] = {
        rich_text: [{ text: { content: cleanVal.slice(0, 1990) } }],
      };
    } else if (propInfo.type === 'select') {
      props[propInfo.name] = {
        select: { name: cleanVal.replace(/,/g, ' ').slice(0, 95) },
      };
    } else if (propInfo.type === 'multi_select') {
      const items = cleanVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name: name.slice(0, 95) }));
      if (items.length > 0) {
        props[propInfo.name] = { multi_select: items };
      }
    } else if (propInfo.type === 'status') {
      props[propInfo.name] = {
        status: { name: cleanVal },
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
  const primaryCategory =
    (Array.isArray(word.categoryGroups) && word.categoryGroups.length > 0
      ? word.categoryGroups[0]
      : word.categoryGroup?.split(',')[0]) || 'General';
  setPropValue(findProp(['categoría', 'categoria', 'category']), primaryCategory.trim());

  // 7. Sub categoría
  const primarySub =
    (Array.isArray(word.categorySubs) && word.categorySubs.length > 0
      ? word.categorySubs[0]
      : word.categorySub?.split(',')[0]) || '';
  if (primarySub.trim()) {
    setPropValue(
      findProp(['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria']),
      primarySub.trim()
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

async function upsertWordInNotion(
  databaseId: string,
  token: string,
  dbProperties: Record<string, any>,
  word: NotionWordPayload
) {
  const { titlePropName, properties } = buildNotionPageProperties(dbProperties, word);

  // Check if page for this word already exists in the database
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
    return notionFetch(`/pages/${existingPageId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  // Otherwise create a new page in the database
  return notionFetch('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: buildNotionPageChildren(word),
    }),
  });
}

// POST /api/notion/verify — Verifies Database ID + Token and ensures schema columns exist
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken } = req.body || {};
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

    const dbRes = await ensureDatabaseSchema(databaseId, token);
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

    return res.json({
      success: true,
      databaseId,
      databaseTitle,
      message: `¡Conectado con éxito a "${databaseTitle}"! Columnas verificadas.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno verificando Notion.',
    });
  }
});

// POST /api/notion/sync-word — Creates or updates a single word in the user's Notion database
router.post('/sync-word', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, word } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId || !token || !word || !word.word) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (databaseId, notionToken o word).',
      });
    }

    const dbRes = await ensureDatabaseSchema(databaseId, token);
    if (!dbRes.ok) {
      return res.status(dbRes.status || 400).json({
        success: false,
        message: dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.',
      });
    }

    const dbProperties = dbRes.data?.properties || {};
    const pageRes = await upsertWordInNotion(databaseId, token, dbProperties, word);

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
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno sincronizando palabra con Notion.',
    });
  }
});

// POST /api/notion/sync-bulk — Syncs multiple words to the user's Notion database
router.post('/sync-bulk', async (req: Request, res: Response) => {
  try {
    const { databaseId: rawDbId, notionToken, words } = req.body || {};
    const databaseId = extractNotionDatabaseId(rawDbId);
    const token = resolveNotionToken(notionToken);

    if (!databaseId || !token || !Array.isArray(words)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para la sincronización masiva con Notion.',
      });
    }

    const dbRes = await ensureDatabaseSchema(databaseId, token);
    if (!dbRes.ok) {
      return res.status(dbRes.status || 400).json({
        success: false,
        message: dbRes.data?.message || 'No se pudo acceder a la base de datos de Notion.',
      });
    }

    const dbProperties = dbRes.data?.properties || {};
    let syncedCount = 0;
    let failedCount = 0;

    for (const w of words) {
      if (!w || !w.word) continue;
      const pageRes = await upsertWordInNotion(databaseId, token, dbProperties, w);
      if (pageRes.ok) {
        syncedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return res.json({
      success: true,
      syncedCount,
      failedCount,
      message: `Se han sincronizado ${syncedCount} palabra(s) en tu base de datos de Notion.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error interno en sincronización masiva con Notion.',
    });
  }
});

export default router;
