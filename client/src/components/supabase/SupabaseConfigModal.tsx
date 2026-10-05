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
  ShieldCheck,
  ExternalLink,
  Code,
} from 'lucide-react';
import { supabaseService } from '../../lib/supabaseClient';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

const SQL_SCHEMA = `-- 1. Crear tabla de tareas con clave foránea hacia auth.users
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'trabajo',
  priority TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendiente',
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS) para proteger los datos
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS: cada usuario sólo puede ver, crear, editar y borrar sus propios datos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden ver sus propias tareas"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden crear tareas asociadas a su id" ON public.tasks;
CREATE POLICY "Los usuarios pueden crear tareas asociadas a su id"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden actualizar sus propias tareas"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden eliminar sus propias tareas"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Índice para optimizar búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = supabaseService.getConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  if (!isOpen) return null;

  async function handleSaveAndTest(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setStatusMsg(null);

    const res = await supabaseService.setConfig(url, anonKey);
    setTesting(false);
    setStatusMsg({ success: res.success, text: res.message });

    if (res.success && onConfigSaved) {
      onConfigSaved();
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white">
      <div className="bg-[#1c162e] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/15 animate-fadeIn">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#140f21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-md border border-emerald-500/30">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Integración con Supabase
              </h2>
              <p className="text-xs text-slate-400">
                Autenticación y sincronización en la nube para PronounceIt
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

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Conexión de Proyecto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Code size={14} />
            <span>Script SQL (Tablas & RLS)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-4">
          {activeTab === 'config' ? (
            <form onSubmit={handleSaveAndTest} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <strong>¿Cómo conectar tu proyecto real?</strong> Ve a tu panel de{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Supabase Dashboard
                </a>{' '}
                → Proyecto → <strong>Settings</strong> → <strong>API</strong> y copia la Project URL y la clave anon (public).
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project URL (SUPABASE_URL)
                </label>
                <div className="relative flex items-center">
                  <Globe size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="url"
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Anon / Public Key (SUPABASE_ANON_KEY)
                </label>
                <div className="relative flex items-center">
                  <Key size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {statusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    statusMsg.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
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
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {testing ? (
                    <span>Verificando conexión...</span>
                  ) : (
                    <>
                      <Database size={14} />
                      <span>Conectar y Probar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Copia y pega este script en el <strong>SQL Editor</strong> de Supabase:
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[340px] border border-slate-800 select-all">
                  {SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
