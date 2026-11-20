import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, MapPin, Pin, Receipt, RefreshCw, Repeat, Sparkles } from 'lucide-react';
import { CalendarEvent, Routine, Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { useCalendarDay } from '../lib/useCalendar';
import { eventEndTime, eventTime } from '../lib/calendar';
import { addDays, diffDays, formatDayLabel, formatLong, parseDate, todayStr, weekday, WEEKDAYS_SHORT } from '../lib/dates';
import { challengeProgress, isRoutineOn, novenaDays, sortTasks, taskOnDay } from '../lib/schedule';
import { auth } from '../firebase';
import TaskRow from './TaskRow';
import NoteCard from './NoteCard';
import { CheckButton, Hero, Overlap, SectionCard, useToast } from './ui';

type TimelineItem =
  | { kind: 'event'; time: string; end?: string; ev: CalendarEvent }
  | { kind: 'routine'; time: string; end?: string; r: Routine }
  | { kind: 'task'; time: string; t: Task };

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

function RoutineLine({ r, date, showNovenaBar = false }: { r: Routine; date: string; showNovenaBar?: boolean }) {
  const { toggleRoutine, setEditing } = useBrain();
  const done = !!r.history?.[date];
  let extra = '';
  let novena: string[] | null = null;
  if (r.pattern === 'novena') {
    novena = novenaDays(r, date);
    extra = `Novena · dia ${novena.indexOf(date) + 1} de 9`;
  } else if (r.pattern === 'challenge') {
    const p = challengeProgress(r, date);
    extra = `Desafio · dia ${p.dayN} de ${p.total}`;
  } else if (r.endTime) {
    extra = `até ${r.endTime}`;
  }
  const tone = r.pattern === 'novena' ? 'violet' : r.pattern === 'challenge' ? 'amber' : 'emerald';
  return (
    <div onClick={() => setEditing({ kind: 'routine', item: r })} className="px-4 py-3 cursor-pointer active:bg-stone-50">
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <CheckButton checked={done} tone={tone} onChange={() => toggleRoutine(r, date)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] leading-snug ${done ? 'line-through text-stone-400' : 'text-tinta'}`}>{r.title}</div>
          {extra && <div className="text-xs text-stone-500 mt-0.5">{extra}</div>}
        </div>
      </div>
      {showNovenaBar && novena && (
        <div className="flex gap-1 mt-2 ml-9">
          {novena.map(d => (
            <span key={d} className={`flex-1 h-2 rounded-full ${r.history?.[d] ? 'bg-violet-500' : 'bg-violet-100'} ${d === date ? 'ring-2 ring-violet-300' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimePill({ time, end }: { time: string; end?: string }) {
  return (
    <div className="shrink-0 w-[58px] text-center mt-0.5">
      <div className="text-xs font-bold text-sky-700 bg-sky-50 rounded-lg py-1 tabular-nums">{time}</div>
      {end && <div className="text-[11px] text-stone-400 mt-0.5 tabular-nums">{end}</div>}
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
  const doneTasksToday = tasks.filter(t => t.done && t.doneAt && t.dueDate && t.dueDate <= date && t.doneAt.slice(0, 10) === date && !t.time);
  const recurringDone = isToday ? tasks.reduce((n, t) => n + (t.history || []).filter(h => h.doneAt.slice(0, 10) === date).length, 0) : 0;

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

  const routinesDone = dayRoutines.filter(r => r.history?.[date]).length;
  const tasksPending = dayTasks.length;
  const total = dayRoutines.length + dayTasks.length + doneTasksToday.length + recurringDone;
  const doneCount = routinesDone + doneTasksToday.length + recurringDone;
  const pct = total ? doneCount / total : 0;
  const overdueCount = dayTasks.filter(t => t.dueDate && t.dueDate < today).length;

  const upcomingBills = tasks
    .filter(t => !t.done && t.tags.includes('conta') && t.dueDate && diffDays(date, t.dueDate) > 0 && diffDays(date, t.dueDate) <= 7)
    .sort(sortTasks);

  const monday = addDays(date, -((weekday(date) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const firstName = (auth.currentUser?.displayName || '').split(' ')[0];

  const connect = async () => {
    try {
      await cal.connect();
    } catch {
      toast('Não foi possível conectar à agenda.');
    }
  };

  const nowIndex = isToday ? timed.findIndex(i => i.time > now) : -1;
  const eventsCount = cal.events.length + dayRoutines.filter(r => r.time).length;

  return (
    <div>
      <Hero
        eyebrow={isToday ? formatLong(date) : formatLong(date)}
        title={
          isToday ? (
            <>
              {greeting()}
              {firstName ? `, ${firstName}` : ''} ☀️
            </>
          ) : (
            <button onClick={() => setDate(today)} className="text-left">
              {formatDayLabel(date, today)}
              <span className="block text-sm font-medium text-sol-300 mt-0.5">← voltar para hoje</span>
            </button>
          )
        }
        right={
          total > 0 ? (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `conic-gradient(#FFDC73 0 ${pct * 100}%, rgba(255,255,255,.25) ${pct * 100}% 100%)` }}
              aria-label={`${doneCount} de ${total} feitos`}
            >
              <div className="w-[50px] h-[50px] rounded-full bg-[#2A7E60] flex flex-col items-center justify-center leading-none">
                <span className="font-bold text-base">
                  {doneCount}/{total}
                </span>
                <span className="text-[9px] text-white/80 mt-0.5">feitos</span>
              </div>
            </div>
          ) : null
        }
      >
        <div className="flex items-center gap-1 mt-4 -mx-2">
          <button onClick={() => setDate(addDays(date, -7))} className="p-1 text-white/70" aria-label="Semana anterior">
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
                    sel ? 'bg-white text-mata-700' : isT ? 'bg-white/20 text-white' : 'text-white/80'
                  }`}
                >
                  <span className="text-[10px] uppercase">{WEEKDAYS_SHORT[weekday(d)]}</span>
                  <span className="text-base font-bold leading-tight">{parseDate(d).getDate()}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setDate(addDays(date, 7))} className="p-1 text-white/70" aria-label="Próxima semana">
            <ChevronRight size={18} />
          </button>
        </div>
      </Hero>

      <Overlap>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="card p-3">
            <div className="text-xl font-bold">{eventsCount}</div>
            <div className="text-[11.5px] text-stone-500">{eventsCount === 1 ? 'compromisso' : 'compromissos'}</div>
          </div>
          <div className="card p-3">
            <div className={`text-xl font-bold ${overdueCount ? 'text-rose-600' : ''}`}>{tasksPending}</div>
            <div className="text-[11.5px] text-stone-500">
              {overdueCount ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : tasksPending === 1 ? 'tarefa' : 'tarefas'}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-xl font-bold">
              {routinesDone}
              <span className="text-stone-400 font-semibold">/{dayRoutines.length}</span>
            </div>
            <div className="text-[11.5px] text-stone-500">rotina</div>
          </div>
        </div>

        {(timed.length > 0 || allDay.length > 0 || cal.status === 'disconnected' || cal.status === 'error') && (
          <SectionCard
            icon={<CalendarDays size={17} />}
            tint="blue"
            title="Agenda"
            right={cal.status === 'loading' ? <RefreshCw size={14} className="animate-spin text-stone-400" /> : null}
          >
            {cal.status === 'disconnected' && (
              <button onClick={connect} className="mx-4 mt-1 mb-2 w-[calc(100%-2rem)] text-left rounded-2xl bg-sky-50 px-3.5 py-2.5">
                <div className="text-sm font-semibold text-sky-900">Conectar Google Agenda</div>
                <div className="text-xs text-sky-700">
                  {cal.updatedAt ? 'Mostrando a última versão salva. Toque para atualizar.' : 'Para ver seus compromissos aqui.'}
                </div>
              </button>
            )}
            {cal.status === 'error' && (
              <button onClick={cal.refresh} className="mx-4 mt-1 mb-2 flex items-center gap-2 text-sm text-rose-700">
                <RefreshCw size={14} /> Não consegui carregar a agenda. Tentar de novo.
              </button>
            )}
            {allDay.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-1.5">
                {allDay.map(e => (
                  <span key={e.id} className="text-sm px-3 py-1 rounded-xl bg-sky-50 text-sky-900">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: e.color || '#0284c7' }} />
                    {e.title}
                  </span>
                ))}
              </div>
            )}
            {timed.map((item, idx) => (
              <React.Fragment key={`${item.kind}-${item.kind === 'event' ? item.ev.id : item.kind === 'routine' ? item.r.id : item.t.id}`}>
                {idx === nowIndex && (
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-[10px] font-bold text-rose-500 tabular-nums">{now}</span>
                    <span className="flex-1 h-0.5 bg-rose-400 rounded" />
                  </div>
                )}
                <div className="flex items-start pl-4">
                  <div className="pt-3">
                    <TimePill time={item.time} end={'end' in item ? item.end : undefined} />
                  </div>
                  <div className="flex-1 min-w-0 -ml-1">
                    {item.kind === 'event' && (
                      <div className="flex gap-3 px-4 py-3">
                        <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: item.ev.color || '#0284c7' }} />
                        <div className="min-w-0">
                          <div className="text-[15px] text-tinta leading-snug">{item.ev.title}</div>
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
            {isToday && nowIndex === -1 && timed.length > 0 && (
              <div className="flex items-center gap-2 px-4 pb-1">
                <span className="text-[10px] font-bold text-rose-500 tabular-nums">{now}</span>
                <span className="flex-1 h-0.5 bg-rose-400 rounded" />
              </div>
            )}
          </SectionCard>
        )}

        {(untimedTasks.length > 0 || doneTasksToday.length > 0) && (
          <SectionCard icon={<CheckSquare size={17} />} tint="red" title="Tarefas">
            {untimedTasks.map(t => (
              <TaskRow key={t.id} task={t} showDate={t.dueDate !== date} />
            ))}
            {doneTasksToday.map(t => (
              <TaskRow key={t.id} task={t} showDate={false} />
            ))}
          </SectionCard>
        )}

        {untimedRoutines.length > 0 && (
          <SectionCard icon={<Repeat size={17} />} tint="purple" title="Rotina">
            {untimedRoutines.map(r => (
              <RoutineLine key={r.id} r={r} date={date} showNovenaBar />
            ))}
          </SectionCard>
        )}

        {total === 0 && timed.length === 0 && allDay.length === 0 && (
          <div className="card mt-3.5 py-8 text-center text-stone-400">
            <Sparkles className="mx-auto mb-2" size={30} />
            <div className="font-semibold text-stone-600">Dia livre</div>
            <button
              onClick={() => setEditing({ kind: 'task', item: null, preset: { dueDate: date } })}
              className="text-sm text-mata-700 font-medium mt-1"
            >
              Adicionar uma tarefa para {isToday ? 'hoje' : 'este dia'}
            </button>
          </div>
        )}

        {upcomingBills.length > 0 && (
          <SectionCard icon={<Receipt size={17} />} tint="amber" title="Contas da semana">
            {upcomingBills.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </SectionCard>
        )}

        {pinned.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-5 mb-2.5 px-1 text-[13px] font-bold text-stone-600">
              <Pin size={14} /> Fixadas
            </div>
            <div className="columns-2 sm:columns-3 gap-3">
              {pinned.map(n => (
                <NoteCard key={n.id} note={n} compact />
              ))}
            </div>
          </>
        )}
      </Overlap>
    </div>
  );
}
