import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Check,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { WordItem, WordLevel, WordStatus } from '../../types';
import { INITIAL_CATEGORIES, vocabService } from '../../lib/vocabularyStore';
import { autoEnrichWord } from '../../lib/dictionaryService';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Omit<WordItem, 'id'>) => void;
  initialWord?: WordItem | null;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWord,
}) => {
  const [word, setWord] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoEnriched, setAutoEnriched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-filled fields
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [level, setLevel] = useState<WordLevel>('B2');
  const [ipa, setIpa] = useState('');
  const [phoneticGuide, setPhoneticGuide] = useState('');
  const [phoneticNote, setPhoneticNote] = useState('');
  const [translation, setTranslation] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleEs, setExampleEs] = useState('');
  const [status, setStatus] = useState<WordStatus>('nueva');
  const [categoryGroup, setCategoryGroup] = useState('Negocios & Trabajo');
  const [categorySub, setCategorySub] = useState('Reuniones & Negociación');

  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word);
      setPartOfSpeech(initialWord.partOfSpeech);
      setLevel(initialWord.level);
      setIpa(initialWord.ipa);
      setPhoneticGuide(initialWord.phoneticGuide);
      setPhoneticNote(initialWord.phoneticNote || '');
      setTranslation(initialWord.translation);
      setDefinition(initialWord.definition || '');
      setExampleEn(initialWord.exampleEn);
      setExampleEs(initialWord.exampleEs);
      setStatus(initialWord.status);
      setCategoryGroup(initialWord.categoryGroup);
      setCategorySub(initialWord.categorySub);
      setAutoEnriched(true);
    } else {
      setWord('');
      setPartOfSpeech('noun');
      setLevel('B2');
      setIpa('');
      setPhoneticGuide('');
      setPhoneticNote('');
      setTranslation('');
      setDefinition('');
      setExampleEn('');
      setExampleEs('');
      setStatus('nueva');
      setCategoryGroup('Negocios & Trabajo');
      setCategorySub('Reuniones & Negociación');
      setAutoEnriched(false);
      setShowAdvanced(false);
    }
  }, [initialWord, isOpen]);

  // Debounced automatic auto-fill as the user types the English word
  useEffect(() => {
    if (!isOpen || initialWord) return;

    const trimmed = word.trim();
    if (trimmed.length < 2) {
      setAutoEnriched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAuto(true);
      try {
        const enriched = await autoEnrichWord(trimmed);
        setPartOfSpeech(enriched.partOfSpeech);
        setLevel(enriched.level);
        setIpa(enriched.ipa);
        setPhoneticGuide(enriched.phoneticGuide);
        setPhoneticNote(enriched.phoneticNote);
        setTranslation(enriched.translation);
        setDefinition(enriched.definition);
        setExampleEn(enriched.exampleEn);
        setExampleEs(enriched.exampleEs);
        setCategoryGroup(enriched.categoryGroup);
        setCategorySub(enriched.categorySub);
        setAutoEnriched(true);
      } catch (e) {
        console.warn('Auto enrichment error', e);
      } finally {
        setLoadingAuto(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [word, isOpen, initialWord]);

  if (!isOpen) return null;

  const currentCat = INITIAL_CATEGORIES.find((c) => c.name === categoryGroup);
  const subcategories = currentCat?.subcategories || [];

  const handleTestAudio = () => {
    if (word) vocabService.speak(word);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    if (!cleanWord) return;

    onSave({
      word: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1),
      partOfSpeech: partOfSpeech.trim() || 'noun',
      level,
      ipa: ipa.trim() || `/${cleanWord.toLowerCase()}/`,
      phoneticGuide: phoneticGuide.trim() || `"${cleanWord.toLowerCase()}"`,
      phoneticNote: phoneticNote.trim() || 'Pronunciación estándar en inglés',
      translation: translation.trim() || cleanWord,
      definition: definition.trim(),
      exampleEn: exampleEn.trim() || `${cleanWord} is used in professional contexts.`,
      exampleEs: exampleEs.trim() || `Se utiliza en contextos profesionales.`,
      highlightWord: cleanWord.toLowerCase(),
      status,
      isFavorite: initialWord ? initialWord.isFavorite : false,
      categoryGroup,
      categorySub,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none text-white">
      <div className="w-full max-w-xl bg-[#1c162e] rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#140f21] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e62e4c] text-white flex items-center justify-center font-bold shadow-md shadow-[#e62e4c]/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{initialWord ? 'Editar Palabra' : 'Añadir Palabra en Inglés'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 bg-[#e62e4c]/20 border border-[#e62e4c]/30 px-2 py-0.5 rounded-full">
                  Auto-Completado Mágico ✨
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Solo escribe la palabra en inglés; el IPA, traducción y ejemplos se generan solos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Main English Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wide">
              Escribe la palabra en inglés *
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="ej. Stakeholder, Resilience, Insight, Overcome..."
                className="w-full h-13 pl-4 pr-24 rounded-2xl bg-black/50 border border-white/20 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] transition-all shadow-inner"
                required
                autoFocus
              />

              {/* Right status icon inside input: Spinner / Audio / Sparkles */}
              <div className="absolute right-3 flex items-center gap-1.5">
                {loadingAuto ? (
                  <span className="flex items-center gap-1 text-[11px] text-pink-300 bg-[#e62e4c]/20 px-2 py-1 rounded-lg border border-[#e62e4c]/30 animate-pulse">
                    <Loader2 size={13} className="animate-spin text-[#ff4d6d]" />
                    <span>Analizando...</span>
                  </span>
                ) : word.trim() ? (
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="p-2 rounded-xl bg-[#e62e4c]/20 hover:bg-[#e62e4c]/30 text-[#ff4d6d] border border-[#e62e4c]/30 cursor-pointer transition-all shadow-sm"
                    title="Escuchar pronunciación"
                  >
                    <Volume2 size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Real-Time Auto-Generated Preview Card */}
          {autoEnriched && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#241a3a] to-[#1a142b] border border-[#e62e4c]/30 shadow-lg space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">{word}</span>
                  <span className="text-xs italic text-slate-400 font-medium">({partOfSpeech})</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e62e4c]/20 text-pink-300 border border-[#e62e4c]/40">
                    {level}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <CheckCircle2 size={14} />
                  <span>Campos listos</span>
                </div>
              </div>

              {/* Fonética & Traducción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Fonética IPA & Guía
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-[#ff758c] font-bold text-sm">{ipa}</span>
                    <span className="text-slate-300 text-xs">{phoneticGuide}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Traducción al español
                  </span>
                  <span className="font-bold text-white text-sm mt-0.5 block">{translation}</span>
                </div>
              </div>

              {/* Bilingual Example sentence */}
              <div className="pt-1 text-xs space-y-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <span>Frase de ejemplo con la palabra</span>
                  <span className="text-[#ff758c] font-black underline">{word}</span>
                </span>
                <p className="text-slate-200 font-medium leading-relaxed italic bg-black/30 p-2.5 rounded-xl border border-white/10">
                  "{exampleEn.split(new RegExp(`(${word})`, 'gi')).map((part, i) =>
                    part.toLowerCase() === word.toLowerCase() ? (
                      <strong key={i} className="text-[#ff758c] font-black not-italic underline decoration-2 underline-offset-2">
                        {part}
                      </strong>
                    ) : (
                      part
                    )
                  )}"
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed pl-1">
                  "{exampleEs}"
                </p>
              </div>

              {/* Category indicator */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Temario: <strong className="text-white">{categoryGroup}</strong> / {categorySub}
                </span>
                <button
                  type="button"
                  onClick={handleTestAudio}
                  className="text-[#ff758c] hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Volume2 size={13} />
                  <span>Probar voz</span>
                </button>
              </div>
            </div>
          )}

          {/* Optional Collapsible Accordion to manually adjust fields if desired */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer select-none"
            >
              <span>{showAdvanced ? 'Ocultar campos avanzados' : 'Personalizar campos generados (opcional)'}</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Fonética IPA
                    </label>
                    <input
                      type="text"
                      value={ipa}
                      onChange={(e) => setIpa(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs font-mono text-[#ff758c] focus:outline-none focus:border-[#e62e4c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Pronunciación aproximada
                    </label>
                    <input
                      type="text"
                      value={phoneticGuide}
                      onChange={(e) => setPhoneticGuide(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#e62e4c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Traducción (Español)
                    </label>
                    <input
                      type="text"
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-bold focus:outline-none focus:border-[#e62e4c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Nivel CEFR
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as WordLevel)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
                    >
                      <option value="A1" className="bg-[#1c162e]">A1 - Principiante</option>
                      <option value="A2" className="bg-[#1c162e]">A2 - Básico</option>
                      <option value="B1" className="bg-[#1c162e]">B1 - Intermedio</option>
                      <option value="B2" className="bg-[#1c162e]">B2 - Intermedio Alto</option>
                      <option value="C1" className="bg-[#1c162e]">C1 - Avanzado</option>
                      <option value="C2" className="bg-[#1c162e]">C2 - Dominio Nativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Frase de ejemplo en inglés
                  </label>
                  <textarea
                    value={exampleEn}
                    onChange={(e) => setExampleEn(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#e62e4c] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Traducción de la frase
                  </label>
                  <textarea
                    value={exampleEs}
                    onChange={(e) => setExampleEs(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#e62e4c] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Temario de estudio
                    </label>
                    <select
                      value={categoryGroup}
                      onChange={(e) => {
                        setCategoryGroup(e.target.value);
                        const found = INITIAL_CATEGORIES.find((c) => c.name === e.target.value);
                        if (found && found.subcategories?.[0]) {
                          setCategorySub(found.subcategories[0].name);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {INITIAL_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name} className="bg-[#1c162e]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Subcategoría
                    </label>
                    <select
                      value={categorySub}
                      onChange={(e) => setCategorySub(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {subcategories.map((sub) => (
                        <option key={sub.id} value={sub.name} className="bg-[#1c162e]">
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!word.trim() || loadingAuto}
              className="px-6 py-2.5 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-xs font-bold text-white shadow-lg shadow-[#e62e4c]/30 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all active:scale-[0.99]"
            >
              <Check size={15} />
              <span>{initialWord ? 'Guardar Cambios' : 'Añadir Palabra a la Biblioteca'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
