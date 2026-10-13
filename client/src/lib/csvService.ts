import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { WordItem, WordLevel, WordStatus } from '../types';
import { normalizePartOfSpeech } from './dictionaryService';

/**
 * Escapes a single CSV value according to RFC 4180
 */
function escapeCsvValue(val: any, delimiter: string = ';'): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (
    str.includes(delimiter) ||
    str.includes(',') ||
    str.includes(';') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of WordItems into standard CSV format with UTF-8 BOM
 * and explicit Excel separator directive (sep=;) so that Microsoft Excel
 * and other spreadsheet tools place each element into its own separate column.
 */
export function wordsToCsv(words: WordItem[], delimiter: string = ';'): string {
  const headers = [
    'palabra',
    'traduccion',
    'categoria',
    'subcategoria',
    'nivel',
    'tipo',
    'ipa',
    'guia_fonetica',
    'nota_fonetica',
    'ejemplo_en',
    'ejemplo_es',
    'definicion',
    'estado',
    'favorito',
  ];

  const rows = words.map((w) => [
    escapeCsvValue(w.word || '', delimiter),
    escapeCsvValue(w.translation || '', delimiter),
    escapeCsvValue(w.categoryGroup || '', delimiter),
    escapeCsvValue(w.categorySub || '', delimiter),
    escapeCsvValue(w.level || 'B1', delimiter),
    escapeCsvValue(w.partOfSpeech || 'Sustantivo', delimiter),
    escapeCsvValue(w.ipa || '', delimiter),
    escapeCsvValue(w.phoneticGuide || '', delimiter),
    escapeCsvValue(w.phoneticNote || '', delimiter),
    escapeCsvValue(w.exampleEn || '', delimiter),
    escapeCsvValue(w.exampleEs || '', delimiter),
    escapeCsvValue(w.definition || '', delimiter),
    escapeCsvValue(w.status || 'nueva', delimiter),
    escapeCsvValue(w.isFavorite ? 'si' : 'no', delimiter),
  ]);

  const csvBody = [
    headers.join(delimiter),
    ...rows.map((r) => r.join(delimiter)),
  ].join('\r\n');

  // Prefix with UTF-8 BOM (\uFEFF) and Excel separator instruction (sep=;)
  // to guarantee Excel splits each item into separate columns.
  return `\uFEFFsep=${delimiter}\r\n${csvBody}`;
}

/**
 * Downloads a CSV string as a physical .csv file on web
 */
export function downloadCsvFile(filename: string, content: string): void {
  if (typeof document === 'undefined') return;

  const finalName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a CSV file across both Web (download) and Mobile (native share / save sheet)
 */
export async function exportCsvFileAsync(
  filename: string,
  content: string
): Promise<{ success: boolean; message?: string }> {
  const finalName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;

  // 1. Web
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    downloadCsvFile(finalName, content);
    return { success: true };
  }

  // 2. Mobile (Android & iOS)
  try {
    const fsAny = FileSystem as any;
    const dir = fsAny.cacheDirectory || fsAny.documentDirectory || '';
    const fileUri = `${dir}${finalName}`;
    if (fsAny.writeAsStringAsync) {
      await fsAny.writeAsStringAsync(fileUri, content, {
        encoding: fsAny.EncodingType?.UTF8 || 'utf8',
      });
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Vocabulario PronounceIt',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true };
    }

    return { success: true, message: `Guardado en: ${fileUri}` };
  } catch (err: any) {
    console.error('Error exportando CSV en móvil:', err);
    return { success: false, message: err?.message || 'Error al exportar archivo CSV' };
  }
}

/**
 * Opens document picker to select and read a CSV file on Mobile or Web
 */
export async function pickCsvFileAsync(): Promise<{
  success: boolean;
  content?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return { success: false };
    }

    const asset = res.assets[0];
    const fileName = asset.name || 'vocabulario.csv';

    // On Web if file object is provided
    if (asset.file && typeof (asset.file as any).text === 'function') {
      const text = await (asset.file as any).text();
      return { success: true, content: text, fileName };
    }

    if (asset.uri) {
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        const text = await resp.text();
        return { success: true, content: text, fileName };
      } else {
        try {
          const text = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          return { success: true, content: text, fileName };
        } catch {
          const resp = await fetch(asset.uri);
          const text = await resp.text();
          return { success: true, content: text, fileName };
        }
      }
    }

    return { success: false, error: 'No se pudo leer el archivo seleccionado.' };
  } catch (err: any) {
    console.warn('DocumentPicker fallback:', err);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,text/csv,text/plain';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false });
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            resolve({ success: true, content, fileName: file.name });
          };
          reader.onerror = () => resolve({ success: false, error: 'Error leyendo archivo' });
          reader.readAsText(file, 'utf-8');
        };
        input.click();
      });
    }

    return { success: false, error: err?.message || 'Error seleccionando archivo' };
  }
}

/**
 * Normalizes header string to clean alphanumeric
 */
function normalizeHeaderName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps common CSV column names in English or Spanish to WordItem keys
 */
