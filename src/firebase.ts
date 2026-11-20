import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { clearCalendarToken, saveCalendarToken } from './lib/calendar';

const DB_ID = (firebaseConfig as any).firestoreDatabaseId || '(default)';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Cache offline do próprio Firestore: o app abre sem internet e sincroniza sozinho,
// sem a mescla manual com o localStorage que fazia itens apagados voltarem.
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  },
  DB_ID,
);

if (import.meta.env.VITE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export const googleProvider = () => {
  const p = new GoogleAuthProvider();
  p.addScope(CALENDAR_SCOPE);
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

export const googleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider());
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (cred?.accessToken) saveCalendarToken(cred.accessToken);
  return result.user;
};

/** Pede um novo acesso à agenda (o do Google vale ~1 hora). */
export const reconnectCalendar = async () => {
  const p = new GoogleAuthProvider();
  p.addScope(CALENDAR_SCOPE);
  const email = auth.currentUser?.email;
  if (email) p.setCustomParameters({ login_hint: email });
  const result = await signInWithPopup(auth, p);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (!cred?.accessToken) throw new Error('Sem acesso à agenda');
  saveCalendarToken(cred.accessToken);
  return cred.accessToken;
};

export const emailSignIn = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);

export const emailSignUp = async (email: string, pass: string, name: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name) await updateProfile(cred.user, { displayName: name });
  return cred.user;
};

export const logout = async () => {
  clearCalendarToken();
  await signOut(auth);
};
