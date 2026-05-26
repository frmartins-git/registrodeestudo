import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Calendar as CalendarIcon, Target, BookOpen, Tag, Check, Search, Sparkles } from 'lucide-react';
import { StudySession, Subject, Topic } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (session: Omit<StudySession, 'id' | 'createdAt' | 'userId'>) => void;
  availableSubjects: Subject[];
  availableTopics: Topic[];
  sessions: StudySession[];
  onAddSubject: (name: string) => Promise<any> | void;
  onAddTopic: (subjectId: string, name: string) => Promise<any> | void;
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd,
  availableSubjects,
  availableTopics,
  sessions,
  onAddSubject,
  onAddTopic
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    goal: 'Meta ',
    activity: 'Atividade ',
    subjectId: '',
    topicIds: [] as string[]
  });
  const [topicSearch, setTopicSearch] = useState('');

  // Inline management state
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'subject' | 'topic'>('subject');
  const [newSubName, setNewSubName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedSubForTopic, setSelectedSubForTopic] = useState('');
  const [newSubSuccess, setNewSubSuccess] = useState(false);
  const [newTopicSuccess, setNewTopicSuccess] = useState(false);

  // Auto-selection trackers
  const [pendingSubjectName, setPendingSubjectName] = useState<string | null>(null);
  const [pendingTopicName, setPendingTopicName] = useState<{ subjectId: string, name: string } | null>(null);

  // Auto-select newly added subject on the fly
  useEffect(() => {
    if (pendingSubjectName) {
      const found = availableSubjects.find(s => s.name.trim().toLowerCase() === pendingSubjectName.trim().toLowerCase());
      if (found) {
        setFormData(prev => ({ ...prev, subjectId: found.id, topicIds: [] }));
        setSelectedSubForTopic(found.id);
        setPendingSubjectName(null);
      }
    }
  }, [availableSubjects, pendingSubjectName]);

  // Auto-select newly added topic on the fly
  useEffect(() => {
    if (pendingTopicName) {
      const found = availableTopics.find(t => t.subjectId === pendingTopicName.subjectId && t.name.trim().toLowerCase() === pendingTopicName.name.trim().toLowerCase());
      if (found) {
        setFormData(prev => ({
          ...prev,
          subjectId: pendingTopicName.subjectId,
          topicIds: [...new Set([...prev.topicIds, found.id])]
        }));
        setPendingTopicName(null);
      }
    }
  }, [availableTopics, pendingTopicName]);

  // Auto-calculate next activity and reset form on open
  useEffect(() => {
    if (isOpen) {
      let nextActivityNum = 1;
      
      if (sessions.length > 0) {
        // Try to find the highest activity number in existing sessions
        const activityNums = sessions
          .map(s => {
            const match = s.activity.match(/Atividade\s*(\d+)/i);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter((n): n is number => n !== null);

        if (activityNums.length > 0) {
          nextActivityNum = Math.max(...activityNums) + 1;
        }
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        goal: 'Meta ',
        activity: `Atividade ${nextActivityNum}`,
        subjectId: '',
        topicIds: []
      });
      setTopicSearch('');
    }
  }, [isOpen, sessions]);

  const filteredTopics = useMemo(() => {
    const topics = availableTopics.filter(t => t.subjectId === formData.subjectId);
    if (!topicSearch.trim()) return topics;
    return topics.filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase()));
  }, [availableTopics, formData.subjectId, topicSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.goal || !formData.subjectId || formData.topicIds.length === 0) return;
    
    const subject = availableSubjects.find(s => s.id === formData.subjectId);
    const topics = availableTopics.filter(t => formData.topicIds.includes(t.id));

    onAdd({
      date: formData.date,
      goal: formData.goal,
      activity: formData.activity,
      subjectId: formData.subjectId,
      subjectName: subject?.name || '',
      topicIds: formData.topicIds,
      topicNames: topics.map(t => t.name)
    });

    setFormData({
      date: new Date().toISOString().split('T')[0],
      goal: 'Meta ',
      activity: 'Atividade ',
      subjectId: '',
      topicIds: []
    });
    setTopicSearch('');
    onClose();
  };

  const toggleTopic = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      topicIds: prev.topicIds.includes(topicId)
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId]
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 overflow-hidden"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus size={20} className="text-blue-500" />
                  Novo Registro de Estudo
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                      <CalendarIcon size={12} />
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      value={formData.date}
                      onChange={e => setFormData(d => ({ ...d, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                      <Target size={12} />
                      Meta
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Meta 9"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all lg:text-base"
                      value={formData.goal}
                      onChange={e => setFormData(d => ({ ...d, goal: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                    <BookOpen size={12} />
                    Atividade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Atividade 21"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    value={formData.activity}
                    onChange={e => setFormData(d => ({ ...d, activity: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                      <BookOpen size={12} />
                      Matéria
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubForTopic(formData.subjectId || (availableSubjects[0]?.id || ''));
                        setIsManageOpen(true);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                      Nova Matéria / Assunto
                    </button>
                  </div>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    value={formData.subjectId}
                    onChange={e => setFormData(d => ({ ...d, subjectId: e.target.value, topicIds: [] }))}
                  >
                    <option value="" className="dark:bg-gray-900">Selecione uma matéria</option>
                    {availableSubjects.map(s => (
                      <option key={s.id} value={s.id} className="dark:bg-gray-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                {formData.subjectId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                        <Tag size={12} />
                        Assuntos ({formData.topicIds.length} selecionados)
                      </label>
                    </div>

                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Pesquisar assuntos..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                      />
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredTopics.map(topic => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => toggleTopic(topic.id)}
                          className={cn(
                            "flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all text-left",
                            formData.topicIds.includes(topic.id)
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold shadow-sm"
                              : "bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          )}
                        >
                          <span className="truncate">{topic.name}</span>
                          {formData.topicIds.includes(topic.id) && (
                            <div className="bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                      {filteredTopics.length === 0 && (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                            {topicSearch ? 'Nenhum assunto encontrado' : 'Nenhum assunto cadastrado'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900 transition-colors duration-300">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.subjectId || formData.topicIds.length === 0}
                    className="flex-[2] px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Nested Management Dialog for Subjects and Topics */}
          <AnimatePresence>
            {isManageOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsManageOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-xs z-55 flex items-center justify-center p-4"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="fixed inset-4 sm:inset-auto sm:w-full sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-55 flex flex-col self-center justify-self-center my-auto"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-500 animate-pulse" />
                      Cadastrar Novo Conteúdo
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsManageOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setManageMode('subject')}
                      className={cn(
                        "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
                        manageMode === 'subject'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300"
                      )}
                    >
                      1. Cadastrar Matéria
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSubForTopic && availableSubjects.length > 0) {
                          setSelectedSubForTopic(availableSubjects[0].id);
                        }
                        setManageMode('topic');
                      }}
                      className={cn(
                        "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
                        manageMode === 'topic'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300"
                      )}
                    >
                      2. Cadastrar Assunto
                    </button>
                  </div>

                  {/* Forms Content */}
                  <div className="p-5 flex-1 overflow-y-auto">
                    {manageMode === 'subject' ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const val = newSubName.trim();
                          if (!val) return;
                          setPendingSubjectName(val);
                          await onAddSubject(val);
                          setNewSubName('');
                          setNewSubSuccess(true);
                          setTimeout(() => {
                            setNewSubSuccess(false);
                            // Automatically switch to topic step and populate selection
                            setManageMode('topic');
                          }, 1500);
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            Nome da Matéria
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Direito Constitucional, Matemática..."
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                          />
                        </div>

                        {newSubSuccess && (
                          <div className="text-xs font-bold text-center text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 py-2 rounded-xl animate-bounce">
                            ✓ Matéria salva com sucesso! Avançando para Assuntos...
                          </div>
                        )}

                        <div className="pt-2 flex gap-2">
                          <button
                            type="submit"
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
                          >
                            Salvar Matéria
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const val = newTopicName.trim();
                          if (!val || !selectedSubForTopic) return;
                          setPendingTopicName({ subjectId: selectedSubForTopic, name: val });
                          await onAddTopic(selectedSubForTopic, val);
                          setNewTopicName('');
                          setNewTopicSuccess(true);
                          setTimeout(() => {
                            setNewTopicSuccess(false);
                          }, 1500);
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            Selecionar Matéria correspondente
                          </label>
                          <select
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                            value={selectedSubForTopic}
                            onChange={(e) => setSelectedSubForTopic(e.target.value)}
                          >
                            <option value="">Selecione uma matéria</option>
                            {availableSubjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            Nome do Assunto/Conteúdo
                          </label>
                          <input
                            type="text"
                            required
                            disabled={!selectedSubForTopic}
                            placeholder={selectedSubForTopic ? "Ex: Artigo 5º, Frações, Concordância..." : "Escolha a matéria primeiro"}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                          />
                        </div>

                        {newTopicSuccess && (
                          <div className="text-xs font-bold text-center text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 py-2 rounded-xl animate-bounce">
                            ✓ Assunto salvo e selecionado automaticamente!
                          </div>
                        )}

                        <div className="pt-2 flex gap-2">
                          <button
                            type="submit"
                            disabled={!selectedSubForTopic || !newTopicName.trim()}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                          >
                            Salvar Assunto
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Close Footer bar */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsManageOpen(false)}
                      className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-850 dark:text-gray-100 font-bold rounded-xl text-xs transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
