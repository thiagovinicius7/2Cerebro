import { deleteField, doc, getDocFromServer, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Note, Routine, Task } from './types';
import { nowIso, todayStr, toDateStr } from './dates';

// Converte o documento único da versão 1 (users/{uid}) para documentos separados.
// O documento antigo NÃO é apagado: continua lá como backup. IDs fixos (derivados dos
// antigos) fazem a migração poder rodar de novo sem duplicar nada.

const SCHEMA = 2;

const arr = (v: any): any[] => (Array.isArray(v) ? v.filter(Boolean) : []);
const tagList = (...vals: any[]) =>
  Array.from(
    new Set(
      vals
        .flat()
        .filter(v => typeof v === 'string' && v.trim())
        .map((v: string) => v.trim().toLowerCase()),
    ),
  );
const safeId = (s: any) => String(s ?? Math.random().toString(36).slice(2)).replace(/[\/\s]+/g, '_').slice(0, 120);
const iso = (v: any) => (typeof v === 'string' && v ? v : nowIso());

export interface MigrationResult {
  migrated: boolean;
  counts?: { tasks: number; notes: number; routines: number };
}

export const buildV2FromV1 = (data: any, localCustomEvents: any[] = []) => {
  const notes: Note[] = [];
  const tasks: Task[] = [];
  const routines: Routine[] = [];

  for (const n of arr(data.notes)) {
    notes.push({
      id: `n-${safeId(n.id)}`,
      title: n.title || '',
      text: n.content || '',
      checklist: [],
      color: null,
      pinned: false,
      tags: tagList(arr(n.tags), n.category),
      attachments: arr(n.media).map((m: any, i: number) => ({
        id: safeId(m.id || `m${i}`),
        type: m.type === 'image' || m.type === 'video' ? m.type : 'link',
        name: m.name || m.url || 'Anexo',
        url: m.url,
      })),
      createdAt: iso(n.createdAt),
      updatedAt: iso(n.createdAt),
    });
  }

  for (const c of arr(data.checklists)) {
    notes.push({
      id: `c-${safeId(c.id)}`,
      title: c.title || '',
      text: '',
      checklist: arr(c.items).map((it: any, i: number) => ({
        id: safeId(it.id || `i${i}`),
        text: it.text || '',
        done: !!it.done,
      })),
      color: null,
      pinned: false,
      tags: tagList(c.category),
      attachments: [],
      createdAt: iso(c.createdAt),
      updatedAt: iso(c.createdAt),
    });
  }

  for (const s of arr(data.stickyNotes)) {
    if (String(s.id || '').startsWith('stick_welcome')) continue; // post-its de exemplo
    const lines = String(s.content || '').split('\n');
    notes.push({
      id: `s-${safeId(s.id)}`,
      title: '',
      text: lines.join('\n'),
      checklist: [],
      color: ['yellow', 'pink', 'blue', 'green', 'purple', 'amber'].includes(s.color) ? s.color : 'yellow',
      pinned: !!s.pinned,
      tags: tagList(s.tag),
      attachments: [],
      createdAt: iso(s.createdAt),
      updatedAt: iso(s.createdAt),
    });
  }

  for (const b of arr(data.bills)) {
    const due = typeof b.dueDate === 'string' ? b.dueDate.slice(0, 10) : null;
    const recurring = !!b.recurring && !b.paid;
    tasks.push({
      id: `b-${safeId(b.id)}`,
      title: b.title || 'Conta',
      notes: b.notes || '',
      dueDate: due,
      time: null,
      amount: typeof b.amount === 'number' ? b.amount : Number(b.amount) || null,
      recurrence: recurring && due ? { freq: 'monthly', monthDay: Number(due.slice(8, 10)) } : null,
      tags: ['conta'],
      done: !!b.paid,
      doneAt: b.paid ? (b.paidAt || (due ? `${due}T12:00:00` : nowIso())) : null,
      history: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  for (const e of arr(localCustomEvents)) {
    const start = e.start?.dateTime || e.start?.date;
    if (!start) continue;
    const d = new Date(start);
    tasks.push({
      id: `e-${safeId(e.id)}`,
      title: e.summary || 'Compromisso',
      notes: [e.description, e.location].filter(Boolean).join('\n'),
      dueDate: e.start?.dateTime ? toDateStr(d) : String(e.start.date).slice(0, 10),
      time: e.start?.dateTime ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null,
      recurrence: null,
      amount: null,
      tags: ['compromisso'],
      done: false,
      history: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  for (const h of arr(data.habits)) {
    const base: Routine = {
      id: `h-${safeId(h.id)}`,
      title: h.title || 'Hábito',
      pattern: 'days',
      weekDays: h.frequency === 'weekly' && arr(h.weekDays).length ? arr(h.weekDays) : [],
      time: h.time || null,
      endTime: null,
      category: h.category || '',
      history: h.history && typeof h.history === 'object' ? h.history : {},
      createdAt: iso(h.createdAt),
      updatedAt: iso(h.createdAt),
    };
    if (h.frequency === 'novena') {
      base.pattern = 'novena';
      base.novenaMonthly = h.novenaRepeatMonthly ?? true;
      base.novenaStartDay = h.novenaStartDay || 9;
      base.startDate = h.novenaStart || iso(h.createdAt).slice(0, 10);
      base.time = null;
    } else if (h.frequency === 'challenge') {
      base.pattern = 'challenge';
      base.startDate = h.startDate || iso(h.createdAt).slice(0, 10);
      base.durationDays = Number(h.durationDays) || 40;
    }
    routines.push(base);
  }

  // Na v1 cada bloco da rotina existia uma vez por dia da semana. Agora vira um só.
  const groups = new Map<string, any[]>();
  for (const r of arr(data.routine)) {
    const key = `${(r.title || '').trim().toLowerCase()}|${r.time || ''}|${r.endTime || ''}`;
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  for (const items of groups.values()) {
    const first = items[0];
    const history: Record<string, boolean> = {};
    items.forEach(it => Object.assign(history, it.history || {}));
    const days = Array.from(new Set(items.map(it => Number(it.dayOfWeek)).filter(n => n >= 0 && n <= 6))).sort();
    routines.push({
      id: `r-${safeId(first.id)}`,
      title: first.title || 'Rotina',
      notes: first.description || '',
      pattern: 'days',
      weekDays: days.length === 7 ? [] : days,
      time: first.time || null,
      endTime: first.endTime || null,
      category: 'rotina',
      history,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  return { notes, tasks, routines };
};

export const migrateIfNeeded = async (uid: string): Promise<MigrationResult> => {
  const metaRef = doc(db, 'users', uid, 'meta', 'app');
  const userRef = doc(db, 'users', uid);
  let meta, old;
  try {
    meta = await getDocFromServer(metaRef);
    if (meta.exists() && (meta.data().schema || 0) >= SCHEMA) return { migrated: false };
    old = await getDocFromServer(userRef);
  } catch (e) {
    console.warn('Migração adiada (sem conexão):', e);
    return { migrated: false };
  }

  let localEvents: any[] = [];
  try {
    localEvents = JSON.parse(localStorage.getItem('brain_custom_events') || '[]');
  } catch {
    /* nada */
  }

  const data = old.exists() ? old.data() : {};
  const { notes, tasks, routines } = buildV2FromV1(data, localEvents);

  const writes: [string, { id: string }][] = [
    ...notes.map(n => ['notes', n] as [string, { id: string }]),
    ...tasks.map(t => ['tasks', t] as [string, { id: string }]),
    ...routines.map(r => ['routines', r] as [string, { id: string }]),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    for (const [col, item] of writes.slice(i, i + 400)) {
      const { id, ...rest } = item as any;
      batch.set(doc(db, 'users', uid, col, id), rest);
    }
    await batch.commit();
  }

  const counts = { tasks: tasks.length, notes: notes.length, routines: routines.length };
  await setDoc(metaRef, { schema: SCHEMA, migratedAt: nowIso(), migratedOn: todayStr(), counts });

  // O token do Google ficava gravado no banco; tira (o resto do documento antigo fica como backup).
  if (old.exists() && 'googleAccessToken' in data) {
    updateDoc(userRef, { googleAccessToken: deleteField() }).catch(console.warn);
  }
  return { migrated: old.exists(), counts };
};
