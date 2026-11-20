import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { todayStr } from './dates';

const download = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Baixa tudo (versão nova + documento da versão antiga) num arquivo JSON. Fotos não entram. */
export const exportBackup = async (uid: string) => {
  const cols = ['tasks', 'notes', 'routines'] as const;
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), schema: 2 };
  for (const c of cols) {
    const snap = await getDocs(collection(db, 'users', uid, c));
    out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const old = await getDoc(doc(db, 'users', uid));
  if (old.exists()) {
    const data = { ...old.data() };
    delete (data as any).googleAccessToken;
    out.versaoAntiga = data;
  }
  download(`segundo-cerebro-backup-${todayStr()}.json`, out);
};
