import React, { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarDays, Check, CheckSquare, ChevronLeft, ChevronRight, History, MapPin, Pin, Receipt, RefreshCw, Repeat, Sparkles, X } from 'lucide-react';
import { CalendarEvent, ItemStatus, Routine, Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { useCalendarDay } from '../lib/useCalendar';
import { eventEndTime, eventTime } from '../lib/calendar';
import { addDays, diffDays, formatDayLabel, formatLong, parseDate, todayStr, weekday, WEEKDAYS_SHORT } from '../lib/dates';
import { isRoutineOn, novenaDays, routineDayNumber, routineStatus, sortTasks, taskOnDay } from '../lib/schedule';
import { eventKey, useDayMarks } from '../lib/days';
import { routineToneOf, statusOptions, StatusButton } from './status';
import { auth } from '../firebase';
import TaskRow from './TaskRow';
import NoteCard from './NoteCard';
import { Hero, Overlap, SectionCard, useToast } from './ui';

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
  const { toggleRoutine, setRoutineStatus, toggleRoutineItem, setEditing } = useBrain();
  const status = routineStatus(r, date);
  const items = r.items || [];
  const checked = r.checks?.[date] || [];
  let extra = '';
  let novena: string[] | null = null;
  const dayNum = routineDayNumber(r, date);
  if (r.pattern === 'novena') {
    novena = novenaDays(r, date);
    extra = 'Novena · de 9 dias';
  } else if (r.pattern === 'challenge' && dayNum) {
    extra = `Desafio · de ${dayNum.total} dias`;
  } else if (r.endTime) {
    extra = `até ${r.endTime}`;
  }
  if (items.length) extra = [extra, `${items.filter(i => checked.includes(i.id)).length} de ${items.length}`].filter(Boolean).join(' · ');
  return (
    <div onClick={() => setEditing({ kind: 'routine', item: r })} className="px-4 py-3 cursor-pointer active:bg-stone-50">
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <StatusButton
            status={status}
            tone={routineToneOf(r)}
            onTap={() => toggleRoutine(r, date)}
            menuTitle={r.title}
            menu={statusOptions(status, st => setRoutineStatus(r, date, st))}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] leading-snug ${status === 'done' || status === 'cancel' ? 'line-through text-stone-400' : 'text-tinta'}`}>
            {r.title}
          </div>
          <StatusNote status={status} extra={extra} />
        </div>
        {dayNum && (
          <span
            className={`shrink-0 self-center text-sm font-bold px-2.5 py-1 rounded-xl ${
              r.pattern === 'novena' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {dayNum.n}º dia
          </span>
        )}
      </div>
      {items.length > 0 && status !== 'cancel' && status !== 'skip' && (
        <div className="mt-1.5 ml-9 space-y-0.5">
          {items.map(i => {
            const on = checked.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={e => {
                  e.stopPropagation();
                  toggleRoutineItem(r, date, i.id);
                }}
                className="flex items-center gap-2.5 w-full text-left py-1"
              >
                <span
                  className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 ${
                    on ? 'bg-mata-600 border-mata-600 text-white' : 'border-[#CBD3CE] bg-white'
                  }`}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <span className={`text-sm ${on ? 'line-through text-stone-400' : 'text-stone-700'}`}>{i.text}</span>
              </button>
            );
          })}
        </div>
      )}
      {showNovenaBar && novena && (
        <div className="flex gap-1 mt-2 ml-9">
          {novena.map(d => (
            <span key={d} className={`flex-1 h-2 rounded-full ${r.history?.[d] === true ? 'bg-violet-500' : r.history?.[d] === 'skip' ? 'bg-rose-300' : 'bg-violet-100'} ${d === date ? 'ring-2 ring-violet-300' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusNote({ status, extra }: { status: ItemStatus | null; extra?: string }) {
  const label = status === 'skip' ? 'não feito' : status === 'cancel' ? 'cancelado' : '';
  if (!label && !extra) return null;
  return (
    <div className="text-xs text-stone-500 mt-0.5">
      {label && <span className={status === 'skip' ? 'text-rose-600 font-medium' : 'text-stone-400 font-medium'}>{label}</span>}
      {label && extra && ' · '}
      {extra}
    </div>
  );
}

function EventLine({ ev, date }: { ev: CalendarEvent; date: string }) {
  const { uid, setEventStatus } = useBrain();
  const marks = useDayMarksCtx();
  const status = marks[eventKey(ev.id)] || null;
  const set = (st: ItemStatus | null) => setEventStatus(date, ev.id, st);
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="pt-0.5">
        <StatusButton
          status={status}
          tone="sky"
          onTap={() => set(status ? null : 'done')}
          menuTitle={ev.title}
          menu={statusOptions(status, set)}
        />
      </div>
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: ev.color || '#0284c7' }} />
      <div className="min-w-0">
        <div className={`text-[15px] leading-snug ${status === 'done' || status === 'cancel' ? 'line-through text-stone-400' : 'text-tinta'}`}>
          {ev.title}
        </div>
        <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-2">
          {status === 'skip' && <span className="text-rose-600 font-medium">não feito</span>}
          {status === 'cancel' && <span className="text-stone-400 font-medium">cancelado</span>}
          <span>{ev.calendarName}</span>
          {ev.location && (
            <span className="inline-flex items-center gap-0.5 truncate max-w-[12rem]">
              <MapPin size={11} />
              {ev.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const MarksCtx = React.createContext<Record<string, ItemStatus>>({});
const useDayMarksCtx = () => React.useContext(MarksCtx);

/** O que ficou sem marcação ontem (eventos da agenda e rotina). */
function YesterdayCard({ today }: { today: string }) {
  const { uid, routines, setRoutineStatus, setEventStatus } = useBrain();
  const y = addDays(today, -1);
  const cal = useCalendarDay(y);
  const marks = useDayMarks(uid, y);
  const pendingRoutines = routines.filter(r => isRoutineOn(r, y) && !routineStatus(r, y));
  const pendingEvents = cal.events.filter(e => !marks[eventKey(e.id)]);
  const items = [
    ...pendingEvents.map(e => ({
      key: `e-${e.id}`,
      title: e.title,
      sub: e.allDay ? 'Agenda · dia todo' : `Agenda · ${eventTime(e)}`,
      time: e.allDay ? '00:00' : eventTime(e),
      set: (st: ItemStatus) => setEventStatus(y, e.id, st),
    })),
    ...pendingRoutines.map(r => ({
      key: `r-${r.id}`,
      title: r.title,
      sub: r.time ? `Rotina · ${r.time}` : 'Rotina',
      time: r.time || '99:99',
      set: (st: ItemStatus) => setRoutineStatus(r, y, st),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (!items.length) return null;
  const btn = 'w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition';
  return (
    <SectionCard
      icon={<History size={17} />}
      tint="amber"
      title="Ficou de ontem"
      right={
        <button onClick={() => items.forEach(i => i.set('skip'))} className="text-xs font-semibold text-stone-400">
          Não fiz nenhum
        </button>
      }
    >
      <div className="px-4 pb-1 text-xs text-stone-500">Você não marcou estes itens. O que aconteceu?</div>
      {items.map(i => (
        <div key={i.key} className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] text-tinta leading-snug truncate">{i.title}</div>
            <div className="text-xs text-stone-500">{i.sub}</div>
          </div>
          <button onClick={() => i.set('done')} className={`${btn} bg-mata-50 text-mata-700`} aria-label="Fiz" title="Fiz">
            <Check size={18} strokeWidth={2.6} />
          </button>
          <button onClick={() => i.set('skip')} className={`${btn} bg-rose-50 text-rose-600`} aria-label="Não fiz" title="Não fiz">
            <X size={18} strokeWidth={2.6} />
          </button>
          <button onClick={() => i.set('cancel')} className={`${btn} bg-stone-100 text-stone-500`} aria-label="Cancelado" title="Cancelado">
            <Ban size={17} />
          </button>
        </div>
      ))}
    </SectionCard>
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
  const { uid, tasks, routines, notes, setEditing, setEventStatus } = useBrain();
  const toast = useToast();
  const [today, setToday] = useState(todayStr());
  const [date, setDate] = useState(today);
  const [now, setNow] = useState(nowHHMM());
  const cal = useCalendarDay(date);
  const marks = useDayMarks(uid, date);

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
  const recurringDone = isToday
    ? tasks.reduce((n, t) => n + (t.history || []).filter(h => h.status !== 'skip' && h.doneAt.slice(0, 10) === date).length, 0)
    : 0;

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

  // Cancelados não entram na conta do dia
  const countedRoutines = dayRoutines.filter(r => routineStatus(r, date) !== 'cancel');
  const routinesDone = countedRoutines.filter(r => routineStatus(r, date) === 'done').length;
  const countedEvents = cal.events.filter(e => marks[eventKey(e.id)] !== 'cancel');
  const eventsDone = countedEvents.filter(e => marks[eventKey(e.id)] === 'done').length;
  const tasksPending = dayTasks.length;
  const doneTasksCounted = doneTasksToday.filter(t => !t.cancelled);
  const total = countedRoutines.length + countedEvents.length + dayTasks.length + doneTasksCounted.length + recurringDone;
  const doneCount = routinesDone + eventsDone + doneTasksCounted.length + recurringDone;
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
        <MarksCtx.Provider value={marks}>
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
              <span className="text-stone-400 font-semibold">/{countedRoutines.length}</span>
            </div>
            <div className="text-[11.5px] text-stone-500">rotina</div>
          </div>
        </div>

        {isToday && <YesterdayCard today={today} />}

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
                {allDay.map(e => {
                  const st = marks[eventKey(e.id)] || null;
                  const set = (x: ItemStatus | null) => setEventStatus(date, e.id, x);
                  return (
                    <span key={e.id} className="inline-flex items-center gap-2 text-sm pl-1.5 pr-3 py-1 rounded-xl bg-sky-50 text-sky-900">
                      <StatusButton status={st} tone="sky" size={18} onTap={() => set(st ? null : 'done')} menuTitle={e.title} menu={statusOptions(st, set)} />
                      <span className={st === 'done' || st === 'cancel' ? 'line-through text-sky-900/50' : ''}>{e.title}</span>
                    </span>
                  );
                })}
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
                    {item.kind === 'event' && <EventLine ev={item.ev} date={date} />}
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
        </MarksCtx.Provider>
      </Overlap>
    </div>
  );
}
