import React, { useState } from 'react';
import {
  Folder,
  Plus,
  BookOpen,
  Star,
  Clock,
  Briefcase,
  Home,
  Plane,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Pin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { CategoryItem } from '../../types';

export type SelectedFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'review' }
  | { type: 'category'; group: string; sub?: string };

interface SidebarCategoriesProps {
  categories: CategoryItem[];
  selectedFilter: SelectedFilter;
  onSelectFilter: (filter: SelectedFilter) => void;
  totalWords: number;
  favoritesCount: number;
  reviewCount: number;
  masteredCount: number;
  onAddNewCategory?: () => void;
}

export const SidebarCategories: React.FC<SidebarCategoriesProps> = ({
  categories,
  selectedFilter,
  onSelectFilter,
  totalWords,
  favoritesCount,
  reviewCount,
  masteredCount,
  onAddNewCategory,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Negocios & Trabajo': true,
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getCategoryIcon = (name: string) => {
    if (name.includes('Negocios')) return <Briefcase size={15} className="text-[#ff4d6d]" />;
    if (name.includes('Vida')) return <Home size={15} className="text-sky-400" />;
    if (name.includes('Viajes')) return <Plane size={15} className="text-emerald-400" />;
    return <MessageSquare size={15} className="text-amber-400" />;
  };

  const isSubActive = (group: string, sub: string) => {
    return (
      selectedFilter.type === 'category' &&
      selectedFilter.group === group &&
      selectedFilter.sub === sub
    );
  };

  const isGroupActive = (group: string) => {
    return (
      selectedFilter.type === 'category' &&
      selectedFilter.group === group &&
      !selectedFilter.sub
    );
  };

  const retentionPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 68;

  return (
    <aside className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4 select-none">
      {/* Upper Navigation Card */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 sm:p-5 flex flex-col gap-4 text-white">
        {/* Header with Total Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-[#ff4d6d]" />
            <h2 className="text-sm font-bold text-white tracking-tight">Categorías</h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300">
            {totalWords} total
          </span>
        </div>

        {/* "+ Nueva Categoría" Button matching login button style */}
        <button
          type="button"
          onClick={onAddNewCategory}
          className="w-full py-2 px-3 rounded-xl bg-[#e62e4c]/15 hover:bg-[#e62e4c]/25 border border-[#e62e4c]/40 text-pink-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] shadow-sm"
        >
          <Plus size={15} className="text-[#ff4d6d]" />
          <span>Nueva Categoría</span>
        </button>

        {/* Global Filters List */}
        <div className="space-y-1">
          {/* Todas las palabras */}
          <button
            type="button"
            onClick={() => onSelectFilter({ type: 'all' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
              selectedFilter.type === 'all'
                ? 'bg-white/15 text-white font-semibold border border-white/20'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={15} className={selectedFilter.type === 'all' ? 'text-[#ff4d6d]' : 'text-slate-400'} />
              <span>Todas las palabras</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">{totalWords}</span>
          </button>

          {/* Favoritas */}
          <button
            type="button"
            onClick={() => onSelectFilter({ type: 'favorites' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
              selectedFilter.type === 'favorites'
                ? 'bg-amber-500/20 text-amber-200 font-semibold border border-amber-500/30'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star size={15} className="text-amber-400 fill-amber-400" />
              <span>Favoritas</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
              {favoritesCount}
            </span>
          </button>

          {/* Por repasar hoy */}
          <button
            type="button"
            onClick={() => onSelectFilter({ type: 'review' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
              selectedFilter.type === 'review'
                ? 'bg-rose-500/20 text-rose-200 font-semibold border border-rose-500/30'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={15} className="text-rose-400" />
              <span>Por repasar hoy</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
              {reviewCount}
            </span>
          </button>
        </div>

        {/* TEMARIOS DE ESTUDIO Header */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-1 mb-2">
            Temarios de estudio
          </p>

          <div className="space-y-1">
            {categories.map((cat) => {
              const isExpanded = !!expandedGroups[cat.name];
              const groupActive = isGroupActive(cat.name);

              return (
                <div key={cat.id} className="space-y-0.5">
                  {/* Category Group Header */}
                  <div
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      groupActive ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 truncate"
                      onClick={() => onSelectFilter({ type: 'category', group: cat.name })}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(cat.name);
                        }}
                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <div className="shrink-0">{getCategoryIcon(cat.name)}</div>
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 ml-2">{cat.count}</span>
                  </div>

                  {/* Subcategories (tree items) */}
                  {isExpanded && cat.subcategories && (
                    <div className="pl-6 space-y-0.5 border-l border-white/10 ml-3.5 my-1">
                      {cat.subcategories.map((sub) => {
                        const active = isSubActive(cat.name, sub.name);

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              onSelectFilter({
                                type: 'category',
                                group: cat.name,
                                sub: sub.name,
                              })
                            }
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                              active
                                ? 'bg-[#e62e4c] text-white font-semibold shadow-md shadow-[#e62e4c]/30'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Pin
                                size={12}
                                className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
                              />
                              <span className="truncate">{sub.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                active
                                  ? 'bg-black/20 text-white'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {sub.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Retención Lexical Card */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 sm:p-5 flex flex-col gap-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Retención Lexical</span>
          </div>
          <span className="text-base font-extrabold text-[#ff4d6d]">{retentionPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e62e4c] via-purple-500 to-amber-400 transition-all duration-500"
            style={{ width: `${retentionPercent}%` }}
          />
        </div>

        {/* Breakdown Stats */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
          <div>
            <span className="text-slate-400 block text-[10px]">Dominadas</span>
            <span className="font-bold text-white">{masteredCount} términos</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Meta semanal</span>
            <span className="font-bold text-[#ff4d6d]">120 términos</span>
          </div>
        </div>

        {/* SRS algorithm status badge */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-medium">Algoritmo SRS SM-2</span>
          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Activo
          </span>
        </div>
      </div>
    </aside>
  );
};
