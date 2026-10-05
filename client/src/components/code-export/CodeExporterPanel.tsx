import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  FileCode,
  Terminal,
  Database,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { REACT_NATIVE_FILES, CodeFile } from '../../lib/reactNativeCodeTemplates';

export const CodeExporterPanel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(REACT_NATIVE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const installCmd = `npx create-expo-app mi-app-supabase -t blank-typescript
cd mi-app-supabase
npm install @supabase/supabase-js @react-native-async-storage/async-storage @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context lucide-react-native react-native-url-polyfill`;

  function handleCopy() {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyCmd() {
    navigator.clipboard.writeText(installCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
              <Code2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Código React Native (Expo)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Archivos listos para copiar en tu proyecto móvil
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar Archivo'}</span>
          </button>
        </div>

        {/* Quick CLI snippet */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-2">
            <Terminal size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate text-slate-400">npx create-expo-app mi-app...</span>
          </div>
          <button
            type="button"
            onClick={handleCopyCmd}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-sans font-semibold shrink-0"
          >
            {copiedCmd ? '¡Copiado!' : 'Copiar comando'}
          </button>
        </div>
      </div>

      {/* File Navigation Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {REACT_NATIVE_FILES.map((file) => (
          <button
            key={file.name}
            type="button"
            onClick={() => setSelectedFile(file)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFile.name === file.name
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode size={13} className="opacity-70" />
            <span>{file.name}</span>
          </button>
        ))}
      </div>

      {/* File Description Header */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <span className="truncate pr-2">{selectedFile.description}</span>
        <span className="font-mono text-[10px] text-slate-400 shrink-0">{selectedFile.path}</span>
      </div>

      {/* Code Editor Preview */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 select-all no-scrollbar">
        <pre>{selectedFile.content}</pre>
      </div>
    </div>
  );
};
