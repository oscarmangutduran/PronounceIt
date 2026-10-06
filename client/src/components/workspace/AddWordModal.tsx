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
  Folder,
  Plus,
} from 'lucide-react';
import { WordItem, WordLevel, WordStatus, CategoryItem } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { autoEnrichWord } from '../../lib/dictionaryService';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Omit<WordItem, 'id'>) => void;
  initialWord?: WordItem | null;
  categories?: CategoryItem[];
  defaultCategoryGroup?: string;
  defaultCategorySub?: string;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWord,
  categories,
  defaultCategoryGroup,
  defaultCategorySub,
}) => {
  const [word, setWord] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoEnriched, setAutoEnriched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-filled and user-editable fields
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

  // Categories management
  const availableCategories = categories && categories.length > 0 ? categories : vocabService.getCategories();
  const [categoryGroup, setCategoryGroup] = useState<string>('Grammar');
  const [categorySub, setCategorySub] = useState<string>('General');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [isCustomSubcategory, setIsCustomSubcategory] = useState<boolean>(false);
  const [customSubcategoryName, setCustomSubcategoryName] = useState<string>('');
  const [hasUserCustomizedCategory, setHasUserCustomizedCategory] = useState<boolean>(false);

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
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setIsCustomSubcategory(false);
      setCustomSubcategoryName('');
      setHasUserCustomizedCategory(true);
      setAutoEnriched(true);
      setShowAdvanced(false);
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

      const initialGroup = defaultCategoryGroup || availableCategories[0]?.name || 'Grammar';
      const foundCat = availableCategories.find((c) => c.name === initialGroup) || availableCategories[0];
      const initialSub = defaultCategorySub || foundCat?.subcategories?.[0]?.name || 'General';

      setCategoryGroup(initialGroup);
      setCategorySub(initialSub);
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setIsCustomSubcategory(false);
      setCustomSubcategoryName('');
      setHasUserCustomizedCategory(Boolean(defaultCategoryGroup));
      setAutoEnriched(false);
      setShowAdvanced(false);
    }
  }, [initialWord, isOpen, defaultCategoryGroup, defaultCategorySub]);

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

        // Only assign suggested category if user hasn't explicitly specified or selected one
        if (!hasUserCustomizedCategory && !isCustomCategory && !isCustomSubcategory) {
          const matchCat = availableCategories.find((c) => c.name.toLowerCase() === enriched.categoryGroup.toLowerCase());
          if (matchCat) {
            setCategoryGroup(matchCat.name);
            const matchSub = matchCat.subcategories?.find((s) => s.name.toLowerCase() === enriched.categorySub.toLowerCase());
            if (matchSub) {
              setCategorySub(matchSub.name);
            } else if (matchCat.subcategories?.[0]) {
              setCategorySub(matchCat.subcategories[0].name);
            }
          }
        }
        setAutoEnriched(true);
      } catch (e) {
        console.warn('Auto enrichment error', e);
      } finally {
        setLoadingAuto(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [word, isOpen, initialWord, hasUserCustomizedCategory, isCustomCategory, isCustomSubcategory, availableCategories]);

  if (!isOpen) return null;

  const currentCat = availableCategories.find((c) => c.name === categoryGroup);
  const currentSubcategories = currentCat?.subcategories || [];

  const handleTestAudio = () => {
    if (word) vocabService.speak(word);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    if (!cleanWord) return;

    const finalCategoryGroup = isCustomCategory ? customCategoryName.trim() : categoryGroup.trim();
    const finalCategorySub = (isCustomCategory || isCustomSubcategory) ? customSubcategoryName.trim() : categorySub.trim();

    if (!finalCategoryGroup) {
      alert('Por favor, selecciona o escribe la categoría principal.');
      return;
    }

    if (!finalCategorySub) {
      alert('Por favor, selecciona o escribe la subcategoría.');
      return;
    }

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
      categoryGroup: finalCategoryGroup,
      categorySub: finalCategorySub,
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
                <span>{initialWord ? 'Editar Palabra' : 'Añadir Palabra'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 bg-[#e62e4c]/20 border border-[#e62e4c]/30 px-2 py-0.5 rounded-full">
                  Auto-Completado Mágico ✨
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Escribe la palabra, asigna su categoría y subcategoría, y la fonética se generará sola.
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Main English Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wide">
              Palabra en inglés *
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="ej. Stakeholder, Resilience, Breakthrough, Overcome..."
                className="w-full h-12 pl-4 pr-24 rounded-2xl bg-black/50 border border-white/20 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] transition-all shadow-inner"
                required
                autoFocus
              />

              {/* Status / Audio Test button */}
              <div className="absolute right-3 flex items-center gap-1.5">
                {loadingAuto ? (
                  <span className="flex items-center gap-1 text-[11px] text-pink-300 bg-[#e62e4c]/20 px-2 py-1 rounded-lg border border-[#e62e4c]/30 animate-pulse">
                    <Loader2 size={13} className="animate-spin text-[#ff4d6d]" />
                    <span>Auto...</span>
                  </span>
                ) : word.trim() ? (
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="p-1.5 rounded-xl bg-[#e62e4c]/20 hover:bg-[#e62e4c]/30 text-[#ff4d6d] border border-[#e62e4c]/30 cursor-pointer transition-all shadow-sm"
                    title="Escuchar pronunciación"
                  >
                    <Volume2 size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Traducción al español (Editable directamente) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-slate-300 tracking-wide">
              Traducción al español *
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="ej. Avance decisivo, Parte interesada, Resiliencia..."
              className="w-full px-4 py-2.5 rounded-2xl bg-black/40 border border-white/15 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c] transition-all"
              required
            />
          </div>

          {/* SECCIÓN OBLIGATORIA: Categoría y Subcategoría */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Folder size={15} className="text-[#ff4d6d]" />
                <span>Categoría y Subcategoría *</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Ubicación en tu biblioteca
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Categoría Principal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase text-slate-300">
                    Categoría Principal *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      setHasUserCustomizedCategory(true);
                      if (!isCustomCategory) {
                        setCustomCategoryName('');
                        setIsCustomSubcategory(true);
                        setCustomSubcategoryName('');
                      }
                    }}
                    className="text-[10px] text-[#ff4d6d] hover:text-pink-300 font-semibold cursor-pointer transition-colors"
                  >
                    {isCustomCategory ? 'Elegir existente' : '+ Crear nueva'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => {
                      setCustomCategoryName(e.target.value);
                      setHasUserCustomizedCategory(true);
                    }}
                    placeholder="Nombre nueva categoría..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-pink-500/50 focus:border-[#e62e4c] text-xs font-semibold text-white placeholder-slate-500 focus:outline-none shadow-sm"
                    required
                  />
                ) : (
                  <select
                    value={categoryGroup}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHasUserCustomizedCategory(true);
                      if (val === '__NEW__') {
                        setIsCustomCategory(true);
                        setCustomCategoryName('');
                        setIsCustomSubcategory(true);
                        setCustomSubcategoryName('');
                      } else {
                        setCategoryGroup(val);
                        const found = availableCategories.find((c) => c.name === val);
                        if (found?.subcategories?.[0]) {
                          setCategorySub(found.subcategories[0].name);
                          setIsCustomSubcategory(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
                    required
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id || c.name} value={c.name} className="bg-[#1c162e]">
                        {c.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="bg-[#1c162e] text-pink-300 font-bold">
                      + Escribir nueva categoría...
                    </option>
                  </select>
                )}
              </div>

              {/* 2. Subcategoría */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase text-slate-300">
                    Subcategoría *
                  </label>
                  {!isCustomCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubcategory(!isCustomSubcategory);
                        setHasUserCustomizedCategory(true);
                        if (!isCustomSubcategory) {
                          setCustomSubcategoryName('');
                        }
                      }}
                      className="text-[10px] text-[#ff4d6d] hover:text-pink-300 font-semibold cursor-pointer transition-colors"
                    >
                      {isCustomSubcategory ? 'Elegir existente' : '+ Crear nueva'}
                    </button>
                  )}
                </div>

                {isCustomSubcategory || isCustomCategory ? (
                  <input
                    type="text"
                    value={customSubcategoryName}
                    onChange={(e) => {
                      setCustomSubcategoryName(e.target.value);
                      setHasUserCustomizedCategory(true);
                    }}
                    placeholder="Nombre subcategoría..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-pink-500/50 focus:border-[#e62e4c] text-xs font-semibold text-white placeholder-slate-500 focus:outline-none shadow-sm"
                    required
                  />
                ) : (
                  <select
                    value={categorySub}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHasUserCustomizedCategory(true);
                      if (val === '__NEW__') {
                        setIsCustomSubcategory(true);
                        setCustomSubcategoryName('');
                      } else {
                        setCategorySub(val);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
                    required
                  >
                    {currentSubcategories.map((sub) => (
                      <option key={sub.id || sub.name} value={sub.name} className="bg-[#1c162e]">
                        {sub.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="bg-[#1c162e] text-pink-300 font-bold">
                      + Escribir nueva subcategoría...
                    </option>
                  </select>
                )}
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

              {/* Fonética IPA */}
              <div className="text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Fonética IPA & Guía
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-[#ff758c] font-bold text-sm">{ipa}</span>
                  <span className="text-slate-300 text-xs">{phoneticGuide}</span>
                </div>
              </div>

              {/* Bilingual Example sentence */}
              {exampleEn && (
                <div className="pt-1 text-xs space-y-1.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <span>Frase de ejemplo con</span>
                    <span className="text-[#ff758c] font-black underline">{word}</span>
                  </span>
                  <p className="text-slate-200 font-medium leading-relaxed italic bg-black/30 p-2.5 rounded-xl border border-white/10">
                    "{exampleEn}"
                  </p>
                  {exampleEs && (
                    <p className="text-slate-400 text-[11px] leading-relaxed pl-1">
                      "{exampleEs}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Optional Collapsible Accordion to manually adjust fields if desired */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer select-none"
            >
              <span>{showAdvanced ? 'Ocultar campos avanzados' : 'Personalizar fonética, nivel y ejemplos (opcional)'}</span>
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
                      Parte de la oración
                    </label>
                    <input
                      type="text"
                      value={partOfSpeech}
                      onChange={(e) => setPartOfSpeech(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#e62e4c]"
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
              <span>{initialWord ? 'Guardar Cambios' : 'Añadir Palabra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
