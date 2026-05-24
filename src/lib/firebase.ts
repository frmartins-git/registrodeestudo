import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const fallbacks: Record<string, string> = {
  VITE_FIREBASE_API_KEY: "AIzaSyBUBxZye1beRjm77cxLSkYcOBHP4Dy0CPU",
  VITE_FIREBASE_AUTH_DOMAIN: "registrodeestudo.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "registrodeestudo",
  VITE_FIREBASE_STORAGE_BUCKET: "registrodeestudo.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "135607888329",
  VITE_FIREBASE_APP_ID: "1:135607888329:web:6cb6eb5b64bf0ce1d9e018",
};

const getEnvVar = (standardKey: string, alternateKeys: string[]): string => {
  // Try standard first
  let val = import.meta.env[standardKey];
  if (val) return String(val).trim();
  
  // Try alternate keys
  for (const alt of alternateKeys) {
    const altVal = import.meta.env[alt];
    if (altVal) return String(altVal).trim();
  }
  
  // Look for partial matches in all keys of import.meta.env
  try {
    const keys = Object.keys(import.meta.env);
    for (const k of keys) {
      if (k.startsWith('VITE_FIREBASE_')) {
        const simplifiedK = k.replace('VITE_FIREBASE_', '');
        const simplifiedStandard = standardKey.replace('VITE_FIREBASE_', '');
        if (simplifiedStandard.startsWith(simplifiedK) || simplifiedK.startsWith(simplifiedStandard)) {
          return String(import.meta.env[k]).trim();
        }
      }
      // Special check for STORAGE_BUCKET or SE_STORAGE_BUCKET
      if (k.includes('STORAGE_BUCKET') && standardKey.includes('STORAGE_BUCKET')) {
        return String(import.meta.env[k]).trim();
      }
    }
  } catch (e) {
    // Fallback if Object.keys fails
  }

  // Use hardcoded fallback for default project keys if no env variables exist
  if (fallbacks[standardKey]) {
    return fallbacks[standardKey];
  }
  
  return '';
};

let apiKey = getEnvVar('VITE_FIREBASE_API_KEY', ['VITE_FIREBASE_API_K']);
if (apiKey) {
  // Auto-correct common copy-paste typo: 'AlzaSy' instead of 'AIzaSy' (lowercase L instead of uppercase I)
  if (apiKey.startsWith('AlzaSy')) {
    apiKey = 'AIzaSy' + apiKey.slice(6);
  }
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', ['VITE_FIREBASE_AUTH']),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', ['VITE_FIREBASE_PROJI', 'VITE_FIREBASE_PROJ']),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', ['SE_STORAGE_BUCKET']),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', ['VITE_FIREBASE_MESS']),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', ['VITE_FIREBASE_APP_I', 'VITE_FIREBASE_APP_II'])
};

// Check if we have at least an API Key before initializing
const hasMinimumConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app;
try {
  if (hasMinimumConfig) {
    app = initializeApp(firebaseConfig);
  } else {
    // Initialize with a dummy app to prevent crashes in the rest of the code
    app = initializeApp({
      apiKey: "dummy",
      authDomain: "dummy",
      projectId: "dummy-project",
      storageBucket: "dummy",
      messagingSenderId: "dummy",
      appId: "dummy"
    });
    console.warn("⚠️ Firebase inicializado com config dummy - Faltam chaves no painel Secrets.");
  }
} catch (e) {
  console.error("❌ Falha crítica ao inicializar Firebase:", e);
}

export const auth = getAuth(app!);
export const db = getFirestore(app!);
export const googleProvider = new GoogleAuthProvider();
export { firebaseConfig, hasMinimumConfig };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };

  if (message.toLowerCase().includes('permission-denied') || message.toLowerCase().includes('insufficient permissions')) {
    alert("ERRO DE PERMISSÃO: Suas regras do Firestore estão bloqueando esta ação.\n\nCertifique-se de que as regras no console do Firebase foram atualizadas para permitir leitura/escrita com o 'userId'.");
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Conectado ao Firestore com sucesso.");
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error("Verifique sua configuração do Firebase.");
    }
  }
}

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Firebase Auth Error:", error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("ERRO DE DOMÍNIO: Adicione o domínio atual em Authentication > Settings > Authorized Domains no console Firebase.");
    }
    throw error;
  }
};

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
