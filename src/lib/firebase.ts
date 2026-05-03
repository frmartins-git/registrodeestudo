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

const firebaseConfig = {
  apiKey: "AIzaSyBUBxZye1beRjm77cxLSkYcOBHP4Dy0CPU",
  authDomain: "registrodeestudo.firebaseapp.com",
  projectId: "registrodeestudo",
  storageBucket: "registrodeestudo.firebasestorage.app",
  messagingSenderId: "135607888329",
  appId: "1:135607888329:web:6cb6eb5b64bf0ce1d9e018"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

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
