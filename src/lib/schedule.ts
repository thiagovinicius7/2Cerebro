import { ItemStatus, Recurrence, Routine, Task } from './types';
import { addDays, addMonths, daysInMonth, diffDays, parseDate, todayStr, weekday, WEEKDAYS_SHORT } from './dates';

// ---------- Rotina (hábitos, blocos, novenas, desafios) ----------

export const routineStatus = (r: Routine, date: string): ItemStatus | null => {
  const v = r.history?.[date];
  if (v === true) return 'done';
  if (v === 'skip' || v === 'cancel') return v;
  return null;
};
export const routineDone = (r: Routine, date: string) => r.history?.[date] === true;

export const isRoutineOn = (r: Routine, date: string): boolean => {
  if (r.archived) return false;
  const dow = weekday(date);
  const dayOk = !r.weekDays || r.weekDays.length === 0 || r.weekDays.includes(dow);

  if (r.pattern === 'days') {
    if (r.startDate && date < r.startDate) return false;
    return dayOk;
  }
  if (r.pattern === 'novena') {
    if (r.novenaMonthly) {
      const d = parseDate(date);
      const start = r.novenaStartDay || 1;
      return d.getDate() >= start && d.getDate() <= Math.min(start + 8, daysInMonth(d.getFullYear(), d.getMonth()));
    }
    if (!r.startDate) return false;
    const n = diffDays(r.startDate, date);
    return n >= 0 && n < 9;
  }
  if (r.pattern === 'challenge') {
    if (!r.startDate) return false;
    const n = diffDays(r.startDate, date);
    return n >= 0 && n < (r.durationDays || 40) && dayOk;
  }
  return false;
};

/** Dias do ciclo atual da novena (9 datas). */
export const novenaDays = (r: Routine, ref: string = todayStr()): string[] => {
  let start: string;
  if (r.novenaMonthly) {
    const d = parseDate(ref);
    const sd = r.novenaStartDay || 1;
    // Se já passou a novena deste mês, mostra a do mês seguinte
    const thisMonth = new Date(d.getFullYear(), d.getMonth(), sd);
    const endThis = new Date(d.getFullYear(), d.getMonth(), sd + 8);
    const base = d > endThis ? new Date(d.getFullYear(), d.getMonth() + 1, sd) : thisMonth;
    start = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  } else {
    start = r.startDate || ref;
  }
  return Array.from({ length: 9 }, (_, i) => addDays(start, i));
};

export const challengeProgress = (r: Routine, ref: string = todayStr()) => {
  const total = r.durationDays || 40;
  const start = r.startDate || ref;
  const dayN = Math.min(Math.max(diffDays(start, ref) + 1, 0), total);
  let done = 0;
  for (let i = 0; i < total; i++) if (r.history?.[addDays(start, i)] === true) done++;
  return { total, dayN, done, finished: diffDays(start, ref) >= total };
};

/** Sequência de dias programados feitos seguidos (hoje conta só se já foi feito). */
export const routineStreak = (r: Routine, ref: string = todayStr()): number => {
  // Cancelado não conta nem quebra a sequência; "não feito" quebra.
  let streak = 0;
  let d = ref;
  if (r.history?.[d] !== true) d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    if (isRoutineOn(r, d)) {
      const v = r.history?.[d];
      if (v === true) streak++;
      else if (v !== 'cancel') break;
    }
    d = addDays(d, -1);
    if (r.createdAt && d < r.createdAt.slice(0, 10) && !r.history?.[d]) break;
  }
  return streak;
};

export const describeRoutine = (r: Routine): string => {
  const time = r.time ? (r.endTime ? `${r.time}–${r.endTime}` : r.time) : '';
  let when = '';
  if (r.pattern === 'novena') {
    when = r.novenaMonthly
      ? `Novena todo mês, dias ${r.novenaStartDay}–${(r.novenaStartDay || 1) + 8}`
      : `Novena de 9 dias`;
  } else if (r.pattern === 'challenge') {
    when = `Desafio de ${r.durationDays || 40} dias`;
  } else if (!r.weekDays?.length || r.weekDays.length === 7) {
    when = 'Todo dia';
  } else if (r.weekDays.length === 5 && [1, 2, 3, 4, 5].every(d => r.weekDays.includes(d))) {
    when = 'Dias úteis';
  } else {
    when = [...r.weekDays].sort().map(d => WEEKDAYS_SHORT[d]).join(', ');
  }
  return time ? `${when} · ${time}` : when;
};

// ---------- Tarefas ----------

export const nextDueDate = (due: string, rec: Recurrence): string => {
  const interval = Math.max(1, rec.interval || 1);
  switch (rec.freq) {
    case 'daily':
      return addDays(due, interval);
    case 'weekly': {
      const days = rec.weekDays?.length ? rec.weekDays : null;
      if (!days) return addDays(due, 7 * interval);
      for (let i = 1; i <= 7; i++) {
        const cand = addDays(due, i);
        if (days.includes(weekday(cand))) return cand;
      }
      return addDays(due, 7);
    }
    case 'monthly':
      return addMonths(due, interval, rec.monthDay);
    case 'yearly':
      return addMonths(due, 12 * interval, rec.monthDay);
  }
};

export const describeRecurrence = (rec?: Recurrence | null): string => {
  if (!rec) return '';
  const n = rec.interval && rec.interval > 1 ? rec.interval : 1;
  switch (rec.freq) {
    case 'daily':
      return n > 1 ? `A cada ${n} dias` : 'Todo dia';
    case 'weekly':
      if (rec.weekDays?.length) return `Toda ${[...rec.weekDays].sort().map(d => WEEKDAYS_SHORT[d]).join(', ')}`;
      return n > 1 ? `A cada ${n} semanas` : 'Toda semana';
    case 'monthly':
      return n > 1 ? `A cada ${n} meses` : `Todo mês${rec.monthDay ? `, dia ${rec.monthDay}` : ''}`;
    case 'yearly':
      return 'Todo ano';
  }
};

export type TaskBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate';

export const taskBucket = (t: Task, today = todayStr()): TaskBucket => {
  if (!t.dueDate) return 'nodate';
  const diff = diffDays(today, t.dueDate);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'week';
  return 'later';
};

export const sortTasks = (a: Task, b: Task) => {
  const da = a.dueDate || '9999-99-99';
  const dbb = b.dueDate || '9999-99-99';
  if (da !== dbb) return da < dbb ? -1 : 1;
  const ta = a.time || '99:99';
  const tb = b.time || '99:99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return (a.createdAt || '').localeCompare(b.createdAt || '');
};

/** A tarefa aparece neste dia? (vencimento no dia, ou atrasada quando o dia é hoje) */
export const taskOnDay = (t: Task, date: string, today = todayStr()): boolean => {
  if (t.done || !t.dueDate) return false;
  if (t.dueDate === date) return true;
  return date === today && t.dueDate < today;
};
