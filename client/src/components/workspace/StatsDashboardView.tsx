import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
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

  const retentionPercent = total > 0 ? Math.round((mastered / total) * 100) : 68;

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  const levelCounts = levels.map((lvl) => ({
    level: lvl,
    count: words.filter((w) => w.level === lvl).length,
  }));

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 select-none animate-fadeIn text-white">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total words */}
        <div className="bg-[#181226]/85 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Palabras</span>
            <h3 className="text-3xl font-black text-white mt-1">{total}</h3>
            <span className="text-[11px] text-slate-400 font-medium">En tu biblioteca</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
            <BookOpen size={22} className="text-[#ff4d6d]" />
          </div>
        </div>

        {/* Mastered */}
        <div className="bg-[#181226]/85 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-emerald-400">Dominadas</span>
            <h3 className="text-3xl font-black text-white mt-1">{mastered}</h3>
            <span className="text-[11px] text-emerald-400 font-semibold">{retentionPercent}% retención</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* In Review */}
        <div className="bg-[#181226]/85 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-amber-400">En Repaso</span>
            <h3 className="text-3xl font-black text-white mt-1">{inReview}</h3>
            <span className="text-[11px] text-slate-400 font-medium">Próximos días</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Clock size={22} />
          </div>
        </div>

        {/* Streak */}
        <div className="bg-[#181226]/85 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-orange-400">Racha de Estudio</span>
            <h3 className="text-3xl font-black text-white mt-1">14 Días</h3>
            <span className="text-[11px] text-orange-400 font-semibold">¡Imparable! 🔥</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
            <Flame size={22} />
          </div>
        </div>
      </div>

      {/* Retention & SRS SM-2 Chart card */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Curva del Olvido y Rendimiento SRS SM-2</h3>
            <p className="text-xs text-slate-400">
              Distribución de términos según el algoritmo de repetición espaciada
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Algoritmo SM-2 Activo
          </span>
        </div>

        {/* Multi-segment Bar */}
        <div className="space-y-2.5">
          <div className="w-full h-4 rounded-full bg-black/40 border border-white/10 flex overflow-hidden">
            <div
              style={{ width: `${(mastered / Math.max(1, total)) * 100}%` }}
              className="bg-emerald-500 h-full transition-all shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              title={`Dominadas: ${mastered}`}
            />
            <div
              style={{ width: `${(inReview / Math.max(1, total)) * 100}%` }}
              className="bg-amber-400 h-full transition-all shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              title={`En repaso: ${inReview}`}
            />
            <div
              style={{ width: `${(newWords / Math.max(1, total)) * 100}%` }}
              className="bg-purple-500 h-full transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              title={`Nuevas: ${newWords}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
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
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6">
        <h3 className="text-base font-bold text-white mb-1">Distribución por Nivel de Dominio (CEFR)</h3>
        <p className="text-xs text-slate-400 mb-6">
          Cantidad de vocabulario clasificado desde principiante hasta avanzado
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {levelCounts.map((item) => (
            <div
              key={item.level}
              className="p-4 rounded-xl bg-black/40 border border-white/10 text-center space-y-1 hover:border-[#e62e4c]/40 transition-colors"
            >
              <span className="text-xs font-bold text-pink-300 bg-[#e62e4c]/20 border border-[#e62e4c]/30 px-2 py-0.5 rounded">
                {item.level}
              </span>
              <p className="text-2xl font-black text-white mt-2">{item.count}</p>
              <span className="text-[10px] text-slate-400 font-medium">palabras</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
