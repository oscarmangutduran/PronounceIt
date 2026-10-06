import React, { useState, useMemo, useEffect } from 'react';
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
  Check,
  BookOpen,
  Trophy,
  Star,
  Sliders,
  Zap,
} from 'lucide-react';
import { WordItem, WordLevel, TestQuestion, TestResult } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { IrregularVerbsTestView } from './IrregularVerbsTestView';
import { testHistoryService, StoredTestItem } from '../../lib/testHistoryStore';
import { TestResultsModal } from './TestResultsModal';

interface TestViewProps {
  words: WordItem[];
  onBackToVocabulary: () => void;
}

// Levenshtein distance helper to recognize minor typos
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

// Check if a sentence contains the target word (or simple inflections)
function sentenceContainsWord(sentence: string, word: string): boolean {
  if (!sentence || !word) return false;
  const cleanWord = word.trim().toLowerCase();
  const cleanSentence = sentence.toLowerCase();

  // Exact word boundary regex
  const regex = new RegExp(`\\b${cleanWord}(s|ed|ing|d|es)?\\b`, 'i');
  return regex.test(cleanSentence) || cleanSentence.includes(cleanWord);
}

export const TestView: React.FC<TestViewProps> = ({ words, onBackToVocabulary }) => {
  // Test category selection: 'vocabulary' | 'irregular_verbs'
  const [testType, setTestType] = useState<'vocabulary' | 'irregular_verbs'>('vocabulary');
  const [irregularTestState, setIrregularTestState] = useState<'setup' | 'testing' | 'result'>('setup');

  // Results History Modal state
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [testHistory, setTestHistory] = useState<StoredTestItem[]>(() => testHistoryService.getHistory());

  useEffect(() => {
    const unsub = testHistoryService.subscribe(() => {
      setTestHistory(testHistoryService.getHistory());
    });
    return unsub;
  }, []);

  // Setup options
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Test state: 'setup' | 'testing' | 'result'
  const [testState, setTestState] = useState<'setup' | 'testing' | 'result'>('setup');
  const [testWords, setTestWords] = useState<WordItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // User input answers for current test
  const [userAnswers, setUserAnswers] = useState<{ word: string; sentence: string }[]>([]);

  // Final evaluation result
  const [finalResult, setFinalResult] = useState<TestResult | null>(null);

  // Filter words available for test according to chosen level
  const availableWordsForLevel = useMemo(() => {
    if (selectedLevel === 'all') return words;
    return words.filter((w) => w.level === selectedLevel);
  }, [words, selectedLevel]);

  // Start the test
  const handleStartTest = () => {
    const list = availableWordsForLevel.length > 0 ? availableWordsForLevel : words;
    // Shuffle words randomly
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    const count = questionCount === -1 ? shuffled.length : Math.min(questionCount, shuffled.length);
    const chosen = shuffled.slice(0, count);

    setTestWords(chosen);
    setUserAnswers(chosen.map(() => ({ word: '', sentence: '' })));
    setCurrentIdx(0);
    setFinalResult(null);
    setTestState('testing');
  };

  // Update current question inputs
  const handleWordInput = (val: string) => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], word: val };
      return copy;
    });
  };

  const handleSentenceInput = (val: string) => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], sentence: val };
      return copy;
    });
  };

  // Current question data
  const currentWordItem = testWords[currentIdx];
  const currentAnswer = userAnswers[currentIdx] || { word: '', sentence: '' };
  const hasWordInSentence = sentenceContainsWord(currentAnswer.sentence, currentAnswer.word || currentWordItem?.word || '');

  // Finish test and calculate grade
  const handleFinishTest = () => {
    let totalScoreSum = 0;
    let correctWordsCount = 0;
    let validSentencesCount = 0;

    const evaluatedQuestions: TestQuestion[] = testWords.map((item, idx) => {
      const ans = userAnswers[idx] || { word: '', sentence: '' };
      const cleanUserWord = ans.word.trim().toLowerCase();
      const cleanTargetWord = item.word.trim().toLowerCase();

      // 1. Evaluate Word Translation (0 to 5 points)
      let wordScore = 0;
      let isWordCorrect = false;

      if (cleanUserWord === cleanTargetWord) {
        wordScore = 5.0;
        isWordCorrect = true;
        correctWordsCount++;
      } else if (cleanUserWord.length > 3 && levenshteinDistance(cleanUserWord, cleanTargetWord) <= 1) {
        wordScore = 4.0;
        isWordCorrect = true;
        correctWordsCount++;
      }

      // 2. Evaluate Sentence in English containing the word (0 to 5 points)
      let sentenceScore = 0;
      let isSentenceValid = false;

      const sentenceWords = ans.sentence.trim().split(/\s+/).filter(Boolean);
      const containsTarget = sentenceContainsWord(ans.sentence, cleanTargetWord) || sentenceContainsWord(ans.sentence, cleanUserWord);

      if (containsTarget) {
        if (sentenceWords.length >= 4) {
          sentenceScore = 5.0;
          isSentenceValid = true;
          validSentencesCount++;
        } else if (sentenceWords.length >= 2) {
          sentenceScore = 3.5;
          isSentenceValid = true;
          validSentencesCount++;
        }
      } else if (ans.sentence.trim().length > 0) {
        // Effort point if sentence was written but word was omitted
        sentenceScore = 1.0;
      }

      const totalQuestionScore = wordScore + sentenceScore;
      totalScoreSum += totalQuestionScore;

      let feedback = '';
      if (wordScore === 5 && sentenceScore === 5) {
        feedback = '¡Perfecto! Palabra exacta y oración contextual válida.';
      } else if (!isWordCorrect && isSentenceValid) {
        feedback = `La palabra correcta era "${item.word}", pero redactaste una buena oración.`;
      } else if (isWordCorrect && !isSentenceValid) {
        feedback = 'Tradujiste bien la palabra, pero la oración no la incluía claramente o era demasiado breve.';
      } else {
        feedback = `La traducción esperada era "${item.word}".`;
      }

      return {
        wordItem: item,
        userWord: ans.word,
        userSentence: ans.sentence,
        isWordCorrect,
        isSentenceValid,
        wordScore,
        sentenceScore,
        totalQuestionScore,
        feedback,
      };
    });

    // Score out of 10
    const rawAverage = testWords.length > 0 ? totalScoreSum / testWords.length : 0;
    const scoreOutOfTen = Math.round(rawAverage * 10) / 10;
    const percentage = Math.round((scoreOutOfTen / 10) * 100);

    let gradeLabel = 'Sobresaliente';
    if (scoreOutOfTen >= 9.0) gradeLabel = 'Sobresaliente 🏆';
    else if (scoreOutOfTen >= 7.0) gradeLabel = 'Notable 🌟';
    else if (scoreOutOfTen >= 5.0) gradeLabel = 'Aprobado 👍';
    else gradeLabel = 'Necesita Repasar 📚';

    const result: TestResult = {
      level: selectedLevel === 'all' ? 'Todos los niveles' : selectedLevel,
      totalQuestions: testWords.length,
      scoreOutOfTen,
      percentage,
      gradeLabel,
      correctWordsCount,
      validSentencesCount,
      questions: evaluatedQuestions,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setFinalResult(result);
    setTestState('result');

    // Save completed test to history
    testHistoryService.addTest({
      type: 'vocabulary',
      title: 'Test de Vocabulario y Oraciones',
      level: selectedLevel === 'all' ? 'Todos los niveles' : `Nivel ${selectedLevel}`,
      scoreOutOfTen,
      percentage,
      gradeLabel,
      totalQuestions: testWords.length,
      correctCount: correctWordsCount,
      completedAt: `Hoy, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      vocabularyQuestions: evaluatedQuestions,
    });
  };

  const handleSpeak = (text: string) => {
    vocabService.speak(text);
  };

  const isTestingActive =
    (testType === 'vocabulary' && testState === 'testing') ||
    (testType === 'irregular_verbs' && irregularTestState === 'testing');

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 select-none animate-fadeIn text-white">
      {/* Test Mode Selector Tabs & "Ver resultados" Button */}
      {!isTestingActive && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 p-1.5 bg-[#120d1e] rounded-2xl border border-white/10 gap-2 shadow-xl">
            <button
              type="button"
              onClick={() => setTestType('vocabulary')}
              className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                testType === 'vocabulary'
                  ? 'bg-gradient-to-r from-[#e62e4c] to-[#ff4d6d] text-white shadow-lg shadow-[#e62e4c]/30 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen size={17} />
              <span>Test de Vocabulario</span>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 font-medium">
                Oraciones & Retención
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTestType('irregular_verbs')}
              className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                testType === 'irregular_verbs'
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg shadow-purple-900/40 border border-purple-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap size={17} className="text-amber-300" />
              <span>Test de Verbos Irregulares</span>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                V1 · V2 · V3
              </span>
            </button>
          </div>

          {/* "Ver resultados" Button */}
          <button
            type="button"
            onClick={() => setIsResultsModalOpen(true)}
            className="px-4 py-2.5 sm:py-3 rounded-2xl bg-[#181226]/90 hover:bg-[#231a38] border border-white/15 hover:border-amber-400/50 text-slate-200 hover:text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95 shrink-0"
          >
            <Trophy size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Ver resultados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-amber-300 font-extrabold">
              {testHistory.length}
            </span>
          </button>
        </div>
      )}

      {testType === 'irregular_verbs' ? (
        <IrregularVerbsTestView
          onBackToVocabulary={onBackToVocabulary}
          onStateChange={setIrregularTestState}
          onOpenResultsModal={() => setIsResultsModalOpen(true)}
        />
      ) : (
        <>
          {/* 1. SETUP SCREEN: Select level and start test */}
          {testState === 'setup' && (
        <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#e62e4c] flex items-center justify-center text-white shadow-lg shadow-[#e62e4c]/30">
              <Award size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Evaluación y Test de Vocabulario</h2>
              <p className="text-xs text-slate-400">
                Pon a prueba tu retención: escribe la traducción en inglés y formula una oración con cada palabra.
              </p>
            </div>
          </div>

          {/* Level Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
              1. Selecciona el Nivel de Dificultad (CEFR)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'all', label: 'Todos (A1-C2)' },
                { id: 'A1', label: 'Nivel A1' },
                { id: 'A2', label: 'Nivel A2' },
                { id: 'B1', label: 'Nivel B1' },
                { id: 'B2', label: 'Nivel B2' },
                { id: 'C1', label: 'Nivel C1' },
                { id: 'C2', label: 'Nivel C2' },
              ].map((lvl) => {
                const count = lvl.id === 'all' ? words.length : words.filter((w) => w.level === lvl.id).length;
                const active = selectedLevel === lvl.id;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#e62e4c] border-[#e62e4c] text-white shadow-lg shadow-[#e62e4c]/30 font-bold'
                        : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <span className="block text-xs font-bold">{lvl.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${active ? 'text-white/80' : 'text-slate-500'}`}>
                      {count} palabras disponibles
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions Count Selector */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
              2. Cantidad de Preguntas en el Test
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { count: 5, label: '5 Preguntas (Test Express)' },
                { count: 10, label: '10 Preguntas (Completo)' },
                { count: -1, label: 'Todas las disponibles' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setQuestionCount(opt.count)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    questionCount === opt.count
                      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-lg shadow-purple-900/30'
                      : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Test Instructions Card */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-2 text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={15} className="text-[#ff4d6d]" />
              <span>Instrucciones de la evaluación:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px] leading-relaxed">
              <li>Te mostraremos el término en español con su contexto o definición.</li>
              <li>Escribe la <strong>traducción correcta en inglés</strong> (50% de la nota de cada pregunta).</li>
              <li>Redacta una <strong>oración en inglés que use esa palabra</strong> (50% de la nota de cada pregunta).</li>
              <li>Al finalizar todas las preguntas, el evaluador calculará tu <strong>nota final del 1 al 10</strong> con desglose detallado.</li>
            </ul>
          </div>

          {/* Start Test Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToVocabulary}
                className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-all"
              >
                Volver a la Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setIsResultsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-bold text-amber-300 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Trophy size={14} className="text-amber-400" />
                <span>Ver resultados</span>
              </button>
            </div>

            <button
              type="button"
              disabled={availableWordsForLevel.length === 0}
              onClick={handleStartTest}
              className="px-7 py-3 rounded-2xl bg-[#e62e4c] hover:bg-[#ff3b59] text-white text-xs font-extrabold shadow-xl shadow-[#e62e4c]/30 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all active:scale-[0.99]"
            >
              <Sparkles size={16} />
              <span>Comenzar Test Ahora</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE TESTING SCREEN */}
      {testState === 'testing' && currentWordItem && (
        <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col gap-6">
          {/* Top Progress Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#e62e4c]/20 text-pink-300 border border-[#e62e4c]/30">
                Pregunta {currentIdx + 1} de {testWords.length}
              </span>
              <span className="text-slate-400 font-medium">Nivel: {currentWordItem.level}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300">
                {Math.round(((currentIdx + 1) / testWords.length) * 100)}%
              </span>
              <div className="w-28 h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#e62e4c] to-purple-500 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / testWords.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Prompt Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#241a3a] to-[#1a142b] border border-[#e62e4c]/30 shadow-lg text-center space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-pink-300 block">
              Término en español a traducir:
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              {currentWordItem.translation}
            </h3>
            {currentWordItem.definition && (
              <p className="text-xs text-slate-300 max-w-lg mx-auto font-medium">
                Contexto: {currentWordItem.definition}
              </p>
            )}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                Temario: {currentWordItem.categoryGroup} ({currentWordItem.partOfSpeech})
              </span>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            {/* Input 1: English Translation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-300 tracking-wide">
                1. Escribe la traducción en inglés *
              </label>
              <input
                type="text"
                value={currentAnswer.word}
                onChange={(e) => handleWordInput(e.target.value)}
                placeholder="Escribe la palabra o término en inglés..."
                className="w-full h-12 px-4 rounded-xl bg-black/50 border border-white/20 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c]"
                autoFocus
              />
            </div>

            {/* Input 2: Sentence in English containing the word */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-slate-300 tracking-wide">
                  2. Escribe una oración en inglés con esa palabra *
                </label>
                {/* Live validation indicator */}
                {currentAnswer.sentence.trim() && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      hasWordInSentence
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {hasWordInSentence ? <Check size={11} /> : <AlertCircle size={11} />}
                    <span>{hasWordInSentence ? 'Palabra incluida en la oración' : 'Falta incluir la palabra'}</span>
                  </span>
                )}
              </div>
              <textarea
                value={currentAnswer.sentence}
                onChange={(e) => handleSentenceInput(e.target.value)}
                rows={3}
                placeholder="Ejemplo: We achieved a major breakthrough in the negotiations..."
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/20 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Anterior</span>
            </button>

            {currentIdx < testWords.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.min(testWords.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-900/30 transition-all"
              >
                <span>Siguiente Pregunta</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishTest}
                className="px-6 py-2.5 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#e62e4c]/30 transition-all active:scale-[0.99]"
              >
                <Trophy size={16} />
                <span>Finalizar y Obtener Mi Nota</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. FINAL RESULTS SCREEN: NOTA DEL TEST & CORRECCIÓN */}
      {testState === 'result' && finalResult && (
        <div className="bg-[#181226]/85 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col gap-8 animate-fadeIn">
          {/* Header Score Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-[#2d173e] via-[#1d1430] to-[#171026] border border-[#e62e4c]/40 text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#e62e4c] to-amber-400 p-1 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#181226] flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{finalResult.scoreOutOfTen}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">de 10</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-[#ff758c] font-black block">
                Calificación Final
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {finalResult.gradeLabel}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Has obtenido un <strong>{finalResult.percentage}%</strong> de acierto en el test de{' '}
                <span className="text-pink-300 font-bold">{finalResult.level}</span>.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-slate-400 block text-[10px]">Traducciones acertadas</span>
                <span className="font-extrabold text-white text-base">
                  {finalResult.correctWordsCount} / {finalResult.totalQuestions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-slate-400 block text-[10px]">Oraciones válidas</span>
                <span className="font-extrabold text-emerald-400 text-base">
                  {finalResult.validSentencesCount} / {finalResult.totalQuestions}
                </span>
              </div>
            </div>
          </div>

          {/* Question-by-Question Detailed Review */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#ff4d6d]" />
              <span>Desglose y Corrección por Pregunta:</span>
            </h3>

            <div className="space-y-3">
              {finalResult.questions.map((q, idx) => {
                const isFullMarks = q.totalQuestionScore >= 9.0;
                const isPassed = q.totalQuestionScore >= 5.0;

                return (
                  <div
                    key={idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isFullMarks
                        ? 'bg-black/40 border-emerald-500/30'
                        : isPassed
                        ? 'bg-black/40 border-amber-500/30'
                        : 'bg-black/40 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Pregunta {idx + 1}:</span>
                          <span className="font-extrabold text-white text-sm">{q.wordItem.translation}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#e62e4c]/20 text-pink-300">
                            {q.wordItem.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{q.feedback}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                            isFullMarks
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                              : isPassed
                              ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                              : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                          }`}
                        >
                          {q.totalQuestionScore} / 10
                        </span>
                      </div>
                    </div>

                    {/* Word comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tu respuesta (Palabra):</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${q.isWordCorrect ? 'text-emerald-400' : 'text-rose-400 line-through'}`}>
                            {q.userWord || '(Vacío)'}
                          </span>
                          {q.isWordCorrect ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <XCircle size={14} className="text-rose-400" />
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Traducción oficial esperada:</span>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-white">{q.wordItem.word}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[#ff758c] text-[11px]">{q.wordItem.ipa}</span>
                            <button
                              type="button"
                              onClick={() => handleSpeak(q.wordItem.word)}
                              className="text-pink-300 hover:text-white cursor-pointer"
                              title="Escuchar pronunciación"
                            >
                              <Volume2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sentence comparison */}
                    <div className="pt-2 text-xs space-y-1.5">
                      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                          <span>Tu oración redactada:</span>
                          <span className={q.isSentenceValid ? 'text-emerald-400' : 'text-amber-400'}>
                            {q.isSentenceValid ? '✓ Oración válida' : '⚠ Falta o incompleta'}
                          </span>
                        </span>
                        <p className="text-slate-200 italic">"{q.userSentence || '(No se proporcionó oración)'}"</p>
                      </div>

                      {/* Model Sentence suggestion */}
                      <div className="p-3 rounded-xl bg-[#241a3a]/60 border border-[#e62e4c]/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-pink-300 block">
                          Frase modelo recomendada:
                        </span>
                        <p className="text-slate-200 font-medium">"{q.wordItem.exampleEn}"</p>
                        <p className="text-slate-400 text-[11px]">"{q.wordItem.exampleEs}"</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons at bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToVocabulary}
                className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-all"
              >
                Volver a Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setIsResultsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-bold text-amber-300 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Trophy size={14} className="text-amber-400" />
                <span>Ver resultados</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTestState('setup')}
                className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw size={14} />
                <span>Hacer Otro Test</span>
              </button>
              <button
                type="button"
                onClick={handleStartTest}
                className="px-6 py-2.5 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-extrabold text-white flex items-center gap-2 cursor-pointer shadow-lg shadow-[#e62e4c]/30 transition-all active:scale-[0.99]"
              >
                <span>Repetir este Nivel</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}

  {/* Modal de Resultados y Tests Realizados */}
  <TestResultsModal
    isOpen={isResultsModalOpen}
    onClose={() => setIsResultsModalOpen(false)}
    history={testHistory}
  />
</div>
  );
};
