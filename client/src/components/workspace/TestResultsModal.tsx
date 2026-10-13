import React, { useState } from 'react';
import {
  X,
  Trophy,
  Award,
  BookOpen,
  Zap,
  Tag,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Volume2,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { StoredTestItem, testHistoryService } from '../../lib/testHistoryStore';
import { vocabService } from '../../lib/vocabularyStore';

interface TestResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: StoredTestItem[];
}

export const TestResultsModal: React.FC<TestResultsModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'vocabulary' | 'part_of_speech' | 'irregular_verbs'>('all');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  // Filter history
  const filteredHistory = history.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  // Calculate stats
  const totalTests = history.length;
  const vocabTests = history.filter((t) => t.type === 'vocabulary').length;
  const posTests = history.filter((t) => t.type === 'part_of_speech').length;
  const irregularTests = history.filter((t) => t.type === 'irregular_verbs').length;

  const averageScore =
    totalTests > 0
      ? (history.reduce((acc, t) => acc + t.scoreOutOfTen, 0) / totalTests).toFixed(1)
      : '0.0';

  const averagePercent =
    totalTests > 0
      ? Math.round(history.reduce((acc, t) => acc + t.percentage, 0) / totalTests)
      : 0;

  const highestScore =
    totalTests > 0
      ? Math.max(...history.map((t) => t.scoreOutOfTen)).toFixed(1)
      : '0.0';

  const toggleExpand = (id: string) => {
    setExpandedTestId((prev) => (prev === id ? null : id));
  };

  const handleDeleteTest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    testHistoryService.deleteTest(id);
    if (expandedTestId === id) setExpandedTestId(null);
  };

  const handleClearHistory = () => {
    testHistoryService.clearHistory();
    setShowConfirmClear(false);
    setExpandedTestId(null);
  };

  const handleSpeak = (text: string) => {
    vocabService.speak(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none text-white">
      <div className="w-full max-w-4xl bg-[#181226]/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#120d1e] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#e62e4c] to-purple-600 flex items-center justify-center text-white shadow-lg shadow-[#e62e4c]/30 border border-white/10">
              <Trophy size={20} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Resultados y Tests Realizados</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-300">
                  {totalTests} registrados
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Consulta tus notas, historial y desglose de preguntas respondidas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Tests Realizados</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-white">{totalTests}</span>
                <span className="text-[10px] text-slate-400">sesiones</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-[#ff4d6d]">Promedio General</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-[#ff4d6d]">{averageScore}</span>
                <span className="text-[10px] text-slate-400 font-bold">/ 10 pts</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-400">Acierto Global</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-400">{averagePercent}%</span>
                <span className="text-[10px] text-slate-400 font-bold">de acierto</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-300">Mejor Nota</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-amber-300">{highestScore}</span>
                <span className="text-[10px] text-slate-400 font-bold">/ 10 pts</span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'all'
                    ? 'bg-white/20 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {totalTests}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('vocabulary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'vocabulary'
                    ? 'bg-[#e62e4c] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen size={13} />
                <span>Vocabulario</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-pink-200">
                  {vocabTests}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('part_of_speech')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'part_of_speech'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag size={13} className="text-pink-200" />
                <span>Por Tipo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-pink-200">
                  {posTests}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('irregular_verbs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'irregular_verbs'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap size={13} className="text-amber-300" />
                <span>Verbos Irregulares</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-purple-200">
                  {irregularTests}
                </span>
              </button>
            </div>

            {totalTests > 0 && !showConfirmClear && (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 size={13} />
                <span>Limpiar historial</span>
              </button>
            )}

            {showConfirmClear && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-semibold">¿Seguro?</span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Sí, borrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Test List */}
          {filteredHistory.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Award size={26} />
              </div>
              <h4 className="text-sm font-bold text-white">No hay tests en esta categoría</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Completa una evaluación de vocabulario o verbos irregulares para ver tus resultados guardados aquí.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredHistory.map((test) => {
                const isExpanded = expandedTestId === test.id;
                const isVocab = test.type === 'vocabulary';

                return (
                  <div
                    key={test.id}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-black/50 border-white/20 shadow-xl'
                        : 'bg-black/30 hover:bg-black/40 border-white/10'
                    }`}
                  >
                    {/* Test Card Header Row */}
                    <div
                      onClick={() => toggleExpand(test.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                            isVocab
                              ? 'bg-[#e62e4c]/20 border-[#e62e4c]/30 text-pink-300'
                              : 'bg-purple-600/20 border-purple-500/30 text-purple-300'
                          }`}
                        >
                          {isVocab ? <BookOpen size={20} /> : <Zap size={20} className="text-amber-300" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-extrabold text-white">
                              {test.title}
                            </h4>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                                isVocab
                                  ? 'bg-[#e62e4c]/15 text-pink-300 border-[#e62e4c]/30'
                                  : 'bg-purple-500/20 text-purple-200 border-purple-500/30'
                              }`}
                            >
                              {test.level}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {test.completedAt}
                            </span>
                            <span>·</span>
                            <span>{test.totalQuestions} preguntas</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score badge & expand chevron */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xl sm:text-2xl font-black text-[#ff4d6d]">
                              {test.scoreOutOfTen}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">/ 10</span>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-400 block">
                            {test.percentage}% · {test.gradeLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteTest(test.id, e)}
                          title="Eliminar este resultado"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>

                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-300">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {isExpanded && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-white/10 flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Desglose de Preguntas del Test</span>
                          <span className="text-slate-400 font-normal">
                            Aciertos: {test.correctCount} de {test.totalQuestions}
                          </span>
                        </div>

                        {/* Vocabulary Test Questions Details */}
                        {isVocab && test.vocabularyQuestions && test.vocabularyQuestions.length > 0 && (
                          <div className="space-y-2.5">
                            {test.vocabularyQuestions.map((q, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                                  q.isWordCorrect && q.isSentenceValid
                                    ? 'bg-emerald-950/20 border-emerald-500/30'
                                    : 'bg-black/40 border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">
                                      {idx + 1}. {q.wordItem.word}
                                    </span>
                                    <span className="text-slate-400">({q.wordItem.translation})</span>
                                  </div>
                                  <span className="font-bold text-pink-300">
                                    {q.totalQuestionScore} / 10 pts
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-300 space-y-0.5">
                                  <div>
                                    <span className="text-slate-400">Tu traducción:</span>{' '}
                                    <strong className={q.isWordCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                                      {q.userWord || '(en blanco)'}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Tu oración:</span>{' '}
                                    <span className="text-slate-200 italic">
                                      "{q.userSentence || '(sin oración)'}"
                                    </span>
                                  </div>
                                </div>
                                {q.feedback && (
                                  <p className="text-[10px] text-slate-400 border-t border-white/5 pt-1">
                                    {q.feedback}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Irregular Verbs Test Questions Details */}
                        {!isVocab && test.irregularVerbQuestions && test.irregularVerbQuestions.length > 0 && (
                          <div className="space-y-2.5">
                            {test.irregularVerbQuestions.map((q, idx) => {
                              const isFull = q.isPastSimpleCorrect && q.isPastParticipleCorrect;
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border text-xs flex flex-col gap-2 ${
                                    isFull
                                      ? 'bg-emerald-950/20 border-emerald-500/30'
                                      : 'bg-black/40 border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white">
                                        {idx + 1}. {q.verb.infinitive}
                                      </span>
                                      <span className="text-slate-400">({q.verb.translation})</span>
                                      <button
                                        type="button"
                                        onClick={() => handleSpeak(`${q.verb.infinitive}, ${q.verb.pastSimple}, ${q.verb.pastParticiple}`)}
                                        title="Escuchar formas"
                                        className="p-1 rounded bg-white/10 hover:bg-[#e62e4c] text-white"
                                      >
                                        <Volume2 size={12} />
                                      </button>
                                    </div>
                                    <span className="font-bold text-purple-300">
                                      {q.score} / 10 pts
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                    <div className="p-2 rounded-lg bg-black/30 flex items-center justify-between">
                                      <span className="text-slate-400">V2 (Pasado):</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className={q.isPastSimpleCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                          {q.userPastSimple || '(vacío)'}
                                        </span>
                                        {!q.isPastSimpleCorrect && (
                                          <span className="text-slate-400">({q.verb.pastSimple})</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg bg-black/30 flex items-center justify-between">
                                      <span className="text-slate-400">V3 (Participio):</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className={q.isPastParticipleCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                          {q.userPastParticiple || '(vacío)'}
                                        </span>
                                        {!q.isPastParticipleCorrect && (
                                          <span className="text-slate-400">({q.verb.pastParticiple})</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#120d1e] border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Los resultados se sincronizan y guardan localmente de forma automática.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
