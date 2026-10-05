import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check } from 'lucide-react';
import { WordItem } from '../../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onImportWords: (newWords: WordItem[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  words,
  onImportWords,
}) => {
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  const jsonString = JSON.stringify(words, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronounceit_vocabulario_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        setImportError('El contenido debe ser una lista de palabras en formato JSON.');
        return;
      }
      onImportWords(parsed);
      onClose();
    } catch {
      setImportError('Formato JSON inválido. Verifica la sintaxis.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none text-white">
      <div className="w-full max-w-lg bg-[#1c162e] rounded-3xl shadow-2xl border border-white/15 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#140f21] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-[#ff4d6d]" />
            <h3 className="text-base font-bold text-white">Exportar / Importar Vocabulario</h3>
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
        <div className="flex border-b border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-[#e62e4c] text-pink-300 bg-[#e62e4c]/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Exportar ({words.length} palabras)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#e62e4c] text-pink-300 bg-[#e62e4c]/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Importar JSON
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Puedes descargar tu colección de vocabulario en formato JSON para copias de seguridad o compartir con otros estudiantes.
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={jsonString}
                  rows={8}
                  className="w-full p-3 font-mono text-[11px] bg-black/50 border border-white/15 rounded-xl text-slate-200 select-all resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? '¡Copiado!' : 'Copiar al portapapeles'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-[#e62e4c]/30 cursor-pointer transition-all"
                >
                  <Download size={14} />
                  <span>Descargar Archivo JSON</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Pega aquí una lista de términos en formato JSON para agregarlos a tu biblioteca.
              </p>
              {importError && (
                <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-300 font-medium">
                  {importError}
                </div>
              )}
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="[ { &quot;word&quot;: &quot;Example&quot;, &quot;translation&quot;: &quot;Ejemplo&quot;, ... } ]"
                rows={8}
                className="w-full p-3 font-mono text-[11px] bg-black/50 border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#e62e4c] resize-none"
              />
              <div className="flex items-center justify-end gap-2.5">
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
                  disabled={!importJson.trim()}
                  className="px-4 py-2 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-[#e62e4c]/30 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <Upload size={14} />
                  <span>Cargar palabras</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