const HEADER_KEY_MAP: Record<string, keyof WordItem> = {
  word: 'word',
  palabra: 'word',
  termino: 'word',
  term: 'word',

  translation: 'translation',
  traduccion: 'translation',
  significado: 'translation',

  category: 'categoryGroup',
  categorygroup: 'categoryGroup',
  categoria: 'categoryGroup',
  grupo: 'categoryGroup',

  subcategory: 'categorySub',
  categorysub: 'categorySub',
  subcategoria: 'categorySub',
  sub: 'categorySub',

  level: 'level',
  nivel: 'level',
  cefr: 'level',

  partofspeech: 'partOfSpeech',
  tipo: 'partOfSpeech',
  pos: 'partOfSpeech',
  tipopalabra: 'partOfSpeech',

  ipa: 'ipa',

  phoneticguide: 'phoneticGuide',
  guiafonetica: 'phoneticGuide',
  fonetica: 'phoneticGuide',

  phoneticnote: 'phoneticNote',
  notafonetica: 'phoneticNote',

  exampleen: 'exampleEn',
  ejemploen: 'exampleEn',
  ejemploingles: 'exampleEn',

  examplees: 'exampleEs',
  ejemploes: 'exampleEs',
  ejemploespanol: 'exampleEs',

  definition: 'definition',
  definicion: 'definition',

  status: 'status',
  estado: 'status',

  isfavorite: 'isFavorite',
  favorite: 'isFavorite',
  favorito: 'isFavorite',
};

/**
 * Parses a CSV string respecting RFC 4180 quotes, Excel sep= header, and multiple delimiters (, ; \t)
 */
export function parseCsvRows(csvText: string): string[][] {
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Check if there is an explicit sep=; or sep=, directive
  let explicitDelimiter: string | null = null;
  if (cleanText.toLowerCase().startsWith('sep=')) {
    const newlineMatch = cleanText.match(/\r\n|\n|\r/);
    if (newlineMatch && newlineMatch.index !== undefined) {
      const sepLine = cleanText.substring(0, newlineMatch.index).trim();
      const extracted = sepLine.split('=')[1]?.trim();
      if (extracted) {
        explicitDelimiter = extracted;
      }
      cleanText = cleanText.substring(newlineMatch.index).trim();
    }
  }

  // Detect delimiter from first non-empty line if not explicit
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = explicitDelimiter || ';';
  if (!explicitDelimiter) {
    if (commaCount > semicolonCount && commaCount > tabCount) {
      delimiter = ',';
    } else if (tabCount > semicolonCount && tabCount > commaCount) {
      delimiter = '\t';
    } else {
      delimiter = ';';
    }
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts parsed CSV rows into WordItem objects with validation and smart defaults
 */
export function parseCsvToWords(csvText: string): WordItem[] {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const normalizedFirstRow = firstRow.map(normalizeHeaderName);

  // Check if first row is a header
  const isHeaderRow = normalizedFirstRow.some((h) => HEADER_KEY_MAP[h] !== undefined);

  let headerIndices: Record<keyof WordItem, number> = {} as any;
  let dataRows: string[][] = [];

  if (isHeaderRow) {
    normalizedFirstRow.forEach((colName, idx) => {
      const mappedKey = HEADER_KEY_MAP[colName];
      if (mappedKey) {
        headerIndices[mappedKey] = idx;
      }
    });
    dataRows = rawRows.slice(1);
  } else {
    // Positional fallback: word, translation, category, subcategory, level, ...
    headerIndices = {
      word: 0,
      translation: 1,
      categoryGroup: 2,
      categorySub: 3,
      level: 4,
      partOfSpeech: 5,
      ipa: 6,
      phoneticGuide: 7,
      phoneticNote: 8,
      exampleEn: 9,
      exampleEs: 10,
      definition: 11,
      status: 12,
      isFavorite: 13,
    } as any;
    dataRows = rawRows;
  }

  const validLevels: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const validStatuses: WordStatus[] = ['nueva', 'en_repaso', 'dominada'];

  const results: WordItem[] = [];

  dataRows.forEach((row, rowIndex) => {
    const getVal = (key: keyof WordItem): string => {
      const idx = headerIndices[key];
      return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
    };

    const word = getVal('word');
    const translation = getVal('translation');

    // Skip empty or invalid lines
    if (!word || !translation) return;

    const rawLevel = getVal('level').toUpperCase();
    const level: WordLevel = validLevels.includes(rawLevel as WordLevel)
      ? (rawLevel as WordLevel)
      : 'B1';

    const rawStatus = getVal('status').toLowerCase();
    const status: WordStatus = validStatuses.includes(rawStatus as WordStatus)
      ? (rawStatus as WordStatus)
      : 'nueva';

    const favVal = getVal('isFavorite').toLowerCase();
    const isFavorite =
      favVal === 'si' ||
      favVal === 'sí' ||
      favVal === 'true' ||
      favVal === '1' ||
      favVal === 'yes';

    const cleanWord = word.charAt(0).toUpperCase() + word.slice(1);
    const cleanLower = word.toLowerCase();

    const wordItem: WordItem = {
      id: `${Date.now()}_${rowIndex}_${Math.random().toString(36).substr(2, 5)}`,
      word: cleanWord,
      translation: translation.charAt(0).toUpperCase() + translation.slice(1),
      categoryGroup: getVal('categoryGroup') || 'General',
      categorySub: getVal('categorySub') || '',
      level,
      partOfSpeech: normalizePartOfSpeech(getVal('partOfSpeech') || 'Sustantivo'),
      ipa: getVal('ipa') || `/${cleanLower}/`,
      phoneticGuide: getVal('phoneticGuide') || `"${cleanLower}"`,
      phoneticNote: getVal('phoneticNote') || 'Pronunciación estándar',
      exampleEn: getVal('exampleEn') || `${cleanWord} is useful in daily conversations.`,
      exampleEs: getVal('exampleEs') || `Se utiliza en conversaciones cotidianas.`,
      definition: getVal('definition') || '',
      status,
      isFavorite,
      createdAt: new Date().toISOString(),
    };

    results.push(wordItem);
  });

  return results;
}
