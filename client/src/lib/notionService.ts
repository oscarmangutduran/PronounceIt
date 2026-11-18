import { Platform } from 'react-native';
import { WordItem } from '../types';
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
    const dbData: any = await dbRes.json().catch(() => ({}));
    if (!dbRes.ok) {
      throw new Error(dbData?.message || 'Error accediendo a la base de datos de Notion.');
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

      const phonetic = w.ipa?.trim() || (w.phoneticGuide ? `/${w.phoneticGuide.trim()}/` : '');
      const exampleCombined =
        w.exampleEn && w.exampleEs
          ? `${w.exampleEn} (${w.exampleEs})`
          : w.exampleEn || w.exampleEs || '';
      const catName =
        (Array.isArray(w.categoryGroups) && w.categoryGroups[0]) ||
        w.categoryGroup?.split(',')[0]?.trim() ||
        'General';
      const subName =
        (Array.isArray(w.categorySubs) && w.categorySubs[0]) ||
        w.categorySub?.split(',')[0]?.trim() ||
        '';
      const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes((w.level || '').toUpperCase())
        ? (w.level || 'B1').toUpperCase()
        : 'B1';

      for (const [propName, propDef] of Object.entries(dbProps) as [string, any][]) {
        const lower = propName.trim().toLowerCase();
        const setVal = (val: string) => {
          if (!val) return;
          if (propDef.type === 'rich_text') {
            props[propName] = { rich_text: [{ text: { content: val } }] };
          } else if (propDef.type === 'select') {
            props[propName] = { select: { name: val } };
          } else if (propDef.type === 'multi_select') {
            props[propName] = { multi_select: [{ name: val }] };
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
        } else if (['categoría', 'categoria'].includes(lower)) {
          setVal(catName);
        } else if (['sub categoría', 'sub categoria', 'subcategoría', 'subcategoria'].includes(lower)) {
          setVal(subName);
        } else if (['nivel', 'level'].includes(lower)) {
          setVal(level);
        }
      }

      await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: props,
        }),
      });
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
        message: `Se han sincronizado ${syncedCount} palabra(s) en Notion.`,
      };
    }

    return { success: true };
  }

  public async verifyAndSaveConfig(
    rawDatabaseInput: string,
    notionToken: string
  ): Promise<{ success: boolean; message: string; databaseId?: string; databaseTitle?: string }> {
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

  public async syncWordIfConfigured(word: WordItem): Promise<void> {
    const cfg = this.getConfig();
    const cleanId = extractNotionDatabaseId(cfg.databaseId);
    if (!cleanId) return;

    try {
      await this.callBackendNotion('sync-word', {
        databaseId: cleanId,
        notionToken: cfg.notionToken,
        word,
      });
    } catch (err) {
      console.warn('[Notion] Error sincronizando palabra:', err);
    }
  }

  public async syncAllWords(words: WordItem[]): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    const cfg = this.getConfig();
    const cleanId = extractNotionDatabaseId(cfg.databaseId);
    if (!cleanId) {
      return {
        success: false,
        message: 'Primero introduce y guarda el ID de tu base de datos de Notion.',
      };
    }

    try {
      const res = await this.callBackendNotion('sync-bulk', {
        databaseId: cleanId,
        notionToken: cfg.notionToken,
        words,
      });
      return {
        success: true,
        syncedCount: res.syncedCount ?? words.length,
        message: res.message || `¡${words.length} palabras sincronizadas con Notion!`,
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
