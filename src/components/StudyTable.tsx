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
  Tag
} from 'lucide-react';
import { StudySession, SortConfig, FilterConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StudyTableProps {
  sessions: StudySession[];
  onDelete: (id: string) => void;
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
    <div className="flex items-center space-x-1">
      <Icon size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
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
          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none font-normal"
          placeholder={`Filtrar ${label}...`}
          value={filterValue}
          onChange={(e) => onFilterChange(sortKey, e.target.value)}
        />
      </div>
    )}
  </th>
);

export const StudyTable: React.FC<StudyTableProps> = ({ sessions, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'activity', direction: 'asc' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});

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
        
        let aVal = a[key] as any;
        let bVal = b[key] as any;

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sessions, searchTerm, sortConfig, filters]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-full">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar em tudo..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm",
              showFilters 
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" 
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Filter size={16} />
            {showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
          <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block" />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            Mostrando {filteredAndSortedSessions.length} de {sessions.length} registros
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
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
              <th className="px-4 py-3 text-right border-b border-gray-200 dark:border-gray-800 w-20"></th>
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
                    className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                      {format(new Date(session.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {session.goal}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {session.activity}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-400">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800/50">
                        {session.subjectName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex flex-col gap-1.5 items-start">
                        {(session.topicNames || []).map((name, idx) => (
                          <span 
                            key={idx}
                            className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[10px] font-bold border border-gray-200 dark:border-gray-700 leading-tight uppercase tracking-wider"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(session.id);
                          }}
                          className="p-3 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-red-100 dark:hover:border-red-900/50 cursor-pointer relative z-50 bg-white dark:bg-gray-800 shadow-sm"
                          title="Excluir Registro"
                        >
                          <Trash2 size={18} />
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
                        <Search size={32} className="text-gray-300 dark:text-gray-600" />
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
