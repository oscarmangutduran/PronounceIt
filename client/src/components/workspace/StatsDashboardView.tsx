import React from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react';
import { WordItem } from '../../types';

interface StatsDashboardViewProps {
  words: WordItem[];
}

export const StatsDashboardView: React.FC<StatsDashboardViewProps> = ({ words }) => {
  const total = words.length;
  const mastered = words.filter((w) => w.status === 'dominada').length;
  const inReview = words.filter((w) => w.status === 'en_repaso').length;
  const newWords = words.filter((w) => w.status === 'nueva').length;
  const favorites = words.filter((w) => w.isFavorite).length;

  const retentionPercent = total > 0 ? Math.round((mastered / total) * 100) : 68;

  // Levels breakdown
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  const levelCounts = levels.map((lvl) => ({
    level: lvl,
    count: words.filter((w) => w.level === lvl).length,
  }));

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 select-none animate-fadeIn">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total words */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Palabras</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
            <span className="text-[11px] text-slate-500 font-medium">En tu biblioteca</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen size={22} />
          </div>
        </div>

        {/* Mastered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-emerald-600">Dominadas</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{mastered}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">{retentionPercent}% retención</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* In Review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-amber-600">En Repaso</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inReview}</h3>
            <span className="text-[11px] text-slate-500 font-medium">Próximos días</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-orange-600">Racha de Estudio</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">14 Días</h3>
            <span className="text-[11px] text-orange-600 font-semibold">¡Imparable! 🔥</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Flame size={22} />
          </div>
        </div>
      </div>

      {/* Retention & SRS SM-2 Chart card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Curva del Olvido y Rendimiento SRS SM-2</h3>
            <p className="text-xs text-slate-500">
              Distribución de términos según el algoritmo de repetición espaciada
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Algoritmo SM-2 Activo
          </span>
        </div>

        {/* Multi-segment Bar */}
        <div className="space-y-2">
          <div className="w-full h-4 rounded-full bg-slate-100 flex overflow-hidden">
            <div
              style={{ width: `${(mastered / Math.max(1, total)) * 100}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Dominadas: ${mastered}`}
            />
            <div
              style={{ width: `${(inReview / Math.max(1, total)) * 100}%` }}
              className="bg-amber-400 h-full transition-all"
              title={`En repaso: ${inReview}`}
            />
            <div
              style={{ width: `${(newWords / Math.max(1, total)) * 100}%` }}
              className="bg-purple-400 h-full transition-all"
              title={`Nuevas: ${newWords}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Dominadas ({mastered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span>En repaso ({inReview})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <span>Nuevas sin repasar ({newWords})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution by CEFR Level */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Distribución por Nivel de Dominio (CEFR)</h3>
        <p className="text-xs text-slate-500 mb-6">
          Cantidad de vocabulario clasificado desde principiante hasta avanzado
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {levelCounts.map((item) => (
            <div
              key={item.level}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1"
            >
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {item.level}
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-2">{item.count}</p>
              <span className="text-[10px] text-slate-400 font-medium">palabras</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
