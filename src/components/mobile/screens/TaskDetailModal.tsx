import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Clock, Trash2, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { TaskItem, TaskStatus } from '../../../types';

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: TaskStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !task) return null;

  async function handleStatusChange(status: TaskStatus) {
    if (!task) return;
    setLoading(true);
    await onUpdateStatus(task.id, status);
    setLoading(false);
  }

  async function handleDelete() {
    if (!task) return;
    setLoading(true);
    await onDelete(task.id);
    setLoading(false);
    onClose();
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'text-rose-600 dark:text-rose-400 font-semibold';
      case 'alta':
        return 'text-amber-600 dark:text-amber-400 font-semibold';
      case 'media':
        return 'text-blue-600 dark:text-blue-400 font-medium';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] overflow-y-auto p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col no-scrollbar">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            ID: {task.id.slice(0, 8)}...
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Title & Status */}
        <div className="mt-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {task.title}
          </h2>

          {/* Clean metadata without pill boxes */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span className="capitalize">{task.category}</span>
            <span aria-hidden="true">·</span>
            <span className={getPriorityBadgeClass(task.priority)}>
              Prioridad {task.priority}
            </span>
            {task.due_date && (
              <>
                <span aria-hidden="true">·</span>
                <span>Vence: {task.due_date}</span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Descripción / Notas
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {task.description || 'Sin descripción adicional.'}
          </p>
        </div>

        {/* Status Selection Buttons */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Estado de la tarea (Supabase)
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('pendiente')}
              disabled={loading}
              className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                task.status === 'pendiente'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Circle size={14} />
              <span>Pendiente</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('en_progreso')}
              disabled={loading}
              className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                task.status === 'en_progreso'
                  ? 'bg-blue-600 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Clock size={14} />
              <span>En marcha</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('completada')}
              disabled={loading}
              className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                task.status === 'completada'
                  ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Completada</span>
            </button>
          </div>
        </div>

        {/* Delete Action with Confirmation */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} />
              <span>Eliminar registro de la base de datos</span>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertTriangle size={15} />
                <span>¿Confirmar eliminación en Supabase?</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow-xs hover:bg-rose-700"
                >
                  {loading ? 'Borrando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
