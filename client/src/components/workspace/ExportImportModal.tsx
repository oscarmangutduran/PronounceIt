import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  Code,
  Sliders,
} from 'lucide-react';
import { WordItem, WordLevel, WordStatus } from '../../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onImportWords: (newWords: WordItem[]) => void;
}

type DelimiterType = ';' | ',' | '\t';

// Headers in structured columns
const CSV_HEADERS = [
  'Palabra',
  'Tipo',
  'Nivel',
  'IPA',
  'Pronunciacion',
  'Nota_Fonetica',
  'Traduccion',
  'Definicion',
  'Frase_Ingles',
  'Frase_Espanol',
  'Estado',
  'Favorita',
  'Categoria',
  'Subcategoria',
];

// Convert a single CSV cell, handling quotes and the chosen delimiter
function escapeCsvCell(cell: string | number | boolean | undefined, delimiter: DelimiterType): string {
  if (cell === undefined || cell === null) return '';
  const str = String(cell);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert words list to CSV formatted by columns with chosen delimiter (defaulting to ';' for Spanish Excel)
function wordsToCsv(words: WordItem[], delimiter: DelimiterType): string {
  const rows = words.map((w) => [
    escapeCsvCell(w.word, delimiter),
    escapeCsvCell(w.partOfSpeech, delimiter),
    escapeCsvCell(w.level, delimiter),
    escapeCsvCell(w.ipa, delimiter),
    escapeCsvCell(w.phoneticGuide, delimiter),
    escapeCsvCell(w.phoneticNote || '', delimiter),
    escapeCsvCell(w.translation, delimiter),
    escapeCsvCell(w.definition || '', delimiter),
    escapeCsvCell(w.exampleEn, delimiter),
    escapeCsvCell(w.exampleEs, delimiter),
    escapeCsvCell(w.status, delimiter),
    escapeCsvCell(w.isFavorite ? 'si' : 'no', delimiter),
    escapeCsvCell(w.categoryGroup, delimiter),
    escapeCsvCell(w.categorySub, delimiter),
  ]);

  return [CSV_HEADERS.join(delimiter), ...rows.map((r) => r.join(delimiter))].join('\r\n');
}

// Line parser handling quotes and arbitrary delimiter
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse entire CSV text into WordItem objects
function parseCsvToWords(csvText: string, forcedDelimiter?: DelimiterType): WordItem[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('sep=')); // remove Excel sep= directives if present

  if (lines.length < 2) return [];

  // Detect delimiter automatically if not forced
  const firstLine = lines[0];
  let delimiter: string = forcedDelimiter || ';';
  if (!forcedDelimiter) {
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (tabs > semicolons && tabs > commas) {
      delimiter = '\t';
    } else if (semicolons >= commas) {
      delimiter = ';';
    } else {
      delimiter = ',';
    }
  }

  const parsedLines = lines.map((line) => parseCsvLine(line, delimiter));
  const header = parsedLines[0].map((h) => h.toLowerCase());
  const dataRows = parsedLines.slice(1);

  const getIndex = (keys: string[], defaultIndex: number): number => {
    const found = header.findIndex((h) => keys.some((k) => h.includes(k)));
    return found !== -1 ? found : defaultIndex;
  };

  const wordIdx = getIndex(['palabra', 'word', 'term', 'inglés', 'ingles'], 0);
  const posIdx = getIndex(['tipo', 'pos', 'part', 'gramat'], 1);
  const levelIdx = getIndex(['nivel', 'level', 'cefr'], 2);
  const ipaIdx = getIndex(['ipa', 'fonet'], 3);
  const guideIdx = getIndex(['pronunciacion', 'pronunciation', 'guia', 'aprox'], 4);
  const noteIdx = getIndex(['nota', 'note', 'acento'], 5);
  const transIdx = getIndex(['traduccion', 'translation', 'espanol', 'español', 'significado'], 6);
  const defIdx = getIndex(['definicion', 'definition', 'desc'], 7);
  const exEnIdx = getIndex(['frase_ingles', 'ejemplo_ingles', 'example', 'sentence'], 8);
  const exEsIdx = getIndex(['frase_espanol', 'ejemplo_espanol', 'spanish'], 9);
  const statusIdx = getIndex(['estado', 'status'], 10);
  const favIdx = getIndex(['favorita', 'favorite', 'fav'], 11);
  const catIdx = getIndex(['categoria', 'category', 'temario'], 12);
  const subIdx = getIndex(['subcategoria', 'sub'], 13);

  const importedWords: WordItem[] = [];

  for (const row of dataRows) {
    const word = row[wordIdx] || '';
    const translation = row[transIdx] || '';

    if (!word || !translation) continue;

    const levelRaw = (row[levelIdx] || 'B2').toUpperCase();
    const validLevel: WordLevel = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(levelRaw)
      ? (levelRaw as WordLevel)
      : 'B2';

    const statusRaw = (row[statusIdx] || 'nueva').toLowerCase();
    const validStatus: WordStatus = statusRaw.includes('domina')
      ? 'dominada'
      : statusRaw.includes('repaso')
      ? 'en_repaso'
      : 'nueva';

    const favRaw = (row[favIdx] || '').toLowerCase();
    const isFavorite = favRaw === 'si' || favRaw === 'sí' || favRaw === 'true' || favRaw === '1';

    importedWords.push({
      id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      word,
      partOfSpeech: row[posIdx] || 'noun',
      level: validLevel,
      ipa: row[ipaIdx] || `/${word.toLowerCase()}/`,
      phoneticGuide: row[guideIdx] || `"${word.toLowerCase()}"`,
      phoneticNote: row[noteIdx] || '',
      translation,
      definition: row[defIdx] || '',
      exampleEn: row[exEnIdx] || `${word} in business context.`,
      exampleEs: row[exEsIdx] || `${translation} en contexto empresarial.`,
      status: validStatus,
      isFavorite,
      categoryGroup: row[catIdx] || 'Grammar',
      categorySub: row[subIdx] || 'General',
      createdAt: new Date().toISOString(),
    });
  }

  return importedWords;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  words,
  onImportWords,
}) => {
  const [copied, setCopied] = useState(false);
  // Default to semicolon ';' because Spanish Excel requires semicolons to format into separate columns!
  const [delimiter, setDelimiter] = useState<DelimiterType>(';');
  const [viewMode, setViewMode] = useState<'columns_table' | 'raw_csv'>('columns_table');

  const [importCsv, setImportCsv] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const csvString = wordsToCsv(words, delimiter);
  const parsedImportPreview = importCsv.trim() ? parseCsvToWords(importCsv, delimiter) : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(csvString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    // UTF-8 BOM so Excel and other programs render international accents and IPA symbols properly
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronounceit_vocabulario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportCsv(text);
      }
    };
    reader.onerror = () => {
      setImportError('Error al leer el archivo CSV.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = () => {
    setImportError(null);
    setImportSuccessMsg(null);

    if (!importCsv.trim()) {
      setImportError('Por favor pega el contenido CSV o sube un archivo.');
      return;
    }

    try {
      const parsed = parseCsvToWords(importCsv, delimiter);
      if (parsed.length === 0) {
        setImportError(
          'No se pudieron detectar columnas válidas. Comprueba que el archivo use el separador seleccionado y contenga al menos una palabra y traducción.'
        );
        return;
      }

      onImportWords(parsed);
      setImportSuccessMsg(`¡${parsed.length} palabras importadas y organizadas en columnas con éxito!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Error al procesar el archivo CSV: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none text-white">
      <div className="w-full max-w-4xl bg-[#1c162e] rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#140f21] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e62e4c]/20 border border-[#e62e4c]/30 text-[#ff4d6d] flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Exportar / Importar Vocabulario (CSV por Columnas)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Formateo estructurado por columnas para Microsoft Excel, Google Sheets y LibreOffice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 text-xs font-semibold shrink-0 bg-[#161124]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setImportError(null);
              setImportSuccessMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-[#e62e4c] text-pink-300 bg-[#e62e4c]/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download size={14} />
            <span>Exportar CSV en Columnas ({words.length} palabras)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setImportError(null);
              setImportSuccessMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-[#e62e4c] text-pink-300 bg-[#e62e4c]/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload size={14} />
            <span>Importar CSV por Columnas</span>
          </button>
        </div>

        {/* Controls Bar: Delimiter selector & View Switcher */}
        <div className="px-6 py-2.5 bg-[#140f21] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Separator / Delimiter selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Separador de columnas:</span>
            <div className="flex flex-wrap items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setDelimiter(';')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  delimiter === ';'
                    ? 'bg-[#e62e4c] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Separador estándar para Excel en español y países hispanohablantes"
              >
                Punto y coma (;) Excel España
              </button>
              <button
                type="button"
                onClick={() => setDelimiter(',')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  delimiter === ','
                    ? 'bg-[#e62e4c] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Separador estándar internacional y Google Sheets"
              >
                Coma (,) Internacional
              </button>
              <button
                type="button"
                onClick={() => setDelimiter('\t')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  delimiter === '\t'
                    ? 'bg-[#e62e4c] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tabuladores TSV"
              >
                Tab (TSV)
              </button>
            </div>
          </div>

          {/* View mode toggle (Table vs Raw) for Export */}
          {activeTab === 'export' && (
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('columns_table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'columns_table'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon size={12} />
                <span>Vista en Columnas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw_csv')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'raw_csv'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code size={12} />
                <span>Texto CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Los datos se exportan divididos en <strong>14 columnas exactas</strong> con codificación{' '}
                  <strong className="text-emerald-400">UTF-8 con BOM</strong> para que Excel abra las columnas
                  directamente sin desconfigurarse.
                </span>
                <span className="font-mono text-[11px] text-pink-300 bg-[#e62e4c]/20 px-2 py-0.5 rounded-md border border-[#e62e4c]/30 shrink-0">
                  {words.length} filas · 14 columnas
                </span>
              </div>

              {/* View 1: Visual Columns Table Preview */}
              {viewMode === 'columns_table' ? (
                <div className="border border-white/15 rounded-2xl overflow-hidden bg-black/40">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse text-[11px] min-w-[850px]">
                      <thead className="bg-[#140f21] sticky top-0 z-10 border-b border-white/15 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 border-r border-white/10">#</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Palabra</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Tipo</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Nivel</th>
                          <th className="py-2.5 px-3 border-r border-white/10">IPA</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Pronunciación</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Traducción</th>
                          <th className="py-2.5 px-3 border-r border-white/10">Frase Ejemplo</th>
                          <th className="py-2.5 px-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {words.map((w, idx) => (
                          <tr key={w.id} className="hover:bg-white/[0.04] transition-colors">
                            <td className="py-2 px-3 text-slate-500 border-r border-white/10 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-white border-r border-white/10">
                              {w.word}
                            </td>
                            <td className="py-2 px-3 text-slate-400 italic border-r border-white/10">
                              {w.partOfSpeech}
                            </td>
                            <td className="py-2 px-3 text-pink-300 font-bold border-r border-white/10">
                              {w.level}
                            </td>
                            <td className="py-2 px-3 font-mono text-[#ff758c] border-r border-white/10">
                              {w.ipa}
                            </td>
                            <td className="py-2 px-3 text-slate-300 border-r border-white/10">
                              {w.phoneticGuide}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-200 border-r border-white/10">
                              {w.translation}
                            </td>
                            <td className="py-2 px-3 text-slate-400 max-w-[240px] truncate border-r border-white/10">
                              {w.exampleEn}
                            </td>
                            <td className="py-2 px-3 font-semibold text-emerald-400">
                              {w.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* View 2: Raw CSV Text Preview */
                <div className="relative">
                  <textarea
                    readOnly
                    value={csvString}
                    rows={10}
                    className="w-full p-3 font-mono text-[11px] bg-black/50 border border-white/15 rounded-2xl text-slate-200 select-all resize-none focus:outline-none"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Separador actual: <strong className="text-white">"{delimiter === '\t' ? '\\t' : delimiter}"</strong>
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? '¡Copiado!' : 'Copiar CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-5 py-2.5 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-[#e62e4c]/30 cursor-pointer transition-all"
                  >
                    <Download size={14} />
                    <span>Descargar Archivo .CSV con Columnas</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Sube un archivo <strong>.csv</strong> con columnas o pega los datos directamente:
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#e62e4c]/20 hover:bg-[#e62e4c]/30 text-pink-300 text-xs font-semibold border border-[#e62e4c]/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Upload size={13} />
                  <span>Seleccionar archivo .csv</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,.tsv,text/tab-separated-values"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-xs text-red-200 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-200 font-medium flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Textarea for CSV */}
              <textarea
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
                placeholder={`Palabra${delimiter}Tipo${delimiter}Nivel${delimiter}IPA${delimiter}Pronunciacion${delimiter}Traduccion${delimiter}Frase_Ingles${delimiter}Frase_Espanol\nBreakthrough${delimiter}noun/verb${delimiter}B2${delimiter}/ˈbreɪk.θruː/${delimiter}"breik-zru"${delimiter}Avance decisivo${delimiter}"We achieved a major breakthrough"${delimiter}"Logramos un avance decisivo"`}
                rows={6}
                className="w-full p-3 font-mono text-[11px] bg-black/50 border border-white/15 rounded-2xl text-white focus:outline-none focus:border-[#e62e4c] resize-none"
              />

              {/* Live Column Preview for Import */}
              {parsedImportPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>{parsedImportPreview.length} filas detectadas en columnas correctamente:</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Vista previa de columnas:</span>
                  </div>

                  <div className="border border-white/15 rounded-2xl overflow-hidden bg-black/40">
                    <div className="overflow-x-auto max-h-[160px]">
                      <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                        <thead className="bg-[#140f21] border-b border-white/15 text-slate-400 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3 border-r border-white/10">Palabra</th>
                            <th className="py-2 px-3 border-r border-white/10">Nivel</th>
                            <th className="py-2 px-3 border-r border-white/10">IPA</th>
                            <th className="py-2 px-3 border-r border-white/10">Traducción</th>
                            <th className="py-2 px-3">Frase Ejemplo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedImportPreview.slice(0, 5).map((w, i) => (
                            <tr key={i} className="hover:bg-white/[0.04]">
                              <td className="py-1.5 px-3 font-bold text-white border-r border-white/10">{w.word}</td>
                              <td className="py-1.5 px-3 text-pink-300 border-r border-white/10">{w.level}</td>
                              <td className="py-1.5 px-3 font-mono text-[#ff758c] border-r border-white/10">{w.ipa}</td>
                              <td className="py-1.5 px-3 text-slate-200 border-r border-white/10">{w.translation}</td>
                              <td className="py-1.5 px-3 text-slate-400 truncate max-w-[200px]">{w.exampleEn}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-400 hover:bg-white/10 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importCsv.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-[#e62e4c]/30 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <Upload size={14} />
                  <span>
                    Importar {parsedImportPreview.length > 0 ? `${parsedImportPreview.length} Términos` : 'Columnas'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
