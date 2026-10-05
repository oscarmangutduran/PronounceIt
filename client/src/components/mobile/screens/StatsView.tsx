import React from 'react';
import { BarChart3, CheckCircle, Clock, AlertCircle, Database, ShieldCheck } from 'lucide-react';
import { TaskItem, TaskCategory } from '../../../types';
import { supabaseService } from '../../../lib/supabaseClient';

interface StatsViewProps {
  tasks: TaskItem[];
}

export const StatsView: React.FC<StatsViewProps> = ({ tasks }) => {
  const config = supabaseService.getConfig();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completada').length;
  const inProgress = tasks.filter((t) => t.status === 'en_progreso').length;
  const pending = tasks.filter((t) => t.status === 'pendiente').length;

  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Category counts
  const categories: TaskCategory[] = ['trabajo', 'personal', 'finanzas', 'salud', 'estudio'];
  const categoryStats = categories.map((cat) => {
    const count = tasks.filter((t) => t.category === cat).length;
    const catCompleted = tasks.filter((t) => t.category === cat && t.status === 'completada').length;
    const pct = count > 0 ? Math.round((catCompleted / count) * 100) : 0;
    return { name: cat, count, completed: catCompleted, pct };
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-5 py-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Métricas de Tareas
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Datos agregados sincronizados en tiempo real
        </p>
      </div>

      {/* Main KPI Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tasa de Cumplimiento
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {rate}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${rate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span>{completed} completadas</span>
          <span aria-hidden="true">·</span>
          <span>{inProgress} en curso</span>
          <span aria-hidden="true">·</span>
          <span>{pending} pendientes</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
          Distribución por Categorías
        </h3>

        <div className="space-y-3">
          {categoryStats.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">
                  {item.name}
                </span>
                <span className="text-slate-400 dark:text-slate-500 tabular-nums text-[11px]">
                  {item.completed}/{item.count} ({item.pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 dark:bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supabase Engine Details */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Database size={16} className="text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            PostgreSQL & RLS Status
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Cada tarea guardada en esta app está protegida por políticas{' '}
          <strong className="text-white">Row Level Security</strong>. Las consultas
          aprovechan el token de autorización de Supabase para filtrar exclusivamente los registros del usuario actual.
        </p>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Servidor: {config.isCustom ? 'Supabase Cloud' : 'Emulador Local'}</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck size={13} />
            <span>RLS Activo</span>
          </span>
        </div>
      </div>
    </div>
  );
};
