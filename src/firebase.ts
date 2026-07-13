import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-segundocrebro-2988f1ad-59dc-41a3-8b1f-4fcff64d1af6');

export { auth, db };

const provider = new GoogleAuthProvider();
// Add required Google Calendar readonly scope
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

const STORAGE_KEY = 'brain_google_access_token';
const STORAGE_TIME_KEY = 'brain_google_access_token_time';

// Helper to encrypt (obfuscate via base64 for basic protection in localStorage)
const encryptToken = (token: string): string => {
  try {
    return btoa(token);
  } catch (e) {
    return token;
  }
};

const decryptToken = (encrypted: string): string | null => {
  try {
    return atob(encrypted);
  } catch (e) {
    return null;
  }
};

// Retrieve persisted token if valid
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    const timeStr = localStorage.getItem(STORAGE_TIME_KEY);
    if (!encrypted) return null;

    // We no longer proactively delete the Google access token after 55 minutes,
    // making the Google credentials persistent. We only clear on manual logout
    // or when the API explicitly returns a 401 (handled on the frontend).
    return decryptToken(encrypted);
  } catch (e) {
    console.warn('localStorage read blocked in this iframe context:', e);
    return null;
  }
};

const saveStoredToken = (token: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, encryptToken(token));
    localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('localStorage write blocked in this iframe context:', e);
  }
};

const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIME_KEY);
  } catch (e) {
    console.warn('localStorage delete blocked in this iframe context:', e);
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = getStoredToken();

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const stored = getStoredToken();
      if (stored) {
        cachedAccessToken = stored;
        if (onAuthSuccess) onAuthSuccess(user, stored);
      } else if (!isSigningIn) {
        // Keeps user logged in to Firebase/Firestore sync but with no Calendar token
        cachedAccessToken = null;
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    saveStoredToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// General Login (Email & Password)
export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
};

export const emailSignUp = async (email: string, pass: string, name: string): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(credential.user, { displayName: name });
  return credential.user;
};

export const clearGoogleTokenOn401 = () => {
  cachedAccessToken = null;
  clearStoredToken();
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  clearStoredToken();
};
