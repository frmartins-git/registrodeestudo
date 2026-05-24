import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  GraduationCap, 
  LayoutDashboard, 
  Settings, 
  Loader2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  LogIn,
  Mail,
  Lock,
  Sparkles,
  Eye,
  EyeOff
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
  logout,
  loginWithEmail,
  handleFirestoreError,
  OperationType,
  testConnection,
  firebaseConfig,
  hasMinimumConfig
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
  
  // Login Screen States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        const isGuest = localStorage.getItem('auth_guest') === 'true';
        if (isGuest) {
          setUser({
            uid: 'guest-local-user',
            displayName: 'Estudante Concurseiro',
            email: 'estudo@local.com',
            photoURL: null,
            emailVerified: true,
          } as any);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
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

    if (user.uid === 'guest-local-user') {
      const localSubjects = JSON.parse(localStorage.getItem('local_subjects') || '[]');
      const localTopics = JSON.parse(localStorage.getItem('local_topics') || '[]');
      const localSessions = JSON.parse(localStorage.getItem('local_sessions') || '[]');
      setSubjects(localSubjects);
      setTopics(localTopics);
      setSessions(localSessions);
      return () => {};
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

  const handleAddSession = async (data: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!user) return;
    if (user.uid === 'guest-local-user') {
      const newSession: StudySession = {
        ...data,
        id: 'session-' + Date.now(),
        userId: user.uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      localStorage.setItem('local_sessions', JSON.stringify(updated));
      return;
    }
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
    if (user?.uid === 'guest-local-user') {
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      localStorage.setItem('local_sessions', JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'sessions/' + id);
    }
  };

  const handleAddSubject = async (name: string) => {
    if (!user) return;
    if (user.uid === 'guest-local-user') {
      const newSubject: Subject = {
        id: 'subject-' + Date.now(),
        name,
        userId: user.uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      const updated = [...subjects, newSubject];
      setSubjects(updated);
      localStorage.setItem('local_subjects', JSON.stringify(updated));
      return;
    }
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
    if (user?.uid === 'guest-local-user') {
      const updatedSubjects = subjects.filter(s => s.id !== id);
      setSubjects(updatedSubjects);
      localStorage.setItem('local_subjects', JSON.stringify(updatedSubjects));

      const updatedTopics = topics.filter(t => t.subjectId !== id);
      setTopics(updatedTopics);
      localStorage.setItem('local_topics', JSON.stringify(updatedTopics));

      const updatedSessions = sessions.filter(s => s.subjectId !== id);
      setSessions(updatedSessions);
      localStorage.setItem('local_sessions', JSON.stringify(updatedSessions));
      return;
    }
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
    if (user.uid === 'guest-local-user') {
      const newTopic: Topic = {
        id: 'topic-' + Date.now(),
        subjectId,
        name,
        userId: user.uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      const updated = [...topics, newTopic];
      setTopics(updated);
      localStorage.setItem('local_topics', JSON.stringify(updated));
      return;
    }
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
    if (user?.uid === 'guest-local-user') {
      const updated = topics.filter(t => t.id !== id);
      setTopics(updated);
      localStorage.setItem('local_topics', JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'topics', id));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'topics/' + id);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Por favor, preencha todos os campos.");
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginWithEmail(email, password);
      localStorage.removeItem('auth_guest');
    } catch (error: any) {
      console.error("Erro na autenticação:", error);
      let translateMsg = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        translateMsg = "E-mail ou senha incorretos.";
      } else if (error.code === 'auth/invalid-email') {
        translateMsg = "Formato de e-mail inválido.";
      }
      setAuthError(translateMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEnterAsGuest = () => {
    localStorage.setItem('auth_guest', 'true');
    setUser({
      uid: 'guest-local-user',
      displayName: 'Estudante Concurseiro',
      email: 'estudo@local.com',
      photoURL: null,
      emailVerified: true,
    } as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    const requiredKeys = {
      'VITE_FIREBASE_API_KEY': firebaseConfig.apiKey,
      'VITE_FIREBASE_AUTH_DOMAIN': firebaseConfig.authDomain,
      'VITE_FIREBASE_PROJECT_ID': firebaseConfig.projectId,
      'VITE_FIREBASE_STORAGE_BUCKET': firebaseConfig.storageBucket,
      'VITE_FIREBASE_MESSAGING_SENDER_ID': firebaseConfig.messagingSenderId,
      'VITE_FIREBASE_APP_ID': firebaseConfig.appId
    };
    
    const missingKeys = Object.entries(requiredKeys)
      .filter(([_, value]) => !value)
      .map(([label]) => label);

    const isMissingConfig = !hasMinimumConfig || missingKeys.length > 0;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200 dark:shadow-none mb-3">
              <GraduationCap className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">EduManager</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Sua rotina inteligente de estudos para concursos
            </p>
          </div>

          <div className="flex flex-col gap-1 text-center bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-100/50 dark:border-gray-800/50">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Acesse sua Conta</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Entre com seu e-mail e senha para salvar e sincronizar sua rotina
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-2xl outline-none transition-all text-sm font-semibold text-gray-900 dark:text-white"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-2xl outline-none transition-all text-sm font-semibold text-gray-900 dark:text-white"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-red-500 text-xs font-bold text-center px-4 bg-red-50 dark:bg-red-950/20 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:pointer-events-none"
            >
              {authLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center gap-4 py-1">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
          </div>

          <div className="text-center">
            <button
              onClick={handleEnterAsGuest}
              className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Continuar como visitante (Modo Local Offline)
            </button>
          </div>

          {/* Config issues warning */}
          {isMissingConfig && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl text-amber-800 dark:text-amber-300 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold select-none">
                <span>⚠️</span>
                <span>Configurações do Firebase Incompletas</span>
              </div>
              <p className="opacity-95 leading-relaxed leading-snug">
                Faltam chaves de ambiente necessárias no painel <strong>Secrets</strong> do projeto para as funcionalidades em nuvem. 
                Use o botão <i>Continuar como visitante</i> ou configure as seguintes chaves pendentes:
              </p>
              <ul className="font-mono text-[9px] bg-white/60 dark:bg-black/20 p-2 rounded border border-amber-100 dark:border-amber-950 flex flex-col gap-1">
                {Object.keys(requiredKeys).map(key => (
                  <li key={key} className={requiredKeys[key as keyof typeof requiredKeys] ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400 font-bold'}>
                    {requiredKeys[key as keyof typeof requiredKeys] ? '✅' : '❌'} {key}
                  </li>
                ))}
              </ul>
            </div>
          )}
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

          <div className="flex flex-col gap-2">
            <div className={cn(
              "bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl flex items-center transition-all",
              sidebarCollapsed ? "justify-center" : "gap-3 p-4"
            )}>
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'Estudante'}`} 
                alt={user.displayName || 'Estudante'} 
                className="w-10 h-10 rounded-xl border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.displayName || 'Estudante'}</p>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {user.email || 'Modo Sem Login'}
                    </p>
                    {user.uid === 'guest-local-user' && (
                      <span className="text-[8px] max-w-max text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-1 py-0.5 rounded font-semibold">
                        Modo Visitante
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={async () => {
                localStorage.removeItem('auth_guest');
                if (user.uid !== 'guest-local-user') {
                  try {
                    await logout();
                  } catch (err) {
                    console.error("Erro ao deslogar:", err);
                  }
                }
                setUser(null);
              }}
              className={cn(
                "w-full flex items-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-all py-2.5",
                sidebarCollapsed ? "justify-center" : "gap-3 px-4"
              )}
              title="Sair da Conta"
            >
              <LogOut size={16} />
              {!sidebarCollapsed && <span>Sair da Conta</span>}
            </button>
          </div>
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
