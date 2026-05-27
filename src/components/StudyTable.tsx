import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowUpDown, 
  Search, 
  Filter, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  Calendar,
  Target,
  BookOpen,
  Tag,
  Star,
  Pencil
} from 'lucide-react';
import { StudySession, SortConfig, FilterConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const GOAL_PALETTES = [
  {
    bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-150 dark:border-indigo-800/80",
    border: "border-indigo-500"
  },
  {
    bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-150 dark:border-emerald-800/80",
    border: "border-emerald-500"
  },
  {
    bg: "bg-amber-50 dark:bg-amber-955/44 text-amber-700 dark:text-amber-300 border-amber-150 dark:border-amber-800/80",
    border: "border-amber-500"
  },
  {
    bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-150 dark:border-purple-800/80",
    border: "border-purple-500"
  },
  {
    bg: "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-150 dark:border-pink-800/80",
    border: "border-pink-500"
  },
  {
    bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-150 dark:border-cyan-800/80",
    border: "border-cyan-500"
  },
  {
    bg: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-150 dark:border-orange-850/80",
    border: "border-orange-500"
  },
  {
    bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-150 dark:border-sky-800/80",
    border: "border-sky-500"
  }
];

const getGoalColorClass = (goal: string) => {
  if (!goal) return GOAL_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < goal.length; i++) {
    hash = goal.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GOAL_PALETTES.length;
  return GOAL_PALETTES[index];
};

interface StudyTableProps {
  sessions: StudySession[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedFields: Partial<StudySession>) => void;
  onEdit: (session: StudySession) => void;
}

const TableHeader = ({ 
  label, 
  sortKey, 
  icon: Icon, 
  sortConfig, 
  onSort, 
  showFilters, 
  filterValue, 
  onFilterChange 
}: { 
  label: string, 
  sortKey: keyof StudySession, 
  icon: any,
  sortConfig: SortConfig,
  onSort: (key: keyof StudySession) => void,
  showFilters: boolean,
  filterValue: string,
  onFilterChange: (key: keyof StudySession, value: string) => void
}) => (
  <th 
    className="px-4 py-3 text-left group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
    onClick={() => onSort(sortKey)}
  >
    <div className="flex items-center space-x-1.5">
      <Icon size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <ArrowUpDown 
        size={12} 
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          sortConfig?.key === sortKey && "opacity-100 text-blue-500"
        )} 
      />
    </div>
    {showFilters && (
      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none font-normal"
          placeholder={`Filtrar ${label}...`}
          value={filterValue}
          onChange={(e) => onFilterChange(sortKey, e.target.value)}
        />
      </div>
    )}
  </th>
);

