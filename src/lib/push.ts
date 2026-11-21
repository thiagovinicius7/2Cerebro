import { arrayRemove, arrayUnion, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { nowIso } from './dates';

// Notificações das 12h e 18h. O aparelho guarda o "endereço" (token do Firebase Cloud
// Messaging) em users/{uid}/meta/push; quem envia é o GitHub Actions (scripts/notificar.ts).
// Banco: só grava quando o token é novo ou muda; nenhuma leitura.

const LS_KEY = '2c-push-token';
const swUrl = `${import.meta.env.BASE_URL}sw.js`;

export type PushState = 'on' | 'off' | 'blocked' | 'ios-install' | 'unsupported';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

const messaging = async () => {
  const m = await import('firebase/messaging');
  if (!(await m.isSupported())) return null;
  const { getApp } = await import('firebase/app');
  return { m, msg: m.getMessaging(getApp()) };
};

export const pushState = async (): Promise<PushState> => {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!ok || !(await messaging())) return isIOS() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && localStorage.getItem(LS_KEY) ? 'on' : 'off';
};

const ref = (uid: string) => doc(db, 'users', uid, 'meta', 'push');

const currentToken = async () => {
  const fm = await messaging();
  if (!fm) throw new Error('Este navegador não recebe notificações.');
  const reg = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
  await navigator.serviceWorker.ready;
  return fm.m.getToken(fm.msg, { serviceWorkerRegistration: reg });
};

const saveToken = async (uid: string, token: string, old: string | null) => {
  await setDoc(
    ref(uid),
    { tokens: arrayUnion(token), updatedAt: nowIso() },
    { merge: true },
  );
  if (old && old !== token) await setDoc(ref(uid), { tokens: arrayRemove(old) }, { merge: true });
  localStorage.setItem(LS_KEY, token);
};

export const enablePush = async (uid: string) => {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permissão de notificação negada.');
  const token = await currentToken();
  if (!token) throw new Error('Não consegui ativar as notificações.');
  await saveToken(uid, token, localStorage.getItem(LS_KEY));
};

export const disablePush = async (uid: string) => {
  const old = localStorage.getItem(LS_KEY);
  localStorage.removeItem(LS_KEY);
  try {
    const fm = await messaging();
    if (fm) await fm.m.deleteToken(fm.msg);
  } catch (e) {
    console.error(e);
  }
  if (old) await setDoc(ref(uid), { tokens: arrayRemove(old), updatedAt: nowIso() }, { merge: true });
};

/** Ao abrir o app: se o token mudou, troca no banco. Se não mudou, não grava nada. */
export const refreshPush = async (uid: string) => {
  try {
    const old = localStorage.getItem(LS_KEY);
    if (!old || !('Notification' in window) || Notification.permission !== 'granted') return;
    const token = await currentToken();
    if (token && token !== old) await saveToken(uid, token, old);
  } catch (e) {
    console.error(e);
  }
};
