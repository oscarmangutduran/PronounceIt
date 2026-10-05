import React, { useState } from 'react';
import { X, Calendar, Database, Check } from 'lucide-react';
import { TaskCategory, PriorityLevel, TaskItem } from '../../../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskItem, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
}

const CATEGORIES: TaskCategory[] = ['trabajo', 'personal', 'finanzas', 'salud', 'estudio'];
const PRIORITIES: { level: PriorityLevel; label: string; color: string }[] = [
  { level: 'baja', label: 'Baja', color: 'border-slate-300' },
  { level: 'media', label: 'Media', color: 'border-blue-400' },
  { level: 'alta', label: 'Alta', color: 'border-amber-400' },
  { level: 'urgente', label: 'Urgente', color: 'border-rose-500' },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('trabajo');
  const [priority, setPriority] = useState<PriorityLevel>('media');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor indica un título para la tarea.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'pendiente',
        due_date: dueDate,
        tags: [category, priority],
      });
      // reset
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] overflow-y-auto p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col no-scrollbar">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Nueva Tarea</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Se insertará en tu tabla <code className="font-mono text-emerald-600">tasks</code> de Supabase
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 pb-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Título de la tarea
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Revisar políticas de seguridad RLS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descripción / Notas
            </label>
            <textarea
              rows={3}
              placeholder="Detalles sobre lo que se debe hacer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Categoría
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    category === cat
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nivel de Prioridad
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.level}
                  type="button"
                  onClick={() => setPriority(p.level)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                    priority === p.level
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fecha Límite
            </label>
            <div className="relative flex items-center">
              <Calendar size={14} className="absolute left-3 text-slate-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Guardando en Supabase...</span>
            ) : (
              <>
                <Database size={14} />
                <span>Guardar Tarea en Supabase</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
