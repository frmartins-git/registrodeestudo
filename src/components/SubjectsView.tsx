import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  FolderPlus,
  FilePlus,
  Search
} from 'lucide-react';
import { Subject, Topic } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SubjectsViewProps {
  subjects: Subject[];
  topics: Topic[];
  onAddSubject: (name: string) => void;
  onDeleteSubject: (id: string) => void;
  onAddTopic: (subjectId: string, name: string) => void;
  onDeleteTopic: (id: string) => void;
}

const SubjectItem = ({ 
  subject, 
  topics, 
  onDeleteSubject, 
  onAddTopic, 
  onDeleteTopic 
}: { 
  subject: Subject;
  topics: Topic[];
  onDeleteSubject: (id: string) => void;
  onAddTopic: (subjectId: string, name: string) => void;
  onDeleteTopic: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const subjectTopics = topics.filter(t => t.subjectId === subject.id);

  const handleAddTopic = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTopicName.trim()) return;
    onAddTopic(subject.id, newTopicName.trim());
    setNewTopicName('');
    setShowAddTopic(false);
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
      <div className={cn(
        "flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer text-gray-900 dark:text-gray-100",
        isOpen && "bg-gray-50/30 dark:bg-gray-800/30"
      )} onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-3">
          <div className="text-gray-400">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <BookOpen size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{subject.name}</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
              {subjectTopics.length} {subjectTopics.length === 1 ? 'Assunto' : 'Assuntos'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowAddTopic(!showAddTopic)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
            title="Adicionar Assunto"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() => onDeleteSubject(subject.id)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Excluir Matéria"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white dark:bg-gray-900/50"
          >
            <div className="pl-12 pr-4 pb-2 space-y-1">
              {showAddTopic && (
                <form 
                  onSubmit={handleAddTopic}
                  className="py-2 flex gap-2 animate-in fade-in slide-in-from-top-1"
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome do assunto..."
                    className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && setShowAddTopic(false)}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                </form>
              )}

              {subjectTopics.map(topic => (
                <div 
                  key={topic.id}
                  className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group/topic transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Tag size={12} className="text-gray-300 dark:text-gray-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{topic.name}</span>
                  </div>
                  <button
                    onClick={() => onDeleteTopic(topic.id)}
                    className="opacity-0 group-hover/topic:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {subjectTopics.length === 0 && !showAddTopic && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic py-3">Nenhum assunto cadastrado.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  topics,
  onAddSubject,
  onDeleteSubject,
  onAddTopic,
  onDeleteTopic,
}) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    onAddSubject(newSubjectName.trim());
    setNewSubjectName('');
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topics.some(t => t.subjectId === s.id && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm sticky top-24 z-10 backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar matérias ou assuntos..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <form onSubmit={handleAddSubject} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Nova Matéria..."
            className="flex-1 md:w-64 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium dark:text-white"
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 dark:shadow-none transition-all active:scale-95"
            title="Adicionar Matéria"
          >
            <FolderPlus size={20} />
          </button>
        </form>
      </div>

      {/* Tree View Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={16} />
            Estrutura do Edital
          </h3>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
            {subjects.length} Matérias | {topics.length} Assuntos
          </span>
        </div>
        
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          <AnimatePresence mode="popLayout">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map(subject => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={subject.id}
                >
                  <SubjectItem 
                    subject={subject}
                    topics={topics}
                    onDeleteSubject={onDeleteSubject}
                    onAddTopic={onAddTopic}
                    onDeleteTopic={onDeleteTopic}
                  />
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center">
                <Search size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum resultado encontrado</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Tente buscar por outro termo ou adicione uma nova matéria.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {subjects.length === 0 && (
        <div className="py-20 text-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Sua base de disciplinas está vazia.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Use o campo acima para adicionar sua primeira matéria.</p>
        </div>
      )}
    </div>
  );
};
