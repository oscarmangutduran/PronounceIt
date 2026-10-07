import React, { useState } from 'react';
import {
  Volume2,
  RotateCw,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { WordItem, WordStatus } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';

interface FlashcardPracticeViewProps {
  words: WordItem[];
  onBackToVocabulary: () => void;
  onUpdateStatus: (id: string, status: WordStatus) => void;
}

export const FlashcardPracticeView: React.FC<FlashcardPracticeViewProps> = ({
  words,
  onBackToVocabulary,
  onUpdateStatus,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const practiceList = words.length > 0 ? words : vocabService.getWords();
  const currentWord = practiceList[currentIndex % practiceList.length];

  const handleSpeak = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentWord) {
      vocabService.speak(currentWord.word);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % practiceList.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + practiceList.length) % practiceList.length);
  };

  const handleRate = (status: WordStatus) => {
    if (currentWord) {
      onUpdateStatus(currentWord.id, status);
      setReviewedCount((c) => c + 1);
      handleNext();
    }
  };

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#181226]/85 rounded-2xl border border-white/10 shadow-xl text-white">
        <p className="text-slate-300 font-semibold mb-4">No hay palabras disponibles para practicar.</p>
        <button
          type="button"
          onClick={onBackToVocabulary}
          className="px-4 py-2 bg-[#e62e4c] hover:bg-[#ff3b59] text-white rounded-xl text-xs font-bold shadow-md shadow-[#e62e4c]/30"
        >
          Volver a Biblioteca
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / practiceList.length) * 100);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 select-none animate-fadeIn text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToVocabulary}
          className="px-3.5 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Volver a la Biblioteca</span>
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-bold text-slate-300">
            Tarjeta {currentIndex + 1} de {practiceList.length}
          </span>
          <div className="w-28 sm:w-32 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e62e4c] to-amber-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flip Flashcard Card matching dark login style */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[360px] sm:min-h-[400px] bg-gradient-to-b from-[#1b152b] to-[#141021] rounded-3xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 sm:p-12 flex flex-col justify-between cursor-pointer hover:border-[#e62e4c]/50 transition-all relative overflow-hidden group"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#e62e4c]/20 text-pink-300 border border-[#e62e4c]/30">
            {currentWord.categorySub || currentWord.categoryGroup} · {currentWord.level}
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 group-hover:text-pink-300 transition-colors">
            <RotateCw size={12} />
            Haz clic para voltear tarjeta
          </span>
        </div>

        {/* Card Content: Front vs Back */}
        {!isFlipped ? (
          /* FRONT: English Word, Phonetics, Audio */
          <div className="my-auto text-center space-y-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSpeak}
                className="w-16 h-16 rounded-2xl bg-[#e62e4c]/20 hover:bg-[#e62e4c]/30 text-[#ff4d6d] border border-[#e62e4c]/40 flex items-center justify-center shadow-lg shadow-[#e62e4c]/20 cursor-pointer transition-all active:scale-95"
                title="Escuchar audio"
              >
                <Volume2 size={30} />
              </button>
            </div>

            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {currentWord.word}
              </h2>
              <span className="text-xs italic text-slate-400 font-medium block mt-1.5">
                {currentWord.partOfSpeech}
              </span>
            </div>

            <div className="space-y-1">
              <p className="font-mono text-lg font-bold text-[#ff758c] tracking-wider">
                {currentWord.ipa}
              </p>
              <p className="text-xs text-slate-300 font-medium">
                Guía fonética: <strong className="text-white">{currentWord.phoneticGuide}</strong>
              </p>
              {currentWord.phoneticNote && (
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">{currentWord.phoneticNote}</p>
              )}
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-pink-300 bg-[#e62e4c]/10 border border-[#e62e4c]/25 px-3 py-1 rounded-full">
                Toca la tarjeta para ver traducción y frase
              </span>
            </div>
          </div>
        ) : (
          /* BACK: Spanish Translation, Definition, Bilingual Example */
          <div className="my-auto text-center space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Traducción al español
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                {currentWord.translation}
              </h2>
              {currentWord.definition && (
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto font-medium">
                  {currentWord.definition}
                </p>
              )}
            </div>

            {/* Bilingual Example */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-left max-w-lg mx-auto space-y-2">
              <p className="text-xs font-semibold text-white leading-relaxed">
                "{currentWord.exampleEn}"
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                "{currentWord.exampleEs}"
              </p>
            </div>
          </div>
        )}

        {/* Card Footer: Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSpeak();
            }}
            className="text-xs font-semibold text-[#ff758c] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Volume2 size={15} />
            <span>Repetir audio</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <span>Siguiente</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* SRS Rating Evaluation Bar */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-200 text-center sm:text-left">
          ¿Cómo recuerdas la pronunciación de esta palabra?
        </span>

        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
          {/* Difícil */}
          <button
            type="button"
            onClick={() => handleRate('en_repaso')}
            className="px-2.5 sm:px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition-all cursor-pointer shadow-sm text-center"
          >
            <span className="hidden sm:inline">🔴 Difícil (Repasar)</span>
            <span className="sm:hidden">🔴 Difícil</span>
          </button>

          {/* Bien */}
          <button
            type="button"
            onClick={() => handleRate('en_repaso')}
            className="px-2.5 sm:px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all cursor-pointer shadow-sm text-center"
          >
            <span className="hidden sm:inline">🟠 Bien (Consolidar)</span>
            <span className="sm:hidden">🟠 Bien</span>
          </button>

          {/* Fácil / Dominada */}
          <button
            type="button"
            onClick={() => handleRate('dominada')}
            className="px-2.5 sm:px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer shadow-sm text-center"
          >
            <span className="hidden sm:inline">🟢 Fácil (Dominada)</span>
            <span className="sm:hidden">🟢 Fácil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
