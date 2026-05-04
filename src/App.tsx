import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  GraduationCap, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  LogIn,
  Loader2,
  Mail,
  Lock,
  UserPlus,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { StudySession, Subject, Topic } from './types';
import { StudyTable } from './components/StudyTable';
import { AddSessionModal } from './components/AddSessionModal';
import { SubjectsView } from './components/SubjectsView';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout,
  loginWithEmail,
  registerWithEmail,
  handleFirestoreError,
  OperationType,
  testConnection
} from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(true);
  const [view, setView] = useState<'history' | 'subjects'>('history');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  // Dark Mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Sidebar persistence
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auth Listener
  useEffect(() => {
    const checkConn = async () => {
      try {
        await testConnection();
      } catch (e) {
        setFirebaseReady(false);
      }
    };
    checkConn();
    
    // Safety timeout for loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth listener timed out. Check Firebase configuration.");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      clearTimeout(timeout);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) {
      setSubjects([]);
      setTopics([]);
      setSessions([]);
      return;
    }

    const qSubjects = query(collection(db, 'subjects'), where('userId', '==', user.uid));
    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    });

    const qTopics = query(collection(db, 'topics'), where('userId', '==', user.uid));
    const unsubTopics = onSnapshot(qTopics, (snapshot) => {
      setTopics(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Topic)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'topics');
    });

    const qSessions = query(
      collection(db, 'sessions'), 
      where('userId', '==', user.uid)
    );
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudySession));
      // Sort in memory to avoid needing a composite index
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setSessions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return () => {
      unsubSubjects();
      unsubTopics();
      unsubSessions();
    };
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleAddSession = async (data: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'sessions'), {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'sessions');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'sessions/' + id);
    }
  };

  const handleAddSubject = async (name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'subjects'), { 
        name, 
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'subjects');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subjects', id));
      const relatedTopics = topics.filter(t => t.subjectId === id);
      for (const t of relatedTopics) {
        await deleteDoc(doc(db, 'topics', t.id));
      }
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'subjects/' + id);
    }
  };

  const handleAddTopic = async (subjectId: string, name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'topics'), { 
        subjectId, 
        name, 
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'topics');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'topics', id));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'topics/' + id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    const requiredKeys = {
      'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
      'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
      'VITE_FIREBASE_STORAGE_BUCKET': import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      'VITE_FIREBASE_MESSAGING_SENDER_ID': import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      'VITE_FIREBASE_APP_ID': import.meta.env.VITE_FIREBASE_APP_ID
    };
    
    const missingKeys = Object.entries(requiredKeys)
      .filter(([_, value]) => !value)
      .map(([label]) => label);

    const isMissingConfig = missingKeys.length > 0;

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 flex-col gap-4">
        {isMissingConfig && (
          <div className="max-w-md w-full bg-amber-50 border border-amber-200 p-6 rounded-xl text-amber-800 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="text-lg">⚠️</span>
              <p>Configuração Incompleta</p>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              Pela sua captura de tela, os nomes das variáveis parecem estar cortados ou incorretos. 
              <strong> Os nomes no painel Secrets devem ser EXATAMENTE estes:</strong>
            </p>
            <ul className="text-[10px] font-mono bg-white/50 p-2 rounded border border-amber-100 flex flex-col gap-1">
              {Object.keys(requiredKeys).map(key => (
                <li key={key} className={requiredKeys[key as keyof typeof requiredKeys] ? 'text-green-600' : 'text-red-600'}>
                  {requiredKeys[key as keyof typeof requiredKeys] ? '✅' : '❌'} {key}
                </li>
              ))}
            </ul>
            <p className="text-[10px] font-medium mt-1">
              Dica: No seu print, o <i>STORAGE_BUCKET</i> parece estar sem o prefixo VITE_FIREBASE_.
            </p>
          </div>
        )}
        {!isMissingConfig && !firebaseReady && (
          <div className="max-w-md w-full bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-xs font-bold">
            <p>❌ Erro de Conexão: As chaves estão presentes, mas o Firebase recusou a conexão. Verifique se os valores estão corretos.</p>
          </div>
        )}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl shadow-blue-100 border border-gray-100 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200 mb-4">
              <GraduationCap className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Gestor de Estudos</h1>
            <p className="text-gray-500 font-medium text-sm">
              {authMode === 'login' ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-semibold"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-semibold"
                  placeholder="sua senha"
                />
              </div>
            </div>

            {authError && (
              <p className="text-red-500 text-[10px] font-bold text-center px-4">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-gray-200 py-3.5 rounded-2xl font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>

          <p className="text-center text-xs text-gray-500 font-bold">
            {authMode === 'login' ? 'Não tem conta?' : 'Já tem uma conta?'}
            <button 
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-blue-600 ml-1 hover:underline"
            >
              {authMode === 'login' ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 flex flex-col sticky top-0 h-screen z-40",
          sidebarCollapsed ? "w-20 p-4" : "w-64 p-6"
        )}
      >
        <div className="flex items-center justify-between mb-10 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex-shrink-0">
              <GraduationCap className="text-white" size={24} />
            </div>
            {!sidebarCollapsed && (
              <span className="font-black text-lg tracking-tight truncate dark:text-white">EduManager</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button 
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <button 
            onClick={() => setSidebarCollapsed(false)}
            className="mb-8 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 mx-auto transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        )}

        <nav className="space-y-1.5 flex-1">
          <button
            onClick={() => setView('history')}
            title="Histórico"
            className={cn(
              "w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
              sidebarCollapsed ? "justify-center px-2" : "gap-3",
              view === 'history' 
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <LayoutDashboard size={18} className={cn(view === 'history' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300")} />
            {!sidebarCollapsed && <span>Histórico</span>}
          </button>
          <button
            onClick={() => setView('subjects')}
            title="Temas/Matérias"
            className={cn(
              "w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
              sidebarCollapsed ? "justify-center px-2" : "gap-3",
              view === 'subjects' 
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <Settings size={18} className={cn(view === 'subjects' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300")} />
            {!sidebarCollapsed && <span>Temas/Matérias</span>}
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-auto space-y-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              sidebarCollapsed ? "justify-center px-2" : "gap-3"
            )}
            title={darkMode ? "Modo Claro" : "Modo Escuro"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {!sidebarCollapsed && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>

          <div className={cn(
            "bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl flex items-center transition-all",
            sidebarCollapsed ? "justify-center" : "gap-3 p-4"
          )}>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt={user.displayName || 'Usuário'} 
              className="w-10 h-10 rounded-xl border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => logout()}
            className={cn(
              "w-full flex items-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-sm font-bold transition-all",
              sidebarCollapsed ? "justify-center px-2 py-4" : "gap-3 px-4 py-3"
            )}
            title="Sair"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {view === 'history' ? 'Gestor de Estudos' : 'Base de Disciplinas'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              {view === 'history' 
                ? 'Organize sua rotina e acompanhe seu progresso.' 
                : 'Gerencie as matérias e os tópicos do seu edital.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {view === 'history' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Registro</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 lg:p-10 space-y-8 max-w-[1400px] mx-auto w-full flex-1 flex flex-col">
          {view === 'history' ? (
            <div className="flex-1 min-h-[600px] flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registros de Atividades</h3>
              </div>
              <StudyTable sessions={sessions} onDelete={handleDeleteSession} />
            </div>
          ) : (
            <SubjectsView 
              subjects={subjects}
              topics={topics}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddTopic={handleAddTopic}
              onDeleteTopic={handleDeleteTopic}
            />
          )}
        </div>
      </main>

      <AddSessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddSession}
        availableSubjects={subjects}
        availableTopics={topics}
        sessions={sessions}
      />
    </div>
  );
}
