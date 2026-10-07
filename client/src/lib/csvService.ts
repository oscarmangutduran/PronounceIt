import { WordItem, WordLevel, WordStatus } from '../types';

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
    escapeCsvValue(w.partOfSpeech || 'noun', delimiter),
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
      partOfSpeech: getVal('partOfSpeech') || 'noun',
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
