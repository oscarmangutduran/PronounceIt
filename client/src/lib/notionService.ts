import { Platform } from 'react-native';
import { WordItem, CategoryItem } from '../types';
import { appStorage } from './storage';
import { firebaseService } from './firebaseClient';

export interface NotionUserConfig {
  databaseId: string;
  rawInput: string;
  notionToken: string;
  databaseTitle?: string;
  connectedAt?: string;
}

const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

/**
 * Extracts a clean 32-hex-char Notion Database ID from a raw ID,
 * hyphenated UUID, or full Notion URL (e.g. https://www.notion.so/workspace/1a2b3c...4d5e?v=...)
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

function getEffectiveUserKey(): string {
  const user = firebaseService.getCurrentUser();
  if (user?.id) return user.id;
  if (user?.email) return user.email.trim().toLowerCase();
  return 'guest';
}

function getStorageKey(): string {
  return `pronounceit_notion_config_u_${getEffectiveUserKey()}`;
}

function getCandidateApiBases(): string[] {
  const bases: string[] = [];
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    '';

  if (envUrl) {
    bases.push(envUrl.replace(/\/+$/, ''));
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      bases.push('http://localhost:5000/api');
    } else {
      bases.push(`${window.location.origin}/api`);
    }
  }

  bases.push('https://pronounceit-sand.vercel.app/api');
  return Array.from(new Set(bases));
}

function mapStatusToNotionLabel(status?: string): string {
  if (status === 'dominada') return 'Aprendido';
  if (status === 'en_repaso') return 'Repasar';
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

function getCleanCats(w: Partial<WordItem>): string[] {
  const raw: string[] = [];
  if (Array.isArray(w.categoryGroups) && w.categoryGroups.length > 0) {
    raw.push(...w.categoryGroups);
  }
  if (w.categoryGroup) {
    raw.push(...w.categoryGroup.split(','));
  }
  if (Array.isArray((w as any).categories) && (w as any).categories.length > 0) {
    raw.push(...(w as any).categories.map((c: any) => (typeof c === 'string' ? c : c?.name)));
  }
  if ((w as any).category) {
    raw.push(...String((w as any).category).split(','));
  }
  if ((w as any).cat) {
    raw.push(...String((w as any).cat).split(','));
  }
  const cleaned = Array.from(
    new Set(raw.map((c) => String(c || '').trim()).filter(Boolean))
  );
  const nonGeneral = cleaned.filter((c) => c.toLowerCase() !== 'general');
  return nonGeneral.length > 0 ? nonGeneral : (cleaned.length > 0 ? cleaned : ['General']);
}

function getCleanSubs(w: Partial<WordItem>): string[] {
  const raw: string[] = [];
  if (Array.isArray(w.categorySubs) && w.categorySubs.length > 0) {
    raw.push(...w.categorySubs);
  }
  if (w.categorySub) {
    raw.push(...w.categorySub.split(','));
  }
  if (Array.isArray((w as any).subcategories) && (w as any).subcategories.length > 0) {
    raw.push(
      ...(w as any).subcategories.map((s: any) =>
        String(typeof s === 'string' ? s : s?.name || '').trim()
      ).filter(Boolean)
    );
  }
  if ((w as any).subcategory) {
    raw.push(...String((w as any).subcategory).split(','));
  }
  if ((w as any).subCategory) {
    raw.push(...String((w as any).subCategory).split(','));
  }
  if ((w as any).sub) {
    raw.push(...String((w as any).sub).split(','));
  }
  return Array.from(
    new Set(
      raw
        .map((s) => String(s || '').trim())
        .filter((s) => Boolean(s) && s.toLowerCase() !== 'general')
    )
  );
}

class NotionService {
  private listeners: (() => void)[] = [];

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getConfig(): NotionUserConfig {
    try {
      const raw = appStorage.getItem(getStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          databaseId: parsed.databaseId || '',
          rawInput: parsed.rawInput || parsed.databaseId || '',
          notionToken: parsed.notionToken || '',
          databaseTitle: parsed.databaseTitle || '',
          connectedAt: parsed.connectedAt || '',
        };
      }
    } catch {}
    return {
      databaseId: '',
      rawInput: '',
      notionToken: '',
      databaseTitle: '',
    };
  }

  public saveConfig(config: Partial<NotionUserConfig>): NotionUserConfig {
    const current = this.getConfig();
    const rawInput = (config.rawInput ?? config.databaseId ?? current.rawInput).trim();
    const extractedId = extractNotionDatabaseId(rawInput) || rawInput;
    const next: NotionUserConfig = {
      databaseId: extractedId,
      rawInput,
      notionToken: (config.notionToken ?? current.notionToken).trim(),
      databaseTitle: config.databaseTitle ?? current.databaseTitle,
      connectedAt: config.connectedAt ?? current.connectedAt ?? new Date().toISOString(),
    };
    try {
      appStorage.setItem(getStorageKey(), JSON.stringify(next));
    } catch {}
    this.notify();
    return next;
  }

  public clearConfig(): void {
    try {
      appStorage.removeItem(getStorageKey());
    } catch {}
    this.notify();
  }

  public isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(extractNotionDatabaseId(cfg.databaseId));
  }

  private async callBackendNotion(endpoint: string, payload: any): Promise<any> {
    const bases = getCandidateApiBases();
    let lastError: any = null;

    for (const base of bases) {
      try {
        const res = await fetch(`${base}/notion/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          return data;
        }
        if (data?.message) {
          lastError = new Error(data.message);
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Native mobile direct fallback (no CORS on native Android/iOS)
    if (Platform.OS !== 'web' && payload.notionToken && payload.databaseId) {
      try {
        return await this.directNativeNotionCall(endpoint, payload);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No se pudo conectar con el servicio de Notion.');
  }

  private async directNativeNotionCall(endpoint: string, payload: any): Promise<any> {
    const databaseId = extractNotionDatabaseId(payload.databaseId);
    const token = (payload.notionToken || '').trim();
    if (!databaseId || !token) {
      throw new Error('Falta el ID de la base de datos o el Token de Notion.');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    };

    const dbRes = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
      method: 'GET',
      headers,
    });
    let dbData: any = await dbRes.json().catch(() => ({}));
    if (!dbRes.ok) {
      throw new Error(dbData?.message || 'Error accediendo a la base de datos de Notion.');
    }

    // Ensure schema & subcategory options exist in Notion
    const existingProps = dbData?.properties || {};
    const existingKeysLower = new Map<string, string>();
    Object.keys(existingProps).forEach((k) => existingKeysLower.set(k.trim().toLowerCase(), k));
    const findKey = (cands: string[]) => {
      for (const c of cands) {
        const found = existingKeysLower.get(c.toLowerCase());
        if (found) return found;
      }
      return null;
    };

    const desiredCats = new Set<string>();
    const desiredSubs = new Set<string>();
    if (Array.isArray(payload.categories)) {
      payload.categories.forEach((c: any) => {
        if (c?.name) desiredCats.add(String(c.name).trim());
        if (Array.isArray(c?.subcategories)) {
          c.subcategories.forEach((s: any) => {
            if (s?.name && String(s.name).trim().toLowerCase() !== 'general') {
              desiredSubs.add(String(s.name).trim());
            }
          });
        }
      });
    }
    const wordListForSchema: WordItem[] = Array.isArray(payload.words)
      ? payload.words
      : payload.word
      ? [payload.word]
      : [];
    wordListForSchema.forEach((w) => {
      getCleanCats(w).forEach((c) => desiredCats.add(c));
      getCleanSubs(w).forEach((s) => desiredSubs.add(s));
    });

    const patchProps: Record<string, any> = {};
    const subKey = findKey(['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria']);
    if (!subKey) {
      patchProps['Sub categoría'] = {
        select: { options: Array.from(desiredSubs).map((name) => ({ name })) },
      };
    } else if (existingProps[subKey]?.type === 'select' || existingProps[subKey]?.type === 'multi_select') {
      const pType = existingProps[subKey].type;
      const curOpts: any[] = existingProps[subKey][pType]?.options || [];
      const curNames = new Set(curOpts.map((o: any) => String(o?.name || '').trim().toLowerCase()));
      const toAdd = Array.from(desiredSubs).filter((n) => !curNames.has(n.toLowerCase()));
      if (toAdd.length > 0) {
        patchProps[subKey] = {
          [pType]: {
            options: [
              ...curOpts.map((o: any) => ({ name: o.name, ...(o.id ? { id: o.id } : {}) })),
              ...toAdd.map((name) => ({ name })),
            ],
          },
        };
      }
    }

    if (Object.keys(patchProps).length > 0) {
      const pRes = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties: patchProps }),
      });
      if (pRes.ok) {
        dbData = await pRes.json().catch(() => dbData);
      }
    }

    // Fetch existing Notion pages
    const qRes = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page_size: 100 }),
    });
    const qData: any = await qRes.json().catch(() => ({}));
    const notionWords: Partial<WordItem>[] = [];
    const existingPageIdsByWord = new Map<string, string>();
    const existingNotionWordsMap = new Map<string, Partial<WordItem>>();

    if (qRes.ok && Array.isArray(qData?.results)) {
      for (const page of qData.results) {
        if (page?.archived || page?.in_trash) continue;
        const pProps = page?.properties || {};
        let wTitle = '';
        for (const [, pDef] of Object.entries(pProps) as [string, any][]) {
          if (pDef?.type === 'title' && Array.isArray(pDef.title)) {
            wTitle = pDef.title.map((t: any) => t?.plain_text || '').join('').trim();
            break;
          }
        }
        if (!wTitle) continue;
        existingPageIdsByWord.set(wTitle.toLowerCase(), page.id);

        const readVals = (cands: string[]): string[] => {
          for (const [pName, pDef] of Object.entries(pProps) as [string, any][]) {
            if (cands.includes(pName.trim().toLowerCase())) {
              if (pDef?.type === 'select' && pDef.select?.name) return [pDef.select.name];
              if (pDef?.type === 'multi_select' && Array.isArray(pDef.multi_select)) {
                return pDef.multi_select.map((x: any) => x?.name || '').filter(Boolean);
              }
              if (pDef?.type === 'rich_text' && Array.isArray(pDef.rich_text)) {
                const txt = pDef.rich_text.map((x: any) => x?.plain_text || '').join('').trim();
                return txt ? [txt] : [];
              }
            }
          }
          return [];
        };

        const cats = readVals(['categoría', 'categoria', 'category']);
        const subs = readVals(['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria']).filter(
          (s) => s.toLowerCase() !== 'general'
        );
        const esp = readVals(['español', 'espanol', 'traducción', 'traduccion'])[0] || wTitle;
        const pron = readVals(['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa'])[0] || '';
        const estado = readVals(['estado', 'status'])[0] || 'Nuevo';
        const nivel = readVals(['nivel', 'level'])[0] || 'B1';

        const parsedWord: Partial<WordItem> = {
          word: wTitle,
          translation: esp,
          ipa: pron,
          level: nivel as any,
          status: mapNotionStatusToAppStatus(estado),
          categoryGroups: cats.length > 0 ? cats : ['General'],
          categoryGroup: (cats.length > 0 ? cats : ['General']).join(', '),
          categorySubs: subs,
          categorySub: subs.join(', '),
        };
        notionWords.push(parsedWord);
        existingNotionWordsMap.set(wTitle.toLowerCase(), parsedWord);
      }
    }

    if (endpoint === 'verify') {
      const titleArr = dbData?.title || [];
      const databaseTitle =
        Array.isArray(titleArr) && titleArr.length > 0
          ? titleArr.map((t: any) => t.plain_text || '').join('')
          : 'Base de Datos de Notion';
      return {
        success: true,
        databaseId,
        databaseTitle,
        notionWords,
        message: `¡Conectado con éxito a "${databaseTitle}"!`,
      };
    }

    const syncOne = async (w: WordItem) => {
      const props: Record<string, any> = {};
      const dbProps = dbData?.properties || {};
      let titlePropName = 'Name';
      for (const [k, v] of Object.entries(dbProps) as [string, any][]) {
        if (v?.type === 'title') {
          titlePropName = k;
          break;
        }
      }
      props[titlePropName] = {
        title: [{ text: { content: (w.word || '').trim() } }],
      };

      const phonetic = w.ipa?.trim() || (w.phoneticGuide ? `/${w.phoneticGuide.trim().replace(/^"+|"+$/g, '')}/` : '');
      const exampleCombined =
        w.exampleEn && w.exampleEs
          ? `${w.exampleEn} (${w.exampleEs})`
          : w.exampleEn || w.exampleEs || '';
      const catNames = getCleanCats(w);
      const subNames = getCleanSubs(w);
      const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes((w.level || '').toUpperCase())
        ? (w.level || 'B1').toUpperCase()
        : 'B1';

      for (const [propName, propDef] of Object.entries(dbProps) as [string, any][]) {
        const lower = propName.trim().toLowerCase();
        const setVal = (vals: string | string[]) => {
          const arr = (Array.isArray(vals) ? vals : [vals]).map((v) => String(v || '').trim()).filter(Boolean);
          if (arr.length === 0) return;
          if (propDef.type === 'rich_text') {
            props[propName] = { rich_text: [{ text: { content: arr.join(', ') } }] };
          } else if (propDef.type === 'select') {
            props[propName] = { select: { name: arr[0] } };
          } else if (propDef.type === 'multi_select') {
            props[propName] = { multi_select: arr.map((name) => ({ name })) };
          }
        };

        if (['pronunciación', 'pronunciacion', 'fonética', 'fonetica', 'ipa'].includes(lower)) {
          setVal(phonetic);
        } else if (['español', 'espanol', 'traducción', 'traduccion', 'significado'].includes(lower)) {
          setVal(w.translation || '');
        } else if (['ejemplo', 'frase', 'oración', 'oracion'].includes(lower)) {
          if (propDef.type === 'rich_text') {
            const richArr: any[] = [];
            const en = (w.exampleEn || '').trim();
            const esRaw = (w.exampleEs || '').trim();
            if (en) {
              richArr.push({
                type: 'text',
                text: { content: esRaw ? `${en}\n` : en },
              });
            }
            if (esRaw) {
              const esFormatted = esRaw.startsWith('(') && esRaw.endsWith(')') ? esRaw : `(${esRaw})`;
              richArr.push({
                type: 'text',
                text: { content: esFormatted },
                annotations: { italic: true, color: 'gray' },
              });
            }
            if (richArr.length > 0) {
              props[propName] = { rich_text: richArr };
            }
          } else {
            setVal(exampleCombined);
          }
        } else if (['estado', 'status'].includes(lower) && propDef.type !== 'status') {
          setVal(mapStatusToNotionLabel(w.status));
        } else if (['categoría', 'categoria', 'category'].includes(lower)) {
          setVal(catNames);
        } else if (['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria'].includes(lower)) {
          if (subNames.length > 0) {
            setVal(subNames);
          }
        } else if (['nivel', 'level'].includes(lower)) {
          setVal(level);
        }
      }

      const existingId = existingPageIdsByWord.get((w.word || '').trim().toLowerCase());
      if (existingId) {
        const existingWord = existingNotionWordsMap.get((w.word || '').trim().toLowerCase());
        if (existingWord) {
          const existingCats = getCleanCats(existingWord);
          const existingSubs = getCleanSubs(existingWord);
          const targetCats = getCleanCats(w);
          const targetSubs = getCleanSubs(w);

          const hasSameCats =
            targetCats.length === 0 ||
            (targetCats.length === 1 && targetCats[0].toLowerCase() === 'general') ||
            targetCats.every((c) => existingCats.some((ec) => ec.toLowerCase() === c.toLowerCase()));

          const hasSameSubs =
            targetSubs.length === 0 ||
            targetSubs.every((s) => existingSubs.some((es) => es.toLowerCase() === s.toLowerCase()));

          if (hasSameCats && hasSameSubs) {
            // Both the word, category and subcategory already exist in Notion: do nothing!
            return;
          }
        }

        await fetch(`${NOTION_API_BASE}/pages/${existingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ properties: props }),
        });
      } else {
        await fetch(`${NOTION_API_BASE}/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: props,
          }),
        });
      }
    };

    if (endpoint === 'sync-word' && payload.word) {
      await syncOne(payload.word);
      return { success: true };
    }

    if (endpoint === 'sync-bulk' && Array.isArray(payload.words)) {
      let syncedCount = 0;
      for (const w of payload.words) {
        await syncOne(w);
        syncedCount++;
      }
      return {
        success: true,
        syncedCount,
        notionWords,
        message: `Se han sincronizado ${syncedCount} palabra(s) y sus subcategorías con Notion.`,
      };
    }

    return { success: true };
  }

  public async verifyAndSaveConfig(
    rawDatabaseInput: string,
    notionToken: string,
    categories?: CategoryItem[],
    words?: WordItem[]
  ): Promise<{
    success: boolean;
    message: string;
    databaseId?: string;
    databaseTitle?: string;
    notionWords?: Partial<WordItem>[];
  }> {
    const cleanId = extractNotionDatabaseId(rawDatabaseInput);
    if (!cleanId) {
      return {
        success: false,
        message:
          'El ID o enlace introducido no contiene un ID válido de Notion (32 caracteres). Copia el enlace de tu base de datos de Notion y pégalo aquí.',
      };
    }

    // Save locally immediately so the ID is persisted even if token is added later
    this.saveConfig({
      databaseId: cleanId,
      rawInput: rawDatabaseInput.trim(),
      notionToken: notionToken.trim(),
    });

    try {
      const res = await this.callBackendNotion('verify', {
        databaseId: cleanId,
        notionToken: notionToken.trim(),
        categories,
        words,
      });
      this.saveConfig({
        databaseId: cleanId,
        rawInput: rawDatabaseInput.trim(),
        notionToken: notionToken.trim(),
        databaseTitle: res.databaseTitle || 'Base de Datos de Notion',
        connectedAt: new Date().toISOString(),
      });
      return {
        success: true,
        databaseId: cleanId,
        databaseTitle: res.databaseTitle,
        notionWords: res.notionWords || [],
        message: res.message || 'Base de datos de Notion conectada y verificada correctamente.',
      };
    } catch (err: any) {
      return {
        success: false,
        databaseId: cleanId,
        message:
          err?.message ||
          'Se guardó el ID de la base de datos, pero no se pudo verificar la conexión con Notion.',
      };
    }
  }

  public async syncWordIfConfigured(word: WordItem, categories?: CategoryItem[]): Promise<void> {
    const cfg = this.getConfig();
    const cleanId = extractNotionDatabaseId(cfg.databaseId);
    if (!cleanId) return;

    try {
      await this.callBackendNotion('sync-word', {
        databaseId: cleanId,
        notionToken: cfg.notionToken,
        word,
        categories,
      });
    } catch (err) {
      console.warn('[Notion] Error sincronizando palabra:', err);
    }
  }

  public async syncAllWords(
    words: WordItem[],
    categories?: CategoryItem[],
    onProgress?: (syncedSoFar: number, total: number) => void
  ): Promise<{
    success: boolean;
    message: string;
    syncedCount?: number;
    notionWords?: Partial<WordItem>[];
  }> {
    const cfg = this.getConfig();
    const cleanId = extractNotionDatabaseId(cfg.databaseId);
    if (!cleanId) {
      return {
        success: false,
        message: 'Primero introduce y guarda el ID de tu base de datos de Notion.',
      };
    }

    try {
      // 1. Ensure database schema & all category/subcategory options exist in Notion first
      const verifyRes = await this.callBackendNotion('verify', {
        databaseId: cleanId,
        notionToken: cfg.notionToken,
        categories,
        words,
      });

      const collectedNotionWords = new Map<string, Partial<WordItem>>();
      if (Array.isArray(verifyRes?.notionWords)) {
        for (const nw of verifyRes.notionWords) {
          const key = String(nw?.word || '').trim().toLowerCase();
          if (key) collectedNotionWords.set(key, nw);
        }
      }

      if (words.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          notionWords: Array.from(collectedNotionWords.values()),
          message: 'Subcategorías verificadas en Notion.',
        };
      }

      // 2. Sync words in fast batches of 12 to prevent serverless function timeouts
      const BATCH_SIZE = 12;
      let totalSynced = 0;

      for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);
        const batchRes = await this.callBackendNotion('sync-bulk', {
          databaseId: cleanId,
          notionToken: cfg.notionToken,
          words: batch,
          categories,
          skipSchemaEnsure: true,
        });

        totalSynced += batchRes?.syncedCount ?? batch.length;
        if (Array.isArray(batchRes?.notionWords)) {
          for (const nw of batchRes.notionWords) {
            const key = String(nw?.word || '').trim().toLowerCase();
            if (key) collectedNotionWords.set(key, nw);
          }
        }

        if (onProgress) {
          onProgress(Math.min(words.length, i + batch.length), words.length);
        }
      }

      return {
        success: true,
        syncedCount: totalSynced,
        notionWords: Array.from(collectedNotionWords.values()),
        message: `¡${totalSynced} palabras y todas sus subcategorías sincronizadas con Notion!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Error al sincronizar las palabras con Notion.',
      };
    }
  }
}

export const notionService = new NotionService();
