import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { todayStr } from './dates';
import { buildV2FromV1 } from './migrate';

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

const localCustomEvents = () => {
  try {
    return JSON.parse(localStorage.getItem('brain_custom_events') || '[]');
  } catch {
    return [];
  }
};

/**
 * Baixa tudo num arquivo JSON: a versão nova (se existir) e o documento da versão antiga.
 * Cada parte é lida separadamente, então uma falta de permissão numa delas não impede o resto.
 * Fotos enviadas pelo app vão junto (como texto).
 */
export const exportBackup = async (uid: string) => {
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), schema: 2 };
  let got = 0;
  for (const c of ['tasks', 'notes', 'routines', 'media'] as const) {
    try {
      const snap = await getDocs(collection(db, 'users', uid, c));
      out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      got += snap.size;
    } catch {
      out[c] = [];
    }
  }
  try {
    const old = await getDoc(doc(db, 'users', uid));
    if (old.exists()) {
      const data = { ...old.data() };
      delete (data as any).googleAccessToken;
      out.versaoAntiga = data;
      got++;
    }
  } catch {
    /* sem acesso ao documento antigo */
  }
  const events = localCustomEvents();
  if (events.length) out.eventosLocais = events;
  if (!got && !events.length) throw new Error('Nada encontrado para salvar.');
  download(`segundo-cerebro-backup-${todayStr()}.json`, out);
};

/**
 * Importa um backup para a conta atual. Usa os mesmos IDs, então importar de novo
 * atualiza em vez de duplicar. Se o backup só tiver a versão antiga, converte.
 */
export const importBackup = async (uid: string, file: File) => {
  const data = JSON.parse(await file.text());
  let tasks: any[] = Array.isArray(data.tasks) ? data.tasks : [];
  let notes: any[] = Array.isArray(data.notes) ? data.notes : [];
  let routines: any[] = Array.isArray(data.routines) ? data.routines : [];
  const media: any[] = Array.isArray(data.media) ? data.media : [];

  if (!tasks.length && !notes.length && !routines.length && data.versaoAntiga) {
    const conv = buildV2FromV1(data.versaoAntiga, data.eventosLocais || localCustomEvents());
    tasks = conv.tasks;
    notes = conv.notes;
    routines = conv.routines;
  }
  if (!tasks.length && !notes.length && !routines.length) throw new Error('O arquivo não tem dados do Segundo Cérebro.');

  const writes: [string, any][] = [
    ...media.map(m => ['media', m] as [string, any]),
    ...tasks.map(t => ['tasks', t] as [string, any]),
    ...notes.map(n => ['notes', n] as [string, any]),
    ...routines.map(r => ['routines', r] as [string, any]),
  ];
  // Fotos são grandes: lotes menores
  let batch = writeBatch(db);
  let size = 0;
  let count = 0;
  for (const [col, item] of writes) {
    const { id, ...rest } = item;
    const approx = JSON.stringify(rest).length;
    if (count >= 400 || size + approx > 8_000_000) {
      await batch.commit();
      batch = writeBatch(db);
      size = 0;
      count = 0;
    }
    batch.set(doc(db, 'users', uid, col, String(id)), rest);
    size += approx;
    count++;
  }
  if (count) await batch.commit();
  await writeBatch(db)
    .set(doc(db, 'users', uid, 'meta', 'app'), { schema: 2, importedAt: new Date().toISOString() }, { merge: true })
    .commit();
  return { tasks: tasks.length, notes: notes.length, routines: routines.length };
};
