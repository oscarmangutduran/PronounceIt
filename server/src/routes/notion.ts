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

  // If it's a URL, look for the 32-hex-char ID in the path (before ?v=...)
  const withoutQuery = trimmed.split('?')[0];
  const hexMatches = withoutQuery.replace(/-/g, '').match(/[0-9a-fA-F]{32}/g);
  if (hexMatches && hexMatches.length > 0) {
    // Return the last 32-char match in the path (which is the database ID in Notion URLs)
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

function mapStatusToNotionLabel(status?: string): string {
  if (status === 'dominada' || status === 'mastered') return 'Dominada';
  if (status === 'en_repaso' || status === 'reviewing' || status === 'learning') return 'Repasando';
  return 'Repasando';
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
 * Ensures the target Notion database has the properties shown in the PronounceIt Notion template:
 * - Pronunciación (rich_text)
 * - Español (rich_text)
 * - Ejemplo (rich_text)
 * - Frase Español (rich_text)
 * - Estado (select)
 * - Categoría (select)
 * - Sub categoría (select)
 * - Nivel (select: A1..C2)
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
  if (!hasAny(['frase español', 'frase espanol', 'traducción ejemplo', 'traduccion ejemplo'])) {
    missingProperties['Frase Español'] = { rich_text: {} };
  }
  if (!hasAny(['estado', 'status'])) {
    missingProperties['Estado'] = {
      select: {
        options: [
          { name: 'Repasando', color: 'default' },
          { name: 'Nueva', color: 'blue' },
          { name: 'Dominada', color: 'green' },
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

  // Helper to find matching property name in database
  const findProp = (candidates: string[]): { name: string; type: string } | null => {
    for (const [propName, propDef] of Object.entries(dbProperties)) {
      const lower = propName.trim().toLowerCase();
      if (candidates.some((c) => c.toLowerCase() === lower)) {
        return { name: propName, type: propDef?.type };
      }
    }
    return null;
  };

  // Helper to assign value based on actual Notion column type
  const setPropValue = (propInfo: { name: string; type: string } | null, rawValue: string) => {
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

  // 2. Pronunciación (IPA / phonetic transcription)
  const phoneticText = word.ipa?.trim() || (word.phoneticGuide ? `/${word.phoneticGuide.trim()}/` : '');
  setPropValue(
    findProp(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa']),
    phoneticText
  );

  // 3. Español (Translation)
  setPropValue(
    findProp(['español', 'espanol', 'traducción', 'traduccion', 'significado']),
    word.translation || ''
  );

  // 4. Ejemplo (English sentence, or combined if no separate Spanish sentence column exists)
  const fraseEsProp = findProp(['frase español', 'frase espanol', 'traducción ejemplo', 'traduccion ejemplo']);
  const exampleEn = (word.exampleEn || '').trim();
  const exampleEs = (word.exampleEs || '').trim();

  if (fraseEsProp) {
    setPropValue(findProp(['ejemplo', 'frase', 'oración', 'oracion', 'example']), exampleEn);
    setPropValue(fraseEsProp, exampleEs);
  } else {
    const combinedExample =
      exampleEn && exampleEs
        ? `${exampleEn} (${exampleEs})`
        : exampleEn || exampleEs;
    setPropValue(findProp(['ejemplo', 'frase', 'oración', 'oracion', 'example']), combinedExample);
  }

  // 5. Estado (Repasando / Nueva / Dominada)
  const estadoProp = findProp(['estado', 'status']);
  if (estadoProp && estadoProp.type !== 'status') {
    setPropValue(estadoProp, mapStatusToNotionLabel(word.status));
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

function buildNotionPageChildren(word: NotionWordPayload): any[] {
  const phoneticText = word.ipa?.trim() || (word.phoneticGuide ? `/${word.phoneticGuide.trim()}/` : '');
  const guideText = word.phoneticGuide?.trim() ? ` (Guía: "${word.phoneticGuide.trim()}")` : '';
  const blocks: any[] = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🔊' },
        color: 'purple_background',
        rich_text: [
          {
            type: 'text',
            annotations: { bold: true },
            text: { content: 'Pronunciación y Traducción: ' },
          },
          {
            type: 'text',
            text: {
              content: `${phoneticText}${guideText}  •  🇪🇸 ${word.translation || ''}`,
            },
          },
        ],
      },
    },
  ];

  if (word.exampleEn || word.exampleEs) {
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '💬' },
        color: 'gray_background',
        rich_text: [
          {
            type: 'text',
            annotations: { bold: true },
            text: { content: 'Ejemplo en Inglés:\n' },
          },
          {
            type: 'text',
            annotations: { italic: true },
            text: { content: `${word.exampleEn || '-'}\n\n` },
          },
          {
            type: 'text',
            annotations: { bold: true },
            text: { content: 'Traducción en Español:\n' },
          },
          {
            type: 'text',
            text: { content: `${word.exampleEs || '-'}` },
          },
        ],
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
