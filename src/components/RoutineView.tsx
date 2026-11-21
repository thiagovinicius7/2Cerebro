import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Flame, Plus, Repeat } from 'lucide-react';
import { ItemStatus, Routine } from '../lib/types';
import { useBrain } from '../lib/brain';
import { addDays, parseDate, todayStr, weekday, WEEKDAYS_LETTER } from '../lib/dates';
import { challengeProgress, describeRoutine, isRoutineOn, novenaDays, routineDone, routineStatus, routineStreak } from '../lib/schedule';
import { StatusMenu, statusOptions, swallowNextClick } from './status';
import { Chip, Empty, Hero, Overlap, SectionTitle } from './ui';

function Dot({
  status,
  scheduled,
  label,
  isToday,
  onClick,
  onStatus,
  menuTitle,
  tone = 'emerald',
}: {
  status: ItemStatus | null;
  scheduled: boolean;
  label: string;
  isToday?: boolean;
  onClick: () => void;
  onStatus: (s: ItemStatus | null) => void;
  menuTitle: string;
  tone?: 'emerald' | 'violet' | 'amber';
}) {
  const [menu, setMenu] = useState(false);
  const timer = useRef<number | null>(null);
  const long = useRef(false);
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const on = { emerald: 'bg-mata-600 text-white', violet: 'bg-violet-500 text-white', amber: 'bg-amber-500 text-white' }[tone];
  const look =
    status === 'done'
      ? on
      : status === 'skip'
        ? 'bg-rose-100 text-rose-600'
        : status === 'cancel'
          ? 'bg-stone-200 text-stone-400 line-through'
          : scheduled
            ? 'bg-stone-100 text-stone-500'
            : 'bg-transparent text-stone-300 border border-dashed border-stone-200';
  return (
    <>
      <button
        onPointerDown={() => {
          long.current = false;
          timer.current = window.setTimeout(() => {
            long.current = true;
            swallowNextClick();
            setMenu(true);
          }, 450);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          stop();
          setMenu(true);
        }}
        onClick={e => {
          e.stopPropagation();
          if (long.current) return void (long.current = false);
          onClick();
        }}
        className={`w-8 h-8 rounded-full text-[11px] font-semibold flex items-center justify-center transition active:scale-90 select-none ${look} ${
          isToday ? 'ring-2 ring-offset-1 ring-mata-700' : ''
        }`}
        style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
      >
        {status === 'skip' ? '✕' : label}
      </button>
      {menu && <StatusMenu title={menuTitle} options={statusOptions(status, onStatus)} onClose={() => setMenu(false)} />}
    </>
  );
}