export const StudyTable: React.FC<StudyTableProps> = ({ sessions, onDelete, onUpdate, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [activeDifficultyMenu, setActiveDifficultyMenu] = useState<string | null>(null);

  const handleSort = (key: keyof StudySession) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof StudySession, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredAndSortedSessions = useMemo(() => {
    return sessions
      .filter(session => {
        const globalMatch = Object.values(session).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );

        const columnMatches = Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return String(session[key as keyof StudySession])
            .toLowerCase()
            .includes(String(value).toLowerCase());
        });

        return globalMatch && columnMatches;
      })
      .sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        
        let aVal = a[key];
        let bVal = b[key];

        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (Array.isArray(aVal)) aVal = aVal.join(', ');
        if (Array.isArray(bVal)) bVal = bVal.join(', ');

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
          const comp = collator.compare(aVal, bVal);
          return direction === 'asc' ? comp : -comp;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sessions, searchTerm, sortConfig, filters]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-full">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar registros..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border shadow-xs cursor-pointer",
              showFilters 
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-250 dark:border-blue-800 text-blue-600 dark:text-blue-400" 
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Filter size={15} />
            {showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
          <div className="h-6 w-[1.5px] bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block" />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {filteredAndSortedSessions.length} no total
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-xxs">
            <tr>
              <TableHeader 
                label="Data" 
                sortKey="date" 
                icon={Calendar} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                showFilters={showFilters}
                filterValue={filters['date'] || ''}
                onFilterChange={handleFilterChange}
              />
              <TableHeader 
                label="Meta" 
                sortKey="goal" 
                icon={Target} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                showFilters={showFilters}
                filterValue={filters['goal'] || ''}
                onFilterChange={handleFilterChange}
              />
              <TableHeader 
                label="Atividade" 
                sortKey="activity" 
                icon={BookOpen} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                showFilters={showFilters}
                filterValue={filters['activity'] || ''}
                onFilterChange={handleFilterChange}
              />
              <TableHeader 
                label="Matéria" 
                sortKey="subjectName" 
                icon={BookOpen} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                showFilters={showFilters}
                filterValue={filters['subjectName'] || ''}
                onFilterChange={handleFilterChange}
              />
              <TableHeader 
                label="Assuntos" 
                sortKey="topicNames" 
                icon={Tag} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                showFilters={showFilters}
                filterValue={filters['topicNames'] || ''}
                onFilterChange={handleFilterChange}
              />
              <th className="px-4 py-3 text-right border-b border-gray-200 dark:border-gray-800 w-36"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedSessions.length > 0 ? (
                filteredAndSortedSessions.map((session) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={session.id}
                    className="hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors group"
                  >
                    <td className={cn(
                      "px-4 py-3 text-sm flex flex-col items-start gap-1 border-l-4 shadow-2xs",
                      getGoalColorClass(session.goal).border
                    )}>
                      <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold text-xs">
                        {format(new Date(session.date), "dd/MM/yyyy")}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md font-bold uppercase tracking-tight">
                        {format(new Date(session.date), 'EEEE', { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {(() => {
                        const style = getGoalColorClass(session.goal);
                        return (
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shadow-xs transition-all duration-300",
                            style.bg
                          )}>
                            {session.goal}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        {/* Clickable Activity cell trigger edit */}
                        <div 
                          onClick={() => onEdit(session)}
                          className="flex items-center gap-2 group/activity text-left cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 pr-2 rounded-lg"
                          title="Clique para editar Atividade"
                        >
                          <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover/activity:text-blue-600 dark:group-hover/activity:text-blue-400">
                            {session.activity}
                          </span>
                          <Pencil size={11} className="opacity-0 group-hover/activity:opacity-100 text-blue-500 transition-opacity flex-shrink-0" />
                        </div>

                        {/* Re-designed performance selector triggers UPWARD popup with NO names, only color identifiers */}
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveDifficultyMenu(activeDifficultyMenu === session.id ? null : session.id);
                            }}
                            className={cn(
                              "p-1 rounded-md cursor-pointer transition-all flex items-center justify-center border",
                              session.difficulty === 'easy' && "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100/50",
                              session.difficulty === 'medium' && "bg-amber-50 dark:bg-amber-900/30 text-amber-500 border-amber-105 dark:border-amber-800/50 hover:bg-amber-100/50",
                              session.difficulty === 'hard' && "bg-rose-50 dark:bg-rose-900/30 text-rose-500 border-rose-100 dark:border-rose-800/50 hover:bg-rose-100/50",
                              (!session.difficulty) && "bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-100/50 hover:text-gray-600/80"
                            )}
                            title={
                              session.difficulty === 'easy' ? "Verde (Dominei!)" :
                              session.difficulty === 'medium' ? "Amarelo (Em consolidação)" :
                              session.difficulty === 'hard' ? "Vermelho (Preciso revisar!)" :
                              "Definir desempenho / reforço"
                            }
                          >
                            <Star 
                              size={12} 
                              className={cn(
                                "transition-all", 
                                session.difficulty === 'easy' && "fill-emerald-500 text-emerald-500",
                                session.difficulty === 'medium' && "fill-amber-500 text-amber-500",
                                session.difficulty === 'hard' && "fill-rose-500 text-rose-500",
                                !session.difficulty && "fill-none text-gray-450"
                              )} 
                            />
                          </button>

                          {/* High-end small horizontal picker opening UPWARDS above star */}
                          {activeDifficultyMenu === session.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-45 cursor-default" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActiveDifficultyMenu(null);
                                }}
                              />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white dark:bg-gray-805 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-1.5 z-55 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 select-none">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(session.id, { difficulty: 'easy' });
                                    setActiveDifficultyMenu(null);
                                  }}
                                  className="p-1 px-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title="Fácil (Sem necessidade de reforço)"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                                  <Star size={11} className="text-emerald-500 fill-emerald-500" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(session.id, { difficulty: 'medium' });
                                    setActiveDifficultyMenu(null);
                                  }}
                                  className="p-1 px-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-955/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title="Médio (Precisa de alguma atenção)"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
                                  <Star size={11} className="text-amber-500 fill-amber-500" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(session.id, { difficulty: 'hard' });
                                    setActiveDifficultyMenu(null);
                                  }}
                                  className="p-1 px-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-955/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title="Difícil (Preciso REFORÇAR!)"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                                  <Star size={11} className="text-rose-500 fill-rose-500" />
                                </button>

                                <div className="w-[1.5px] h-4 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(session.id, { difficulty: undefined });
                                    setActiveDifficultyMenu(null);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
                                  title="Limpar classificação"
                                >
                                  <Star size={11} className="text-gray-400 fill-none" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-750 dark:text-blue-400">
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800/50 text-xs font-semibold leading-tight text-center break-words max-w-[150px] sm:max-w-none">
                        {session.subjectName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex flex-wrap gap-1.5 items-start">
                        {(session.topicNames || []).map((name, idx) => (
                          <span 
                            key={idx}
                            className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[10px] font-bold border border-gray-200 dark:border-gray-700 leading-tight uppercase tracking-wider whitespace-nowrap"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Row Action buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit(session);
                          }}
                          className="p-2.5 text-gray-450 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-blue-100 dark:hover:border-blue-900/50 cursor-pointer relative bg-white dark:bg-gray-800 shadow-xs"
                          title="Editar Registro"
                        >
                          <Pencil size={15} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(session.id);
                          }}
                          className="p-2.5 text-gray-450 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-red-100 dark:hover:border-red-900/50 cursor-pointer relative bg-white dark:bg-gray-800 shadow-xs"
                          title="Excluir Registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                        <Search size={32} className="text-gray-300 dark:text-gray-650" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum registro encontrado</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Tente ajustar seus filtros ou busca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
