import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { CalendarEvent, Routine, Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { useCalendarDay } from '../lib/useCalendar';
import { eventEndTime, eventTime } from '../lib/calendar';
import { addDays, diffDays, formatDayLabel, formatLong, formatMoney, parseDate, todayStr, weekday, WEEKDAYS_SHORT } from '../lib/dates';
import { challengeProgress, isRoutineOn, novenaDays, sortTasks, taskOnDay } from '../lib/schedule';
import TaskRow from './TaskRow';
import NoteCard from './NoteCard';
import { CheckButton, SectionTitle, useToast } from './ui';

type TimelineItem =
  | { kind: 'event'; time: string; end?: string; ev: CalendarEvent }
  | { kind: 'routine'; time: string; end?: string; r: Routine }
  | { kind: 'task'; time: string; t: Task };

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function RoutineLine({ r, date }: { r: Routine; date: string }) {
  const { toggleRoutine, setEditing } = useBrain();
  const done = !!r.history?.[date];
  let extra = '';
  if (r.pattern === 'novena') {
    const days = novenaDays(r, date);
    const idx = days.indexOf(date);
    extra = `Novena · dia ${idx + 1} de 9`;
  } else if (r.pattern === 'challenge') {
    const p = challengeProgress(r, date);
    extra = `Desafio · dia ${p.dayN} de ${p.total}`;
  } else if (r.endTime) {
    extra = `até ${r.endTime}`;
  }
  const tone = r.pattern === 'novena' ? 'violet' : r.pattern === 'challenge' ? 'amber' : 'emerald';
  return (
    <div onClick={() => setEditing({ kind: 'routine', item: r })} className="flex items-start gap-3 px-3 py-3 bg-white cursor-pointer active:bg-stone-50">
      <div className="pt-0.5">
        <CheckButton checked={done} tone={tone} onChange={() => toggleRoutine(r, date)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${done ? 'line-through text-stone-400' : 'text-stone-900'}`}>{r.title}</div>
        {extra && <div className="text-xs text-stone-500 mt-0.5">{extra}</div>}
      </div>
    </div>
  );
}

export default function TodayView() {
  const { tasks, routines, notes, setEditing } = useBrain();
  const toast = useToast();
  const [today, setToday] = useState(todayStr());
  const [date, setDate] = useState(today);
  const [now, setNow] = useState(nowHHMM());
  const cal = useCalendarDay(date);

  // Atualiza a hora (e vira o dia à meia-noite)
  useEffect(() => {
    const t = setInterval(() => {
      setNow(nowHHMM());
      const ts = todayStr();
      if (ts !== today) {
        setDate(d => (d === today ? ts : d));
        setToday(ts);
      }
    }, 30000);
    return () => clearInterval(t);
  }, [today]);

  const isToday = date === today;
  const dayRoutines = routines.filter(r => isRoutineOn(r, date));
  const dayTasks = tasks.filter(t => taskOnDay(t, date, today)).sort(sortTasks);
  const doneToday = tasks.filter(t => t.done && t.doneAt && t.dueDate && t.dueDate <= date && t.doneAt.slice(0, 10) === date && !t.time);
  const recurringDone = tasks.reduce((n, t) => n + (t.history || []).filter(h => h.doneAt.slice(0, 10) === date).length, 0);

  const timed: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...cal.events.filter(e => !e.allDay).map(ev => ({ kind: 'event' as const, time: eventTime(ev), end: eventEndTime(ev), ev })),
      ...dayRoutines.filter(r => r.time).map(r => ({ kind: 'routine' as const, time: r.time!, end: r.endTime || undefined, r })),
      ...dayTasks.filter(t => t.time).map(t => ({ kind: 'task' as const, time: t.time!, t })),
    ];
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [cal.events, dayRoutines, dayTasks]);

  const allDay = cal.events.filter(e => e.allDay);
  const untimedTasks = dayTasks.filter(t => !t.time);
  const untimedRoutines = dayRoutines.filter(r => !r.time);
  const pinned = notes.filter(n => n.pinned).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const total = dayRoutines.length + dayTasks.length + doneToday.length + (isToday ? recurringDone : 0);
  const doneCount = dayRoutines.filter(r => r.history?.[date]).length + doneToday.length + (isToday ? recurringDone : 0);

  const upcomingBills = tasks
    .filter(t => !t.done && t.amount != null && t.dueDate && diffDays(date, t.dueDate) > 0 && diffDays(date, t.dueDate) <= 7)
    .sort(sortTasks);

  // Semana (segunda a domingo) que contém o dia escolhido
  const monday = addDays(date, -((weekday(date) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const connect = async () => {
    try {
      await cal.connect();
    } catch {
      toast('Não foi possível conectar à agenda.');
    }
  };

  const nowIndex = isToday ? timed.findIndex(i => i.time > now) : -1;

  return (
    <div>
      {/* Semana */}
      <div className="flex items-center gap-1 -mx-1">
        <button onClick={() => setDate(addDays(date, -7))} className="p-1.5 text-stone-400" aria-label="Semana anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {week.map(d => {
            const sel = d === date;
            const isT = d === today;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition ${
                  sel ? 'bg-stone-900 text-white' : isT ? 'bg-amber-100 text-amber-900' : 'text-stone-500 hover:bg-white'
                }`}
              >
                <span className="text-[10px] uppercase">{WEEKDAYS_SHORT[weekday(d)]}</span>
                <span className="text-base font-semibold leading-tight">{parseDate(d).getDate()}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setDate(addDays(date, 7))} className="p-1.5 text-stone-400" aria-label="Próxima semana">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex items-end justify-between mt-4 px-1">
        <div>
          <div className="text-2xl font-bold text-stone-900 leading-tight">{isToday ? 'Hoje' : formatDayLabel(date, today)}</div>
          <div className="text-sm text-stone-500">{formatLong(date)}</div>
        </div>
        <div className="text-right">
          {!isToday && (
            <button onClick={() => setDate(today)} className="text-xs font-medium text-amber-700 mb-1">
              Voltar para hoje
            </button>
          )}
          {total > 0 && (
            <div className="text-sm text-stone-500">
              <span className="font-semibold text-stone-900">{doneCount}</span> de {total} feitos
            </div>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="h-1.5 rounded-full bg-stone-200 mt-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      )}

      {/* Agenda */}
      {cal.status === 'disconnected' && (
        <button
          onClick={connect}
          className="w-full mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-left"
        >
          <CalendarDays size={20} className="text-sky-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sky-900">Conectar Google Agenda</div>
            <div className="text-xs text-sky-700">
              {cal.updatedAt ? 'Mostrando a última versão salva. Toque para atualizar.' : 'Para ver seus compromissos aqui.'}
            </div>
          </div>
        </button>
      )}
      {cal.status === 'error' && (
        <button onClick={cal.refresh} className="w-full mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 text-rose-800 px-4 py-3 text-sm">
          <RefreshCw size={16} /> Não consegui carregar a agenda. Tocar para tentar de novo.
        </button>
      )}

      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {allDay.map(e => (
            <span key={e.id} className="text-sm px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-900">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: e.color || '#0284c7' }} />
              {e.title}
            </span>
          ))}
        </div>
      )}

      {timed.length > 0 && (
        <>
          <SectionTitle right={cal.status === 'loading' ? <RefreshCw size={13} className="animate-spin text-stone-400" /> : null}>
            Agenda
          </SectionTitle>
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white divide-y divide-stone-100">
            {timed.map((item, idx) => (
              <React.Fragment key={`${item.kind}-${item.kind === 'event' ? item.ev.id : item.kind === 'routine' ? item.r.id : item.t.id}`}>
                {idx === nowIndex && (
                  <div className="relative h-0">
                    <div className="absolute inset-x-0 -top-px border-t-2 border-rose-400" />
                    <span className="absolute left-2 -top-2 text-[10px] font-bold bg-rose-400 text-white px-1.5 rounded">{now}</span>
                  </div>
                )}
                <div className="flex">
                  <div className="w-14 shrink-0 pt-3.5 pl-3 text-xs tabular-nums text-stone-500">
                    <div className="font-semibold text-stone-800">{item.time}</div>
                    {'end' in item && item.end && <div className="text-stone-400">{item.end}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.kind === 'event' && (
                      <div className="flex gap-3 px-3 py-3">
                        <span className="w-1 rounded-full shrink-0" style={{ background: item.ev.color || '#0284c7' }} />
                        <div className="min-w-0">
                          <div className="text-[15px] text-stone-900 leading-snug">{item.ev.title}</div>
                          <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-2">
                            <span>{item.ev.calendarName}</span>
                            {item.ev.location && (
                              <span className="inline-flex items-center gap-0.5 truncate max-w-[12rem]">
                                <MapPin size={11} />
                                {item.ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {item.kind === 'routine' && <RoutineLine r={item.r} date={date} />}
                    {item.kind === 'task' && <TaskRow task={item.t} showDate={false} />}
                  </div>
                </div>
              </React.Fragment>
            ))}
            {isToday && nowIndex === -1 && timed.length > 0 && <div className="border-t-2 border-rose-400" />}
          </div>
        </>
      )}

      {/* Para fazer */}
      {(untimedTasks.length > 0 || untimedRoutines.length > 0 || doneToday.length > 0) && (
        <>
          <SectionTitle>Para fazer</SectionTitle>
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white divide-y divide-stone-100">
            {untimedTasks.map(t => (
              <TaskRow key={t.id} task={t} showDate={t.dueDate !== date} />
            ))}
            {untimedRoutines.map(r => (
              <RoutineLine key={r.id} r={r} date={date} />
            ))}
            {doneToday.map(t => (
              <TaskRow key={t.id} task={t} showDate={false} />
            ))}
          </div>
        </>
      )}

      {total === 0 && timed.length === 0 && allDay.length === 0 && (
        <div className="mt-8 text-center text-stone-400">
          <Sparkles className="mx-auto mb-2" size={32} />
          <div className="font-medium text-stone-600">Dia livre</div>
          <button
            onClick={() => setEditing({ kind: 'task', item: null, preset: { dueDate: date } })}
            className="text-sm text-amber-700 mt-1"
          >
            Adicionar uma tarefa para {isToday ? 'hoje' : 'este dia'}
          </button>
        </div>
      )}

      {upcomingBills.length > 0 && (
        <>
          <SectionTitle right={<span className="text-xs text-stone-500">{formatMoney(upcomingBills.reduce((s, t) => s + (t.amount || 0), 0))}</span>}>
            Contas nos próximos 7 dias
          </SectionTitle>
          <div className="rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
            {upcomingBills.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </>
      )}

      {pinned.length > 0 && (
        <>
          <SectionTitle>Notas fixadas</SectionTitle>
          <div className="columns-2 sm:columns-3 gap-3">
            {pinned.map(n => (
              <NoteCard key={n.id} note={n} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
