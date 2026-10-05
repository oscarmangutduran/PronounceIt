import React, { useState } from 'react';
import {
  Volume2,
  RotateCw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  Award,
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
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-slate-600 font-semibold mb-4">No hay palabras disponibles para practicar.</p>
        <button
          type="button"
          onClick={onBackToVocabulary}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Volver a Biblioteca
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / practiceList.length) * 100);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToVocabulary}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Volver a la Biblioteca</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">
            Tarjeta {currentIndex + 1} de {practiceList.length}
          </span>
          <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flip Flashcard Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[380px] bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12 flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition-all relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {currentWord.categorySub || currentWord.categoryGroup} · {currentWord.level}
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
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
                className="w-14 h-14 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
                title="Escuchar audio"
              >
                <Volume2 size={26} />
              </button>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {currentWord.word}
              </h2>
              <span className="text-xs italic text-slate-400 font-medium block mt-1">
                {currentWord.partOfSpeech}
              </span>
            </div>

            <div className="space-y-1">
              <p className="font-mono text-base font-bold text-indigo-600 tracking-wider">
                {currentWord.ipa}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Guía fonética: <strong className="text-slate-700">{currentWord.phoneticGuide}</strong>
              </p>
              {currentWord.phoneticNote && (
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">{currentWord.phoneticNote}</p>
              )}
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                Toca para ver la traducción y el significado
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {currentWord.translation}
              </h2>
              {currentWord.definition && (
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto font-medium">
                  {currentWord.definition}
                </p>
              )}
            </div>

            {/* Bilingual Example */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left max-w-lg mx-auto space-y-1.5">
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                "{currentWord.exampleEn}"
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                "{currentWord.exampleEs}"
              </p>
            </div>
          </div>
        )}

        {/* Card Footer: Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
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
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
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
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <span>Siguiente</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* SRS Rating Evaluation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">
          ¿Cómo recuerdas la pronunciación de esta palabra?
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Difícil */}
          <button
            type="button"
            onClick={() => handleRate('en_repaso')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
          >
            🔴 Difícil (Repasar)
          </button>

          {/* Bien */}
          <button
            type="button"
            onClick={() => handleRate('en_repaso')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-all cursor-pointer"
          >
            🟠 Bien (Consolidar)
          </button>

          {/* Fácil / Dominada */}
          <button
            type="button"
            onClick={() => handleRate('dominada')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-all cursor-pointer"
          >
            🟢 Fácil (Dominada)
          </button>
        </div>
      </div>
    </div>
  );
};
