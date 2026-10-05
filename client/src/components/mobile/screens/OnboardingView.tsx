import React from 'react';
import { ArrowRight, ShieldCheck, Database, Smartphone, Zap } from 'lucide-react';

interface OnboardingViewProps {
  onStart: () => void;
  onLogin: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onStart, onLogin }) => {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto no-scrollbar bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Brand Header */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <Zap size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            React Native + Supabase
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
          Tu aplicación móvil con backend Supabase en tiempo real
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Diseñada para iOS y Android con autenticación de usuarios, políticas RLS y guardado de datos en la nube.
        </p>
      </div>

      {/* Feature List */}
      <div className="my-6 space-y-3">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Autenticación Segura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro, inicio de sesión y tokens JWT con Supabase Auth persistente.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Base de Datos PostgreSQL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Guardado de datos en tablas relacionales con Row Level Security (RLS).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              React Native & Expo Ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Código exportable compatible con React Native, Expo Router y AsyncStorage.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pb-2">
        <button
          type="button"
          onClick={onStart}
          className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15 active:scale-[0.98] transition-transform"
        >
          <span>Comenzar ahora</span>
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="w-full h-11 rounded-xl bg-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center transition-colors"
        >
          Ya tengo cuenta · Iniciar sesión
        </button>
      </div>
    </div>
  );
};
