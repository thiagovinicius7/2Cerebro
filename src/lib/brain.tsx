import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ItemStatus, Note, Routine, Task } from './types';
import { removeItem, saveItem, useCollection } from './db';
import { addDays, formatDayLabel, newId, nowIso, todayStr } from './dates';
import { nextDueDate } from './schedule';
import { deleteMedia } from './media';
import { setEventMark } from './days';
import { useToast } from '../components/ui';

type Editing =
  | { kind: 'task'; item: Task | null; preset?: Partial<Task> }
  | { kind: 'note'; item: Note | null; preset?: Partial<Note> }
  | { kind: 'routine'; item: Routine | null; preset?: Partial<Routine> }
  | null;

interface BrainCtx {
  uid: string;
  tasks: Task[];
  notes: Note[];
  routines: Routine[];
  loaded: boolean;
  synced: boolean;
  allTags: string[];
  editing: Editing;
  setEditing: (e: Editing) => void;
  saveTask: (t: Task) => void;
  toggleTask: (t: Task) => void;
  deleteTask: (t: Task) => void;
  saveNote: (n: Note) => void;
  deleteNote: (n: Note) => void;
  toggleChecklist: (n: Note, itemId: string) => void;
  saveRoutine: (r: Routine) => void;
  toggleRoutine: (r: Routine, date: string) => void;
  setRoutineStatus: (r: Routine, date: string, status: ItemStatus | null) => void;
  toggleRoutineItem: (r: Routine, date: string, itemId: string) => void;
  setEventStatus: (date: string, eventId: string, status: ItemStatus | null) => void;
  cancelTask: (t: Task) => void;
  postponeTask: (t: Task) => void;
  deleteRoutine: (r: Routine) => void;
  newTask: (preset?: Partial<Task>) => Task;
  newNote: (preset?: Partial<Note>) => Note;
  newRoutine: (preset?: Partial<Routine>) => Routine;
}

const Ctx = createContext<BrainCtx | null>(null);
export const useBrain = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBrain fora do provider');
  return c;
};

