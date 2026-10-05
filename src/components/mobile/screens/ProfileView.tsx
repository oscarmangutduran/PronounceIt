import React from 'react';
import {
  User,
  Mail,
  Key,
  Shield,
  LogOut,
  RefreshCw,
  Database,
  ExternalLink,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { supabaseService } from '../../../lib/supabaseClient';

interface ProfileViewProps {
  onLogout: () => void;
  onOpenSettings: () => void;
  onResetData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onLogout,
  onOpenSettings,
  onResetData,
}) => {
  const user = supabaseService.getCurrentUser();
  const config = supabaseService.getConfig();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-5 py-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Cuenta y Configuración
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Gestión de usuario y enlace con Supabase
        </p>
      </div>

      {/* User Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-md">
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {user?.full_name || 'Usuario'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {user?.email || 'sin-correo@ejemplo.com'}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
            <span>ID: {user?.id.slice(0, 12)}...</span>
          </div>
        </div>
      </div>

      {/* Supabase Connection Status Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Database size={15} />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Backend Supabase
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              config.isCustom
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {config.isCustom ? 'Proyecto Conectado' : 'Modo Simulador'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Endpoint URL:</span>
            <span className="font-mono text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
              {config.url ? config.url.replace(/^https?:\/\//, '') : 'Local Storage Mode'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Políticas RLS:</span>
            <span className="text-emerald-600 font-medium">Habilitadas</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Sliders size={13} />
          <span>Configurar Credenciales de Supabase</span>
        </button>
      </div>

      {/* App Architecture Info */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone size={15} className="text-slate-500" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            React Native & Expo Runtime
          </h4>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Esta vista simula con precisión de píxel la interfaz nativa construida con componentes
          <code className="text-slate-700 dark:text-slate-300 font-mono">
            {' '}
            FlatList, SafeAreaView, TouchableOpacity{' '}
          </code>
          y el cliente oficial de Supabase.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onResetData}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={13} />
          <span>Restablecer Tareas de Prueba</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
        >
          <LogOut size={13} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
