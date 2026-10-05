import React, { useState, useMemo } from 'react';
import {
  Volume2,
  Download,
  Plus,
  Search,
  ChevronDown,
  Star,
  Edit2,
  MoreVertical,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { WordItem, WordLevel, WordStatus } from '../../types';
import { SelectedFilter } from './SidebarCategories';
import { vocabService } from '../../lib/vocabularyStore';

interface VocabularyTableViewProps {
  words: WordItem[];
  selectedFilter: SelectedFilter;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onStartPractice: (categoryWords?: WordItem[]) => void;
  onEditWord: (word: WordItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: WordStatus) => void;
  onDeleteWord: (id: string) => void;
}

export const VocabularyTableView: React.FC<VocabularyTableViewProps> = ({
  words,
  selectedFilter,
  onOpenAddModal,
  onOpenExportModal,
  onStartPractice,
  onEditWord,
  onToggleFavorite,
  onUpdateStatus,
  onDeleteWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [speakingWordId, setSpeakingWordId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // Filter words based on selected sidebar filter, search, and table dropdowns
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (selectedFilter.type === 'favorites' && !w.isFavorite) return false;
      if (selectedFilter.type === 'review' && w.status !== 'en_repaso') return false;
      if (selectedFilter.type === 'category') {
        if (w.categoryGroup !== selectedFilter.group) return false;
        if (selectedFilter.sub && w.categorySub !== selectedFilter.sub) return false;
      }

      if (levelFilter !== 'all' && w.level !== levelFilter) return false;
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesWord = w.word.toLowerCase().includes(q);
        const matchesTranslation = w.translation.toLowerCase().includes(q);
        const matchesIpa = w.ipa.toLowerCase().includes(q);
        const matchesGuide = w.phoneticGuide.toLowerCase().includes(q);
        if (!matchesWord && !matchesTranslation && !matchesIpa && !matchesGuide) return false;
      }

      return true;
    });
  }, [words, selectedFilter, levelFilter, statusFilter, searchTerm]);

  // Compute pagination
  const totalPages = Math.max(1, Math.ceil(filteredWords.length / rowsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * rowsPerPage;
  const pageWords = filteredWords.slice(startIndex, startIndex + rowsPerPage);

  const { breadcrumb, title, levelBadge, pendingReviewCount } = useMemo(() => {
    let bread = 'Negocios & Trabajo / Reuniones & Negociación';
    let t = 'Reuniones & Negociación';
    let badge = 'B1 - C1';

    if (selectedFilter.type === 'all') {
      bread = 'Biblioteca / Todas las palabras';
      t = 'Todas las palabras';
      badge = 'A1 - C2';
    } else if (selectedFilter.type === 'favorites') {
      bread = 'Colecciones / Favoritas';
      t = 'Palabras Favoritas';
      badge = 'Personalizado';
    } else if (selectedFilter.type === 'review') {
      bread = 'Repaso SRS / Pendientes de hoy';
      t = 'Por repasar hoy';
      badge = 'Prioritario';
    } else if (selectedFilter.type === 'category') {
      bread = `${selectedFilter.group} ${selectedFilter.sub ? `/ ${selectedFilter.sub}` : ''}`;
      t = selectedFilter.sub || selectedFilter.group;
      badge = selectedFilter.sub?.includes('Finanzas') ? 'B2 - C1' : 'B1 - C1';
    }

    const pending = filteredWords.filter((w) => w.status === 'en_repaso').length;
    return {
      breadcrumb: bread,
      title: t,
      levelBadge: badge,
      pendingReviewCount: pending,
    };
  }, [selectedFilter, filteredWords]);

  const handleSpeak = (word: WordItem) => {
    setSpeakingWordId(word.id);
    vocabService.speak(word.word);
    setTimeout(() => {
      setSpeakingWordId((prev) => (prev === word.id ? null : prev));
    }, 1200);
  };

  const getStatusBadge = (status: WordStatus) => {
    if (status === 'dominada') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Dominada
        </span>
      );
    }
    if (status === 'en_repaso') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          En repaso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        Nueva
      </span>
    );
  };

  const getLevelBadgeClass = (lvl: WordLevel) => {
    switch (lvl) {
      case 'A1':
      case 'A2':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'B1':
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'B2':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'C1':
      case 'C2':
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      default:
        return 'bg-white/10 text-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 select-none" onClick={() => setActiveMenuId(null)}>
      {/* Upper Area: Breadcrumb, Title & Top Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Breadcrumb & Title */}
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-tight">{breadcrumb}</p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#e62e4c]/20 text-pink-300 border border-[#e62e4c]/30">
              {levelBadge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-slate-200">{filteredWords.length} palabras registradas</span>
            {pendingReviewCount > 0 && (
              <>
                {' · '}
                <span className="text-amber-400 font-semibold">{pendingReviewCount} pendientes de repaso prioritario</span>
              </>
            )}
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Exportar / Importar */}
          <button
            type="button"
            onClick={onOpenExportModal}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-[0.99]"
          >
            <Download size={14} className="text-slate-300" />
            <span>Exportar / Importar</span>
          </button>

          {/* + Añadir Palabra */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-white font-semibold text-xs tracking-tight transition-all shadow-md shadow-[#e62e4c]/30 flex items-center gap-1.5 cursor-pointer active:scale-[0.99]"
          >
            <Plus size={15} />
            <span>Añadir Palabra</span>
          </button>

          {/* Practicar esta categoría */}
          <button
            type="button"
            onClick={() => onStartPractice(filteredWords)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold text-xs tracking-tight transition-all shadow-md shadow-purple-900/30 border border-white/10 flex items-center gap-1.5 cursor-pointer active:scale-[0.99]"
          >
            <Layers size={15} />
            <span>Practicar esta categoría</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar matching login dark style */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input with ⌘F */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por palabra en inglés, español o fonética..."
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-black/40 hover:bg-black/60 focus:bg-black/80 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#e62e4c] focus:border-[#e62e4c] transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-slate-400 select-none">
            ⌘F
          </span>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          {/* Nivel Dropdown */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto appearance-none pl-3 pr-8 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
            >
              <option value="all" className="bg-[#1c162e] text-white">Nivel: Todos (B1-C1)</option>
              <option value="A1" className="bg-[#1c162e] text-white">Nivel: A1</option>
              <option value="A2" className="bg-[#1c162e] text-white">Nivel: A2</option>
              <option value="B1" className="bg-[#1c162e] text-white">Nivel: B1</option>
              <option value="B2" className="bg-[#1c162e] text-white">Nivel: B2</option>
              <option value="C1" className="bg-[#1c162e] text-white">Nivel: C1</option>
              <option value="C2" className="bg-[#1c162e] text-white">Nivel: C2</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Estado Dropdown */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto appearance-none pl-3 pr-8 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
            >
              <option value="all" className="bg-[#1c162e] text-white">Estado: Todos</option>
              <option value="dominada" className="bg-[#1c162e] text-white">Dominada</option>
              <option value="en_repaso" className="bg-[#1c162e] text-white">En repaso</option>
              <option value="nueva" className="bg-[#1c162e] text-white">Nueva</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Vocabulary Table Container */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Table Header matching login dark theme */}
            <thead>
              <tr className="bg-[#140f21] border-b border-white/10 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                <th className="py-3.5 pl-6 pr-4 w-[22%]">Palabra (Inglés)</th>
                <th className="py-3.5 px-4 w-[20%]">Fonética & Pronunciación</th>
                <th className="py-3.5 px-4 w-[20%]">Traducción (Español)</th>
                <th className="py-3.5 px-4 w-[26%]">Frase de ejemplo (Bilingüe)</th>
                <th className="py-3.5 pr-6 pl-4 w-[12%] text-right">Estado & Acciones</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/5 text-xs">
              {pageWords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-300">No se encontraron palabras con estos filtros</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba a cambiar el término de búsqueda o añade una nueva palabra.</p>
                  </td>
                </tr>
              ) : (
                pageWords.map((item) => {
                  const isSpeaking = speakingWordId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.04] transition-colors group"
                    >
                      {/* Column 1: Audio Button + English Word + POS + Level */}
                      <td className="py-4 pl-6 pr-4 align-top">
                        <div className="flex items-start gap-3">
                          {/* Audio Speaker Button */}
                          <button
                            type="button"
                            onClick={() => handleSpeak(item)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border ${
                              isSpeaking
                                ? 'bg-[#e62e4c] text-white scale-105 shadow-lg shadow-[#e62e4c]/40 border-[#e62e4c]'
                                : 'bg-white/5 hover:bg-[#e62e4c]/20 text-[#ff4d6d] border-white/10 hover:border-[#e62e4c]/40'
                            }`}
                            title="Escuchar pronunciación (Inglés)"
                          >
                            <Volume2 size={16} className={isSpeaking ? 'animate-bounce' : ''} />
                          </button>

                          {/* Word + badges */}
                          <div>
                            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight block">
                              {item.word}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] italic text-slate-400 font-medium">
                                {item.partOfSpeech}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getLevelBadgeClass(
                                  item.level
                                )}`}
                              >
                                {item.level}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Fonética & Pronunciación */}
                      <td className="py-4 px-4 align-top">
                        <div>
                          <button
                            type="button"
                            onClick={() => handleSpeak(item)}
                            className="font-mono text-[#ff758c] font-bold hover:underline cursor-pointer block tracking-wide"
                            title="Reproducir fonética"
                          >
                            {item.ipa}
                          </button>
                          <span className="text-[11px] text-slate-200 font-medium block mt-0.5">
                            {item.phoneticGuide}
                          </span>
                          {item.phoneticNote && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                              {item.phoneticNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Traducción (Español) */}
                      <td className="py-4 px-4 align-top">
                        <div>
                          <span className="font-bold text-white block leading-snug">
                            {item.translation}
                          </span>
                          {item.definition && (
                            <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                              {item.definition}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Frase de ejemplo (Bilingüe) */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-normal">
                            "{item.exampleEn}"
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                            "{item.exampleEs}"
                          </p>
                        </div>
                      </td>

                      {/* Column 5: Estado & Acciones */}
                      <td className="py-4 pr-6 pl-4 align-top text-right">
                        <div className="flex flex-col items-end gap-2">
                          {/* Status Badge */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus: WordStatus =
                                item.status === 'nueva'
                                  ? 'en_repaso'
                                  : item.status === 'en_repaso'
                                  ? 'dominada'
                                  : 'en_repaso';
                              onUpdateStatus(item.id, nextStatus);
                            }}
                            className="cursor-pointer"
                            title="Clic para cambiar estado de aprendizaje"
                          >
                            {getStatusBadge(item.status)}
                          </button>

                          {/* Quick Action Icons: Star, Edit, More */}
                          <div className="flex items-center gap-1 text-slate-400 relative">
                            {/* Star / Favorite */}
                            <button
                              type="button"
                              onClick={() => onToggleFavorite(item.id)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                item.isFavorite
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'hover:text-white'
                              }`}
                              title={item.isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                            >
                              <Star
                                size={15}
                                className={item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}
                              />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => onEditWord(item)}
                              className="p-1 rounded-md hover:text-[#ff4d6d] transition-colors cursor-pointer"
                              title="Editar término"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* More Options / Three dots */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                }}
                                className="p-1 rounded-md hover:text-white transition-colors cursor-pointer"
                                title="Más opciones"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === item.id && (
                                <div
                                  className="absolute right-0 top-6 w-38 rounded-xl bg-[#1c162e] border border-white/15 shadow-2xl py-1.5 z-30 text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateStatus(item.id, 'dominada');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[11px] text-emerald-300 hover:bg-emerald-500/15 font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Marcar Dominada</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateStatus(item.id, 'en_repaso');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[11px] text-amber-300 hover:bg-amber-500/15 font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Clock size={12} />
                                    <span>Marcar En repaso</span>
                                  </button>
                                  <div className="border-t border-white/10 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteWord(item.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[11px] text-rose-400 hover:bg-rose-500/15 font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    <span>Eliminar palabra</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching login dark theme */}
        <div className="px-6 py-3.5 bg-[#140f21] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          {/* Mostrando X de Y */}
          <div className="flex items-center gap-4">
            <span>
              Mostrando <strong className="text-white">{pageWords.length > 0 ? startIndex + 1 : 0}</strong> -{' '}
              <strong className="text-white">{startIndex + pageWords.length}</strong> de{' '}
              <strong className="text-white">{filteredWords.length}</strong> palabras
            </span>

            {/* Filas por página */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-black/40 border border-white/10 rounded-md px-1.5 py-0.5 text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value={6} className="bg-[#1c162e]">6</option>
                <option value={10} className="bg-[#1c162e]">10</option>
                <option value={20} className="bg-[#1c162e]">20</option>
              </select>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="hidden lg:flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-slate-200">
                Espacio
              </kbd>{' '}
              Audio
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-slate-200">
                N
              </kbd>{' '}
              Nueva palabra
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-slate-200">
                P
              </kbd>{' '}
              Comenzar práctica
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-pink-300 px-2">
              Pág. {validPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