export function BrainProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const toast = useToast();
  const t = useCollection<Task>(uid, 'tasks');
  const n = useCollection<Note>(uid, 'notes');
  const r = useCollection<Routine>(uid, 'routines');
  const [editing, setEditing] = useState<Editing>(null);

  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    [...t.items, ...n.items].forEach(i => (i.tags || []).forEach(tag => count.set(tag, (count.get(tag) || 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [t.items, n.items]);

  const saveTask = useCallback((task: Task) => saveItem(uid, 'tasks', task), [uid]);
  const saveNote = useCallback((note: Note) => saveItem(uid, 'notes', note), [uid]);
  const saveRoutine = useCallback((rt: Routine) => saveItem(uid, 'routines', rt), [uid]);

  const toggleTask = useCallback(
    (task: Task) => {
      if (task.done) {
        saveTask({ ...task, done: false, doneAt: null, cancelled: false });
        return;
      }
      if (task.recurrence && task.dueDate) {
        const next = nextDueDate(task.dueDate, task.recurrence);
        saveTask({
          ...task,
          dueDate: next,
          history: [...(task.history || []).slice(-60), { date: task.dueDate, doneAt: nowIso() }],
        });
        toast(`Feito! Próxima: ${formatDayLabel(next).toLowerCase()}`, { label: 'Desfazer', run: () => saveTask(task) });
      } else {
        saveTask({ ...task, done: true, doneAt: nowIso() });
        toast('Tarefa concluída', { label: 'Desfazer', run: () => saveTask(task) });
      }
    },
    [saveTask, toast],
  );

  const deleteTask = useCallback(
    (task: Task) => {
      removeItem(uid, 'tasks', task.id);
      toast('Tarefa apagada', { label: 'Desfazer', run: () => saveTask(task) });
    },
    [uid, saveTask, toast],
  );

  const deleteNote = useCallback(
    (note: Note) => {
      removeItem(uid, 'notes', note.id);
      // As fotos só são apagadas depois que o "Desfazer" some
      const media = note.attachments.filter(a => a.mediaId).map(a => a.mediaId!);
      let undone = false;
      toast('Nota apagada', {
        label: 'Desfazer',
        run: () => {
          undone = true;
          saveNote(note);
        },
      });
      setTimeout(() => !undone && media.forEach(id => deleteMedia(uid, id)), 7000);
    },
    [uid, saveNote, toast],
  );

  const toggleChecklist = useCallback(
    (note: Note, itemId: string) =>
      saveNote({ ...note, checklist: note.checklist.map(i => (i.id === itemId ? { ...i, done: !i.done } : i)) }),
    [saveNote],
  );

  // Subitens: guarda só os últimos 60 dias de marcações
  const pruneChecks = (checks: Record<string, string[]>) => {
    const limit = addDays(todayStr(), -60);
    return Object.fromEntries(Object.entries(checks).filter(([d, ids]) => d >= limit && ids.length));
  };

  const setRoutineStatus = useCallback(
    (rt: Routine, date: string, status: ItemStatus | null) => {
      const history = { ...(rt.history || {}) };
      if (!status) delete history[date];
      else history[date] = status === 'done' ? true : status;
      const next: Routine = { ...rt, history };
      if (rt.items?.length) {
        const checks = { ...(rt.checks || {}) };
        if (status === 'done') checks[date] = rt.items.map(i => i.id);
        else delete checks[date];
        next.checks = pruneChecks(checks);
      }
      saveRoutine(next);
    },
    [saveRoutine],
  );

  const toggleRoutineItem = useCallback(
    (rt: Routine, date: string, itemId: string) => {
      const items = rt.items || [];
      const cur = rt.checks?.[date] || [];
      const nextIds = cur.includes(itemId) ? cur.filter(i => i !== itemId) : [...cur, itemId];
      const history = { ...(rt.history || {}) };
      const all = items.length > 0 && items.every(i => nextIds.includes(i.id));
      if (all) history[date] = true;
      else if (history[date] === true) delete history[date];
      saveRoutine({ ...rt, history, checks: pruneChecks({ ...(rt.checks || {}), [date]: nextIds }) });
    },
    [saveRoutine],
  );

  // Toque simples: marca feito; se já tinha qualquer estado, limpa
  const toggleRoutine = useCallback(
    (rt: Routine, date: string) => setRoutineStatus(rt, date, rt.history?.[date] ? null : 'done'),
    [setRoutineStatus],
  );

  const setEventStatus = useCallback(
    (date: string, eventId: string, status: ItemStatus | null) => setEventMark(uid, date, eventId, status),
    [uid],
  );

  const cancelTask = useCallback(
    (task: Task) => {
      saveTask({ ...task, done: true, cancelled: true, doneAt: nowIso() });
      toast('Tarefa cancelada', { label: 'Desfazer', run: () => saveTask(task) });
    },
    [saveTask, toast],
  );

  /** Não feita: tarefa única vai para amanhã; tarefa repetida pula esta vez. */
  const postponeTask = useCallback(
    (task: Task) => {
      const today = todayStr();
      if (task.recurrence && task.dueDate) {
        const next = nextDueDate(task.dueDate, task.recurrence);
        saveTask({
          ...task,
          dueDate: next,
          history: [...(task.history || []).slice(-60), { date: task.dueDate, doneAt: nowIso(), status: 'skip' }],
        });
        toast(`Pulada. Próxima: ${formatDayLabel(next).toLowerCase()}`, { label: 'Desfazer', run: () => saveTask(task) });
      } else {
        const base = task.dueDate && task.dueDate > today ? task.dueDate : today;
        saveTask({ ...task, dueDate: addDays(base, 1) });
        toast('Adiada para amanhã', { label: 'Desfazer', run: () => saveTask(task) });
      }
    },
    [saveTask, toast],
  );

  const deleteRoutine = useCallback(
    (rt: Routine) => {
      removeItem(uid, 'routines', rt.id);
      toast('Item da rotina apagado', { label: 'Desfazer', run: () => saveRoutine(rt) });
    },
    [uid, saveRoutine, toast],
  );

  const newTask = useCallback(
    (preset: Partial<Task> = {}): Task => ({
      id: newId(),
      title: '',
      notes: '',
      dueDate: null,
      time: null,
      recurrence: null,
      amount: null,
      tags: [],
      done: false,
      history: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...preset,
    }),
    [],
  );

  const newNote = useCallback(
    (preset: Partial<Note> = {}): Note => ({
      id: newId(),
      title: '',
      text: '',
      checklist: [],
      color: null,
      pinned: false,
      tags: [],
      attachments: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...preset,
    }),
    [],
  );

  const newRoutine = useCallback(
    (preset: Partial<Routine> = {}): Routine => ({
      id: newId(),
      title: '',
      notes: '',
      pattern: 'days',
      weekDays: [],
      time: null,
      endTime: null,
      novenaMonthly: true,
      novenaStartDay: 1,
      startDate: todayStr(),
      durationDays: 40,
      category: '',
      history: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...preset,
    }),
    [],
  );

  const value: BrainCtx = {
    uid,
    tasks: t.items,
    notes: n.items,
    routines: r.items,
    loaded: t.loaded && n.loaded && r.loaded,
    synced: !t.fromCache && !n.fromCache && !r.fromCache,
    allTags,
    editing,
    setEditing,
    saveTask,
    toggleTask,
    deleteTask,
    saveNote,
    deleteNote,
    toggleChecklist,
    saveRoutine,
    toggleRoutine,
    setRoutineStatus,
    toggleRoutineItem,
    setEventStatus,
    cancelTask,
    postponeTask,
    deleteRoutine,
    newTask,
    newNote,
    newRoutine,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
