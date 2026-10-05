import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, Check } from 'lucide-react';
import { WordItem, WordLevel, WordStatus } from '../../types';
import { INITIAL_CATEGORIES, vocabService } from '../../lib/vocabularyStore';

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
    }
  }, [initialWord, isOpen]);

  if (!isOpen) return null;

  const currentCat = INITIAL_CATEGORIES.find((c) => c.name === categoryGroup);
  const subcategories = currentCat?.subcategories || [];

  const handleTestAudio = () => {
    if (word) vocabService.speak(word);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !translation) return;

    onSave({
      word: word.trim(),
      partOfSpeech: partOfSpeech.trim() || 'noun',
      level,
      ipa: ipa.trim() || `/${word.toLowerCase()}/`,
      phoneticGuide: phoneticGuide.trim() || `"${word.toLowerCase()}"`,
      phoneticNote: phoneticNote.trim(),
      translation: translation.trim(),
      definition: definition.trim(),
      exampleEn: exampleEn.trim() || `${word} is frequently used in professional contexts.`,
      exampleEs: exampleEs.trim() || `Se utiliza con frecuencia en contextos profesionales.`,
      highlightWord: word.toLowerCase(),
      status,
      isFavorite: initialWord ? initialWord.isFavorite : false,
      categoryGroup,
      categorySub,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialWord ? 'Editar Término Léxico' : 'Añadir Nueva Palabra a la Biblioteca'}
              </h3>
              <p className="text-xs text-slate-500">
                Registra la ortografía, fonética IPA, traducción y ejemplos contextuales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Word + Part of Speech + Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Palabra (Inglés) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="ej. Breakthrough"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                  autoFocus
                />
                {word && (
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    title="Probar pronunciación"
                  >
                    <Volume2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Tipo (Gramática)
              </label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="noun/verb, idiom, adj"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Nivel CEFR
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as WordLevel)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="A1">A1 - Principiante</option>
                <option value="A2">A2 - Básico</option>
                <option value="B1">B1 - Intermedio</option>
                <option value="B2">B2 - Intermedio Alto</option>
                <option value="C1">C1 - Avanzado</option>
                <option value="C2">C2 - Dominio Nativo</option>
              </select>
            </div>
          </div>

          {/* Row 2: Fonética IPA & Guía amigable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Fonética IPA
              </label>
              <input
                type="text"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
                placeholder="/ˈbreɪk.θruː/"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-indigo-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Pronunciación aproximada
              </label>
              <input
                type="text"
                value={phoneticGuide}
                onChange={(e) => setPhoneticGuide(e.target.value)}
                placeholder='"breik-zru"'
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Row 3: Nota fonética adicional */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Nota o consejo de pronunciación
            </label>
            <input
              type="text"
              value={phoneticNote}
              onChange={(e) => setPhoneticNote(e.target.value)}
              placeholder="ej. Acento: Sílaba 1 (θ fricativa interdental)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Row 4: Traducción y definición */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Traducción principal (Español) *
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Avance decisivo"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Significado contextual
              </label>
              <input
                type="text"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Logro importante, hito trascendental"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Row 5: Frases de ejemplo (Bilingüe) */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Frase de ejemplo en inglés
              </label>
              <textarea
                value={exampleEn}
                onChange={(e) => setExampleEn(e.target.value)}
                rows={2}
                placeholder="We achieved a major breakthrough in the contract negotiations."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Traducción de la frase en español
              </label>
              <textarea
                value={exampleEs}
                onChange={(e) => setExampleEs(e.target.value)}
                rows={2}
                placeholder="Logramos un avance decisivo en las negociaciones del contrato."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          {/* Row 6: Categorización */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
              >
                {INITIAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Subcategoría
              </label>
              <select
                value={categorySub}
                onChange={(e) => setCategorySub(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
              >
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>{initialWord ? 'Guardar Cambios' : 'Añadir Término'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
