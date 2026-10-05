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
    if (name.includes('Negocios')) return <Briefcase size={15} className="text-indigo-600" />;
    if (name.includes('Vida')) return <Home size={15} className="text-sky-600" />;
    if (name.includes('Viajes')) return <Plane size={15} className="text-emerald-600" />;
    return <MessageSquare size={15} className="text-amber-600" />;
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

  // Retention percentage calculation
  const retentionPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 68;

  return (
    <aside className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4 select-none">
      {/* Upper Navigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col gap-4">
        {/* Header with Total Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Categorías</h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {totalWords} total
          </span>
        </div>

        {/* "+ Nueva Categoría" Button matching screenshot */}
        <button
          type="button"
          onClick={onAddNewCategory}
          className="w-full py-2 px-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/60 text-indigo-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
        >
          <Plus size={15} className="text-indigo-600" />
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
                ? 'bg-indigo-50 text-indigo-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={15} className={selectedFilter.type === 'all' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Todas las palabras</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{totalWords}</span>
          </button>

          {/* Favoritas */}
          <button
            type="button"
            onClick={() => onSelectFilter({ type: 'favorites' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
              selectedFilter.type === 'favorites'
                ? 'bg-amber-50 text-amber-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star size={15} className="text-amber-500 fill-amber-400" />
              <span>Favoritas</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              {favoritesCount}
            </span>
          </button>

          {/* Por repasar hoy */}
          <button
            type="button"
            onClick={() => onSelectFilter({ type: 'review' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
              selectedFilter.type === 'review'
                ? 'bg-rose-50 text-rose-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={15} className="text-rose-500" />
              <span>Por repasar hoy</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              {reviewCount}
            </span>
          </button>
        </div>

        {/* TEMARIOS DE ESTUDIO Header */}
        <div className="pt-2 border-t border-slate-100">
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
                      groupActive ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
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
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
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
                    <div className="pl-6 space-y-0.5 border-l-2 border-slate-100 ml-3.5 my-1">
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
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                              active
                                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Pin
                                size={12}
                                className={`shrink-0 ${active ? 'text-indigo-200' : 'text-slate-400'}`}
                              />
                              <span className="truncate">{sub.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-600'
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

      {/* Retención Lexical Card matching screenshot */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Retención Lexical</span>
          </div>
          <span className="text-base font-extrabold text-indigo-600">{retentionPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${retentionPercent}%` }}
          />
        </div>

        {/* Breakdown Stats */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
          <div>
            <span className="text-slate-400 block text-[10px]">Dominadas</span>
            <span className="font-bold text-slate-800">{masteredCount} términos</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Meta semanal</span>
            <span className="font-bold text-indigo-600">120 términos</span>
          </div>
        </div>

        {/* SRS algorithm status badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span className="text-slate-500 font-medium">Algoritmo SRS SM-2</span>
          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Activo
          </span>
        </div>
      </div>
    </aside>
  );
};