function RoutineCard({ r }: { r: Routine }) {
  const { toggleRoutine, setRoutineStatus, setEditing } = useBrain();
  const today = todayStr();
  const streak = routineStreak(r, today);

  let body: React.ReactNode;
  if (r.pattern === 'novena') {
    const days = novenaDays(r, today);
    const doneN = days.filter(d => routineDone(r, d)).length;
    body = (
      <>
        <div className="flex justify-between gap-1 mt-3">
          {days.map((d, i) => (
            <Dot
              key={d}
              tone="violet"
              status={routineStatus(r, d)}
              onStatus={st => setRoutineStatus(r, d, st)}
              menuTitle={`${r.title} · ${parseDate(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}`}
              scheduled
              isToday={d === today}
              label={r.novenaMonthly ? String(parseDate(d).getDate()) : String(i + 1)}
              onClick={() => toggleRoutine(r, d)}
            />
          ))}
        </div>
        <div className="text-xs text-stone-500 mt-2">
          {doneN === 9 ? 'Novena concluída 🙏' : `${doneN} de 9 dias`}
        </div>
      </>
    );
  } else if (r.pattern === 'challenge') {
    const p = challengeProgress(r, today);
    const last = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    body = (
      <>
        <div className="h-2 rounded-full bg-stone-100 mt-3 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(p.done / p.total) * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-1.5">
          <span>{p.finished ? 'Desafio encerrado' : `Dia ${p.dayN} de ${p.total}`}</span>
          <span>{p.done} feitos</span>
        </div>
        <div className="flex justify-between gap-1 mt-3">
          {last.map(d => (
            <Dot
              key={d}
              tone="amber"
              status={routineStatus(r, d)}
              onStatus={st => setRoutineStatus(r, d, st)}
              menuTitle={`${r.title} · ${parseDate(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}`}
              scheduled={isRoutineOn(r, d)}
              isToday={d === today}
              label={WEEKDAYS_LETTER[weekday(d)]}
              onClick={() => toggleRoutine(r, d)}
            />
          ))}
        </div>
      </>
    );
  } else {
    const last = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    body = (
      <div className="flex justify-between gap-1 mt-3">
        {last.map(d => (
          <Dot
            key={d}
            status={routineStatus(r, d)}
              onStatus={st => setRoutineStatus(r, d, st)}
              menuTitle={`${r.title} · ${parseDate(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}`}
            scheduled={isRoutineOn(r, d)}
            isToday={d === today}
            label={WEEKDAYS_LETTER[weekday(d)]}
            onClick={() => toggleRoutine(r, d)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing({ kind: 'routine', item: r })}
      className={`card p-4 cursor-pointer ${r.archived ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-tinta leading-snug">{r.title}</div>
          <div className="text-xs text-stone-500 mt-0.5">
            {describeRoutine(r)}
            {!!r.items?.length && ` · ${r.items.length} subitens`}
          </div>
        </div>
        {streak > 1 && (
          <div className="flex items-center gap-0.5 text-sm font-semibold text-orange-600 shrink-0" title="Dias seguidos">
            <Flame size={15} /> {streak}
          </div>
        )}
      </div>
      {body}
    </div>
  );
}

export default function RoutineView() {
  const { routines, setEditing } = useBrain();
  const [group, setGroup] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);

  const groups = useMemo(
    () => Array.from(new Set(routines.map(r => (r.category || '').trim()).filter(Boolean))).sort(),
    [routines],
  );

  const sorted = useMemo(
    () =>
      routines
        .filter(r => !group || (r.category || '').trim() === group)
        .sort((a, b) => {
          const ta = a.time || '99';
          const tb = b.time || '99';
          return ta !== tb ? (ta < tb ? -1 : 1) : a.title.localeCompare(b.title);
        }),
    [routines, group],
  );
  const active = sorted.filter(r => !r.archived);
  const paused = sorted.filter(r => r.archived);
  const withTime = active.filter(r => r.time && r.pattern === 'days');
  const habits = active.filter(r => !r.time && r.pattern === 'days');
  const special = active.filter(r => r.pattern !== 'days');

  const section = (title: string, list: Routine[]) =>
    list.length > 0 && (
      <>
        <SectionTitle right={<span className="text-xs text-stone-400">{list.length}</span>}>{title}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map(r => (
            <RoutineCard key={r.id} r={r} />
          ))}
        </div>
      </>
    );

  const today = todayStr();
  const todays = routines.filter(r => isRoutineOn(r, today));
  const doneToday = todays.filter(r => routineDone(r, today)).length;

  return (
    <div>
      <Hero eyebrow={todays.length ? `${doneToday} de ${todays.length} feitos hoje` : 'Hábitos, horários, novenas e desafios'} title="Rotina" />
      <Overlap>
      <button
        onClick={() => setEditing({ kind: 'routine', item: null, preset: group ? { category: group } : undefined })}
        className="card w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-tinta"
      >
        <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center">
          <Plus size={17} />
        </span>
        Hábito, horário, novena ou desafio
      </button>

      {groups.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <Chip active={!group} onClick={() => setGroup(null)}>
            Tudo
          </Chip>
          {groups.map(g => (
            <Chip key={g} active={group === g} onClick={() => setGroup(x => (x === g ? null : g))}>
              {g}
            </Chip>
          ))}
        </div>
      )}

      {active.length === 0 && (
        <Empty icon={<Repeat size={40} />} title="Sua rotina está vazia" hint="Adicione hábitos, horários fixos, novenas ou desafios." />
      )}

      {section('Novenas e desafios', special)}
      {section('Com horário', withTime)}
      {section('Hábitos', habits)}

      {paused.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowPaused(s => !s)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-500 px-1"
          >
            Pausados ({paused.length})
            <ChevronDown size={14} className={`transition ${showPaused ? 'rotate-180' : ''}`} />
          </button>
          {showPaused && (
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              {paused.map(r => (
                <RoutineCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>
      )}
      </Overlap>
    </div>
  );
}
