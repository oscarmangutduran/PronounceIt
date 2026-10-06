import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code,
  Flame,
  FileCode,
  Sparkles,
  CloudUpload,
  RefreshCw,
} from 'lucide-react';
import { firebaseService } from '../../lib/firebaseClient';
import { vocabService } from '../../lib/vocabularyStore';
import { FirebaseConfig } from '../../types';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reglas para usuarios y sus datos privados
    match /users/{userId} {
      // Un usuario solo puede leer y modificar su propio documento de perfil
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Subcolección de vocabulario (words)
      match /words/{wordId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Subcolección de historial de exámenes (test_history)
      match /test_history/{testId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

  }
}`;

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = firebaseService.getConfig();
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: currentConfig.apiKey,
    authDomain: currentConfig.authDomain,
    projectId: currentConfig.projectId,
    storageBucket: currentConfig.storageBucket || '',
    messagingSenderId: currentConfig.messagingSenderId || '',
    appId: currentConfig.appId,
  });

  const [rawSnippet, setRawSnippet] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncingWords, setSyncingWords] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; text: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'quickpaste' | 'rules'>('config');

  if (!isOpen) return null;

  async function handleSyncWordsNow() {
    setSyncingWords(true);
    setSyncResult(null);
    const res = await vocabService.pushAllWordsToFirebase();
    setSyncingWords(false);
    setSyncResult({ success: res.success, text: res.message });
  }

  function parseFirebaseSnippet(snippet: string) {
    try {
      const getVal = (key: string) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
        const match = snippet.match(regex);
        return match ? match[1] : '';
      };

      const extracted: Partial<FirebaseConfig> = {
        apiKey: getVal('apiKey'),
        authDomain: getVal('authDomain'),
        projectId: getVal('projectId'),
        storageBucket: getVal('storageBucket'),
        messagingSenderId: getVal('messagingSenderId'),
        appId: getVal('appId'),
      };

      if (extracted.apiKey || extracted.projectId) {
        setConfig((prev) => ({
          ...prev,
          apiKey: extracted.apiKey || prev.apiKey,
          authDomain: extracted.authDomain || prev.authDomain,
          projectId: extracted.projectId || prev.projectId,
          storageBucket: extracted.storageBucket || prev.storageBucket,
          messagingSenderId: extracted.messagingSenderId || prev.messagingSenderId,
          appId: extracted.appId || prev.appId,
        }));
        setActiveTab('config');
        setStatusMsg({
          success: true,
          text: '¡Valores extraídos correctamente del código pegado! Revisa los campos y pulsa Guardar.',
        });
      } else {
        setStatusMsg({
          success: false,
          text: 'No se reconocieron las propiedades de firebaseConfig en el texto.',
        });
      }
    } catch {
      setStatusMsg({
        success: false,
        text: 'Error al interpretar el fragmento de código.',
      });
    }
  }

  async function handleSaveAndTest(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setStatusMsg(null);

    const res = await firebaseService.setConfig(config);
    setTesting(false);
    setStatusMsg({ success: res.success, text: res.message });

    if (res.success && onConfigSaved) {
      onConfigSaved();
    }
  }

  function handleCopyRules() {
    navigator.clipboard.writeText(FIRESTORE_RULES);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white">
      <div className="bg-[#1c162e] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/15 animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#140f21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md border border-amber-500/30">
              <Flame size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Conexión Firebase</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cloud Firestore & Auth
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sincronización de vocabulario, exámenes y usuario en Google Cloud Firestore
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-5 pt-2 gap-4 text-xs font-semibold bg-[#171226]">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key size={14} />
            <span>Campos del Proyecto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quickpaste')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'quickpaste'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} />
            <span>Pegado Rápido (Snippet JS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode size={14} />
            <span>Reglas de Seguridad (Rules)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-4">
          {activeTab === 'config' && (
            <form onSubmit={handleSaveAndTest} className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                <strong>¿Dónde obtener estos datos?</strong> En tu{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-amber-400"
                >
                  Firebase Console
                </a>{' '}
                → ⚙️ <strong>Configuración del proyecto</strong> → <strong>General</strong> → tus apps web (<strong>&lt;/&gt;</strong>).
              </div>

              {/* Sincronización Inmediata de Datos a Firestore */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <CloudUpload size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sincronizar palabras con Firestore</h4>
                    <p className="text-[11px] text-slate-300">
                      Sube las 15 palabras de tu catálogo directamente a tu base de datos de Firebase.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSyncWordsNow}
                  disabled={syncingWords}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={13} className={syncingWords ? 'animate-spin' : ''} />
                  <span>{syncingWords ? 'Sincronizando...' : 'Subir 15 Palabras Ahora'}</span>
                </button>
              </div>

              {syncResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    syncResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {syncResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{syncResult.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    API Key *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AIzaSy..."
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="pronounceit-app-123"
                    value={config.projectId}
                    onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    App ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1:123456789:web:abcdef..."
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    placeholder="tu-proyecto.firebaseapp.com"
                    value={config.authDomain}
                    onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Storage Bucket (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="tu-proyecto.appspot.com"
                    value={config.storageBucket || ''}
                    onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Messaging Sender ID (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    value={config.messagingSenderId || ''}
                    onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {statusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    statusMsg.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {statusMsg.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {testing ? (
                    <span>Conectando...</span>
                  ) : (
                    <>
                      <Flame size={15} />
                      <span>Conectar Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'quickpaste' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                Pega directamente el bloque de código <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">firebaseConfig</code> que te da Firebase Console al registrar tu app web y se autocompletará todo:
              </div>
              <textarea
                rows={7}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};`}
                value={rawSnippet}
                onChange={(e) => setRawSnippet(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-950 font-mono text-xs text-amber-200 border border-white/10 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => parseFirebaseSnippet(rawSnippet)}
                  disabled={!rawSnippet.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  <span>Auto-detectar y Rellenar Campos</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Copia y pega estas reglas en <strong>Firebase Console</strong> → <strong>Cloud Firestore</strong> → <strong>Reglas (Rules)</strong>:
                </div>
                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedRules ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedRules ? '¡Copiado!' : 'Copiar Reglas'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 text-amber-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[320px] border border-white/10 select-all">
                  {FIRESTORE_RULES}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
