import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Search,
  CloudCheck,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { TaskItem, TaskCategory } from '../../../types';
import { supabaseService } from '../../../lib/supabaseClient';

interface HomeViewProps {
  tasks: TaskItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTask: (task: TaskItem) => void;
  onOpenCreate: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDeleteTask: (id: string) => void;
}

const CATEGORIES: { id: TaskCategory | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'personal', label: 'Personal' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'salud', label: 'Salud' },
  { id: 'estudio', label: 'Estudio' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  tasks,
  loading,
  onRefresh,
  onSelectTask,
  onOpenCreate,
  onToggleStatus,
  onDeleteTask,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'todas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const user = supabaseService.getCurrentUser();
  const config = supabaseService.getConfig();

  // Metrics
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completada').length;
  const pending = tasks.filter((t) => t.status !== 'completada').length;
  const urgent = tasks.filter((t) => t.priority === 'urgente' && t.status !== 'completada').length;

  // Filtered list
  const filtered = tasks.filter((task) => {
    if (selectedCategory !== 'todas' && task.category !== selectedCategory) return false;
    if (statusFilter === 'pending' && task.status === 'completada') return false;
    if (statusFilter === 'completed' && task.status !== 'completada') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'text-rose-600 dark:text-rose-400 font-semibold';
      case 'alta':
        return 'text-amber-600 dark:text-amber-400 font-semibold';
      case 'media':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  const getPriorityStripe = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'bg-rose-500';
      case 'alta':
        return 'bg-amber-500';
      case 'media':
        return 'bg-blue-500';
      default:
        return 'bg-slate-300 dark:bg-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CloudCheck size={14} />
              <span>{config.isCustom ? 'Supabase DB Activo' : 'Supabase Local'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hola, {user?.full_name?.split(' ')[0] || 'Desarrollador'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              title="Sincronizar con Supabase"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total</span>
            <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {total}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pendientes</span>
            <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {pending}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Hechas</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completed}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Urgentes</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {urgent}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-5 py-2.5 space-y-2 shrink-0 bg-white/40 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar tareas en Supabase..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <SlidersHorizontal size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No hay tareas en esta vista
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[240px] mx-auto">
              Presiona el botón "+" para registrar una nueva tarea en tu base de datos Supabase.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Añadir Tarea</span>
            </button>
          </div>
        ) : (
          filtered.map((task) => {
            const isDone = task.status === 'completada';
            return (
              <div
                key={task.id}
                className="group relative flex items-start bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer overflow-hidden"
                onClick={() => onSelectTask(task)}
              >
                {/* Priority left stripe */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityStripe(
                    task.priority
                  )}`}
                />

                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(task.id, task.status);
                  }}
                  className="mr-3 mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3
                    className={`text-xs font-semibold text-slate-900 dark:text-white truncate ${
                      isDone ? 'line-through opacity-50' : ''
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p
                      className={`text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 ${
                        isDone ? 'opacity-40' : ''
                      }`}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Clean unboxed metadata with dot separators */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                    <span className="capitalize">{task.category}</span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority.toUpperCase()}
                    </span>
                    {task.due_date && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span>{task.due_date}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-1 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  title="Eliminar de Supabase"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (Thumb Zone) */}
      <div className="absolute right-5 bottom-16 z-20">
        <button
          type="button"
          onClick={onOpenCreate}
          className="w-13 h-13 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 dark:shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-transform"
          title="Crear nueva tarea en Supabase"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};
