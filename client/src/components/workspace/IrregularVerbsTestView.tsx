import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  BookOpen,
  Trophy,
  Star,
  Zap,
  Sliders,
  Check,
} from 'lucide-react';
import { IRREGULAR_VERBS, IrregularVerb } from '../../data/irregularVerbs';
import { vocabService } from '../../lib/vocabularyStore';
import { testHistoryService } from '../../lib/testHistoryStore';

interface IrregularVerbsTestViewProps {
  onBackToVocabulary: () => void;
  onStateChange?: (state: 'setup' | 'testing' | 'result') => void;
  onOpenResultsModal?: () => void;
}

export interface VerbQuestionEvaluation {
  verb: IrregularVerb;
  userPastSimple: string;
  userPastParticiple: string;
  isPastSimpleCorrect: boolean;
  isPastParticipleCorrect: boolean;
  isPastSimpleTypo: boolean;
  isPastParticipleTypo: boolean;
  score: number; // 0 to 10
}

export interface VerbTestResult {
  level: string;
  totalQuestions: number;
  scoreOutOfTen: number;
  percentage: number;
  gradeLabel: string;
  fullyCorrectCount: number;
  pastSimpleCorrectCount: number;
  pastParticipleCorrectCount: number;
  questions: VerbQuestionEvaluation[];
  completedAt: string;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function evaluateForm(userInput: string, expected: string): { isCorrect: boolean; isTypo: boolean } {
  const cleanInput = userInput.trim().toLowerCase();
  if (!cleanInput) return { isCorrect: false, isTypo: false };

  // Split alternatives like "was / were", "got / gotten", "burnt / burned"
  const alternatives = expected
    .toLowerCase()
    .split(/[\/,]/)
    .map((s) => s.trim().replace(/[()]/g, ''))
    .filter(Boolean);

  for (const alt of alternatives) {
    if (cleanInput === alt) {
      return { isCorrect: true, isTypo: false };
    }
  }

  for (const alt of alternatives) {
    if (cleanInput.length > 3 && levenshteinDistance(cleanInput, alt) <= 1) {
      return { isCorrect: true, isTypo: true };
    }
  }

  return { isCorrect: false, isTypo: false };
}

export const IrregularVerbsTestView: React.FC<IrregularVerbsTestViewProps> = ({
  onBackToVocabulary,
  onStateChange,
  onOpenResultsModal,
}) => {
  // Setup configuration
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Flow states: 'setup' | 'testing' | 'result'
  const [testState, setTestState] = useState<'setup' | 'testing' | 'result'>('setup');

  useEffect(() => {
    onStateChange?.(testState);
  }, [testState, onStateChange]);
  const [testVerbs, setTestVerbs] = useState<IrregularVerb[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);

  // User input answers
  const [userAnswers, setUserAnswers] = useState<{ pastSimple: string; pastParticiple: string }[]>([]);

  // Results
  const [finalResult, setFinalResult] = useState<VerbTestResult | null>(null);

  // Input refs for keyboard navigation
  const pastSimpleInputRef = useRef<HTMLInputElement>(null);
  const pastParticipleInputRef = useRef<HTMLInputElement>(null);

  // Filter verbs according to level
  const availableVerbs = useMemo(() => {
    if (selectedLevel === 'all') return IRREGULAR_VERBS;
    if (selectedLevel === 'basic') return IRREGULAR_VERBS.filter((v) => v.level === 'A1' || v.level === 'A2');
    if (selectedLevel === 'intermediate') return IRREGULAR_VERBS.filter((v) => v.level === 'B1' || v.level === 'B2');
    if (selectedLevel === 'advanced') return IRREGULAR_VERBS.filter((v) => v.level === 'C1' || v.level === 'C2');
    return IRREGULAR_VERBS.filter((v) => v.level === selectedLevel);
  }, [selectedLevel]);

  // Focus past simple input when question changes
  useEffect(() => {
    if (testState === 'testing') {
      setShowHint(false);
      setTimeout(() => {
        pastSimpleInputRef.current?.focus();
      }, 50);
    }
  }, [currentIdx, testState]);

  // Start test
  const handleStartTest = (customVerbs?: IrregularVerb[]) => {
    const list = customVerbs && customVerbs.length > 0 ? customVerbs : availableVerbs;
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    const count = questionCount === -1 ? shuffled.length : Math.min(questionCount, shuffled.length);
    const chosen = shuffled.slice(0, count);

    setTestVerbs(chosen);
    setUserAnswers(chosen.map(() => ({ pastSimple: '', pastParticiple: '' })));
    setCurrentIdx(0);
    setFinalResult(null);
    setShowHint(false);
    setTestState('testing');
  };

  // Update inputs
  const handlePastSimpleChange = (val: string) => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], pastSimple: val };
      return copy;
    });
  };

  const handlePastParticipleChange = (val: string) => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], pastParticiple: val };
      return copy;
    });
  };

  // Current question data
  const currentVerb = testVerbs[currentIdx];
  const currentAnswer = userAnswers[currentIdx] || { pastSimple: '', pastParticiple: '' };

  // Audio helpers
  const handleSpeak = (text: string) => {
    vocabService.speak(text);
  };

  const handleSpeakAllForms = (verb: IrregularVerb) => {
    vocabService.speak(`${verb.infinitive}, ${verb.pastSimple.replace('/', 'or')}, ${verb.pastParticiple.replace('/', 'or')}`);
  };

  // Evaluate and Finish
  const handleFinishTest = () => {
    let totalScoreSum = 0;
    let fullyCorrectCount = 0;
    let pastSimpleCorrectCount = 0;
    let pastParticipleCorrectCount = 0;

    const evaluatedQuestions: VerbQuestionEvaluation[] = testVerbs.map((verb, idx) => {
      const ans = userAnswers[idx] || { pastSimple: '', pastParticiple: '' };

      const pastSimpleEval = evaluateForm(ans.pastSimple, verb.pastSimple);
      const pastParticipleEval = evaluateForm(ans.pastParticiple, verb.pastParticiple);

      let questionScore = 0;
      if (pastSimpleEval.isCorrect) {
        questionScore += pastSimpleEval.isTypo ? 4.0 : 5.0;
        pastSimpleCorrectCount++;
      }
      if (pastParticipleEval.isCorrect) {
        questionScore += pastParticipleEval.isTypo ? 4.0 : 5.0;
        pastParticipleCorrectCount++;
      }

      if (pastSimpleEval.isCorrect && pastParticipleEval.isCorrect) {
        fullyCorrectCount++;
      }

      totalScoreSum += questionScore;

      return {
        verb,
        userPastSimple: ans.pastSimple,
        userPastParticiple: ans.pastParticiple,
        isPastSimpleCorrect: pastSimpleEval.isCorrect,
        isPastParticipleCorrect: pastParticipleEval.isCorrect,
        isPastSimpleTypo: pastSimpleEval.isTypo,
        isPastParticipleTypo: pastParticipleEval.isTypo,
        score: questionScore,
      };
    });

    const rawAverage = testVerbs.length > 0 ? totalScoreSum / testVerbs.length : 0;
    const scoreOutOfTen = Math.round(rawAverage * 10) / 10;
    const percentage = Math.round((scoreOutOfTen / 10) * 100);

    let gradeLabel = 'Sobresaliente';
    if (scoreOutOfTen >= 9.0) gradeLabel = 'Sobresaliente 🏆';
    else if (scoreOutOfTen >= 7.0) gradeLabel = 'Notable 🌟';
    else if (scoreOutOfTen >= 5.0) gradeLabel = 'Aprobado 👍';
    else gradeLabel = 'Necesita Repasar 📚';

    const levelText =
      selectedLevel === 'all'
        ? 'Todos los niveles (A1-C2)'
        : selectedLevel === 'basic'
        ? 'Básico (A1-A2)'
        : selectedLevel === 'intermediate'
        ? 'Intermedio (B1-B2)'
        : selectedLevel === 'advanced'
        ? 'Avanzado (C1-C2)'
        : selectedLevel;

    const result: VerbTestResult = {
      level: levelText,
      totalQuestions: testVerbs.length,
      scoreOutOfTen,
      percentage,
      gradeLabel,
      fullyCorrectCount,
      pastSimpleCorrectCount,
      pastParticipleCorrectCount,
      questions: evaluatedQuestions,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setFinalResult(result);
    setTestState('result');

    // Save to test history
    testHistoryService.addTest({
      type: 'irregular_verbs',
      title: 'Test de Verbos Irregulares',
      level: levelText,
      scoreOutOfTen,
      percentage,
      gradeLabel,
      totalQuestions: testVerbs.length,
      correctCount: fullyCorrectCount,
      completedAt: `Hoy, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      irregularVerbQuestions: evaluatedQuestions,
    });
  };

  // Practice only mistakes
  const handlePracticeMistakes = () => {
    if (!finalResult) return;
    const mistakes = finalResult.questions
      .filter((q) => !q.isPastSimpleCorrect || !q.isPastParticipleCorrect)
      .map((q) => q.verb);

    if (mistakes.length > 0) {
      handleStartTest(mistakes);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none text-white animate-fadeIn">
      {/* 1. SETUP SCREEN */}
      {testState === 'setup' && (
        <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/40 border border-white/10">
              <Zap size={26} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Test de Verbos Irregulares</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  V1 · V2 · V3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pon a prueba tu dominio de las 3 formas verbales: Infinitivo, Pasado Simple (V2) y Participio Pasado (V3).
              </p>
            </div>
          </div>

          {/* Level Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
              1. Selecciona el Nivel de Verbos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'all',
                  label: 'Todos los niveles',
                  sub: 'A1 - C2',
                  count: IRREGULAR_VERBS.length,
                  desc: 'Colección completa de verbos',
                },
                {
                  id: 'basic',
                  label: 'Básico (A1-A2)',
                  sub: 'Esenciales',
                  count: IRREGULAR_VERBS.filter((v) => v.level === 'A1' || v.level === 'A2').length,
                  desc: 'be, have, go, make, see, write...',
                },
                {
                  id: 'intermediate',
                  label: 'Intermedio (B1-B2)',
                  sub: 'Frecuentes',
                  count: IRREGULAR_VERBS.filter((v) => v.level === 'B1' || v.level === 'B2').length,
                  desc: 'arise, fight, freeze, rise, shake...',
                },
                {
                  id: 'advanced',
                  label: 'Avanzado (C1-C2)',
                  sub: 'Maestría',
                  count: IRREGULAR_VERBS.filter((v) => v.level === 'C1' || v.level === 'C2').length,
                  desc: 'cling, flee, grind, stride, strive...',
                },
              ].map((lvl) => {
                const active = selectedLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      active
                        ? 'bg-gradient-to-br from-purple-700/80 to-indigo-700/80 border-purple-500 text-white shadow-lg shadow-purple-900/40 font-bold'
                        : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{lvl.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-semibold">
                          {lvl.count}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${active ? 'text-purple-200' : 'text-slate-400'}`}>
                        {lvl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Questions Selector */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
              2. Cantidad de Verbos en el Test
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: 5, label: '5 Verbos', sub: 'Rápido' },
                { count: 10, label: '10 Verbos', sub: 'Recomendado' },
                { count: 20, label: '20 Verbos', sub: 'Intensivo' },
                { count: -1, label: 'Todos', sub: 'Completo' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setQuestionCount(opt.count)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    questionCount === opt.count
                      ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-900/40'
                      : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-2 text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={15} className="text-amber-400" />
              <span>Cómo funciona el test de verbos irregulares:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px] leading-relaxed">
              <li>Te mostraremos el <strong>Infinitivo (V1)</strong> en inglés con su traducción y pronunciación de audio.</li>
              <li>Escribe el <strong>Pasado Simple (V2)</strong> (ej: <em>broke</em> para <em>break</em>).</li>
              <li>Escribe el <strong>Participio Pasado (V3)</strong> (ej: <em>broken</em> para <em>break</em>).</li>
              <li>Se aceptan formas variantes válidas (ej: <em>was / were</em> o <em>got / gotten</em>) y tolerancia a pequeñas erratas tipográficas.</li>
              <li>Al finalizar, obtendrás tu puntuación sobre 10 con la opción de escuchar la pronunciación completa de cada forma.</li>
            </ul>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToVocabulary}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-all text-center"
              >
                Volver a la Biblioteca
              </button>
              {onOpenResultsModal && (
                <button
                  type="button"
                  onClick={onOpenResultsModal}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-bold text-amber-300 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trophy size={14} className="text-amber-400" />
                  <span>Ver resultados</span>
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={availableVerbs.length === 0}
              onClick={() => handleStartTest()}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-extrabold shadow-xl shadow-purple-900/40 border border-purple-500/30 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Zap size={16} className="text-amber-300" />
              <span>Comenzar Test de Verbos</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE TESTING SCREEN */}
      {testState === 'testing' && currentVerb && (
        <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-10 flex flex-col gap-5 sm:gap-6">
          {/* Header with Progress Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40">
                Nivel {currentVerb.level}
              </span>
              <span className="text-slate-400 font-semibold">
                Verbo {currentIdx + 1} de {testVerbs.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setTestState('setup')}
              className="text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Salir del test
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#e62e4c] via-purple-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / testVerbs.length) * 100}%` }}
            />
          </div>

          {/* Verb Question Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 flex flex-col items-center text-center gap-3 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => handleSpeak(currentVerb.infinitive)}
                title="Escuchar pronunciación del infinitivo"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#e62e4c] text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                <Volume2 size={16} />
              </button>
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              Forma Base · Infinitivo (V1)
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentVerb.infinitive}
            </h3>

            {currentVerb.phonetics?.infinitive && (
              <span className="text-xs font-mono text-pink-300 bg-pink-500/10 px-2.5 py-0.5 rounded-md border border-pink-500/20">
                {currentVerb.phonetics.infinitive}
              </span>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold mt-1">
              <span>Español:</span>
              <span className="text-amber-300 font-bold">{currentVerb.translation}</span>
            </div>
          </div>

          {/* Input Fields for Past Simple (V2) & Past Participle (V3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input 1: Pasado Simple (V2) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-extrabold">
                    V2
                  </span>
                  <span>Pasado Simple (Past Simple)</span>
                </label>
                {showHint && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                    Empieza con: {currentVerb.pastSimple.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                ref={pastSimpleInputRef}
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={currentAnswer.pastSimple}
                onChange={(e) => handlePastSimpleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    pastParticipleInputRef.current?.focus();
                  }
                }}
                placeholder="Escribe el Pasado Simple..."
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-base sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Pulsa <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 text-[10px]">Enter</kbd> para pasar al participio
              </p>
            </div>

            {/* Input 2: Participio Pasado (V3) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-extrabold">
                    V3
                  </span>
                  <span>Participio Pasado (Past Participle)</span>
                </label>
                {showHint && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                    Empieza con: {currentVerb.pastParticiple.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                ref={pastParticipleInputRef}
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={currentAnswer.pastParticiple}
                onChange={(e) => handlePastParticipleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentIdx < testVerbs.length - 1) {
                      setCurrentIdx((prev) => prev + 1);
                    } else {
                      handleFinishTest();
                    }
                  }
                }}
                placeholder="Escribe el Participio Pasado..."
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-base sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Pulsa <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 text-[10px]">Enter</kbd> para siguiente pregunta
              </p>
            </div>
          </div>

          {/* Optional Example Sentence or Hint accordion */}
          {currentVerb.exampleEn && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-slate-400 shrink-0" />
                <span>
                  <strong className="text-white">Ejemplo:</strong> {currentVerb.exampleEn}
                  {currentVerb.exampleEs && <span className="text-slate-400 ml-1.5 font-light">({currentVerb.exampleEs})</span>}
                </span>
              </div>
              {!showHint && (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer shrink-0 ml-2"
                >
                  Ver pista
                </button>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 disabled:opacity-30 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={15} />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2">
              {currentIdx < testVerbs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((prev) => prev + 1)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 cursor-pointer flex items-center gap-1.5 transition-all active:scale-[0.99]"
                >
                  <span>Siguiente Verbo</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishTest}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/40 cursor-pointer flex items-center gap-1.5 transition-all active:scale-[0.99]"
                >
                  <Check size={16} />
                  <span>Finalizar y Evaluar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TEST RESULT EVALUATION SCREEN */}
      {testState === 'result' && finalResult && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Main Score Card */}
          <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-900/40 border border-white/10 shrink-0">
                  <Trophy size={32} className="text-amber-300" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Resultado del Test de Verbos Irregulares
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Calificación: {finalResult.gradeLabel}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {finalResult.level} · Completado a las {finalResult.completedAt}
                  </p>
                </div>
              </div>

              {/* Big Score Number */}
              <div className="flex items-center gap-3">
                <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <span className="text-3xl sm:text-4xl font-black text-[#ff4d6d]">
                    {finalResult.scoreOutOfTen}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block">/ 10 pts</span>
                </div>
                <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                    {finalResult.percentage}%
                  </span>
                  <span className="text-xs text-slate-400 font-bold block">Acierto</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="text-lg font-black text-white">
                    {finalResult.fullyCorrectCount} / {finalResult.totalQuestions}
                  </span>
                  <span className="text-[11px] text-slate-400 block">Verbos 100% correctos</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                  <span className="font-extrabold text-xs">V2</span>
                </div>
                <div>
                  <span className="text-lg font-black text-white">
                    {finalResult.pastSimpleCorrectCount} / {finalResult.totalQuestions}
                  </span>
                  <span className="text-[11px] text-slate-400 block">Pasado Simple (V2)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                  <span className="font-extrabold text-xs">V3</span>
                </div>
                <div>
                  <span className="text-lg font-black text-white">
                    {finalResult.pastParticipleCorrectCount} / {finalResult.totalQuestions}
                  </span>
                  <span className="text-[11px] text-slate-400 block">Participio Pasado (V3)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestState('setup')}
                  className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-all"
                >
                  Cambiar Configuración
                </button>
                <button
                  type="button"
                  onClick={onBackToVocabulary}
                  className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-all"
                >
                  Volver a Biblioteca
                </button>
                {onOpenResultsModal && (
                  <button
                    type="button"
                    onClick={onOpenResultsModal}
                    className="px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-bold text-amber-300 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Trophy size={14} className="text-amber-400" />
                    <span>Ver resultados</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {finalResult.fullyCorrectCount < finalResult.totalQuestions && (
                  <button
                    type="button"
                    onClick={handlePracticeMistakes}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer transition-all"
                  >
                    Repasar solo los fallados ({finalResult.totalQuestions - finalResult.fullyCorrectCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartTest()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw size={15} />
                  <span>Repetir Test</span>
                </button>
              </div>
            </div>
          </div>

          {/* Verb by Verb Review List */}
          <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col gap-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-purple-400" />
              <span>Desglose Detallado de Preguntas</span>
            </h3>

            <div className="space-y-3">
              {finalResult.questions.map((q, idx) => {
                const isFullyCorrect = q.isPastSimpleCorrect && q.isPastParticipleCorrect;

                return (
                  <div
                    key={q.verb.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isFullyCorrect
                        ? 'bg-black/30 border-emerald-500/30'
                        : 'bg-black/40 border-rose-500/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Verb & Translation */}
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-extrabold text-white">{q.verb.infinitive}</h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                              {q.verb.level}
                            </span>
                            <span className="text-xs text-slate-400">({q.verb.translation})</span>
                          </div>
                        </div>

                        {/* Pronounce all 3 forms button */}
                        <button
                          type="button"
                          onClick={() => handleSpeakAllForms(q.verb)}
                          title="Escuchar las 3 formas en inglés"
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-[#e62e4c] text-white transition-all cursor-pointer"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>

                      {/* Right: Score */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                            isFullyCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {q.score} / 10 pts
                        </span>
                      </div>
                    </div>

                    {/* V2 and V3 comparison grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-white/10">
                      {/* V2 */}
                      <div className="p-2.5 rounded-xl bg-white/5 text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pasado Simple (V2)
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-mono">
                            Tu respuesta: <strong className="text-white">{q.userPastSimple || '(vacío)'}</strong>
                          </span>
                          {q.isPastSimpleCorrect ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 size={13} />
                              Correcto
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                              <XCircle size={13} />
                              Correcta: <strong className="font-mono text-white">{q.verb.pastSimple}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* V3 */}
                      <div className="p-2.5 rounded-xl bg-white/5 text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Participio Pasado (V3)
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-mono">
                            Tu respuesta: <strong className="text-white">{q.userPastParticiple || '(vacío)'}</strong>
                          </span>
                          {q.isPastParticipleCorrect ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 size={13} />
                              Correcto
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                              <XCircle size={13} />
                              Correcta: <strong className="font-mono text-white">{q.verb.pastParticiple}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
