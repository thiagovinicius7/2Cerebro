import React, { useMemo, useState } from 'react';
import { ChevronDown, Flame, Plus, Repeat } from 'lucide-react';
import { Routine } from '../lib/types';
import { useBrain } from '../lib/brain';
import { addDays, parseDate, todayStr, weekday, WEEKDAYS_LETTER } from '../lib/dates';
import { challengeProgress, describeRoutine, isRoutineOn, novenaDays, routineStreak } from '../lib/schedule';
import { Chip, Empty, SectionTitle } from './ui';

function Dot({
  done,
  scheduled,
  label,
  isToday,
  onClick,
  tone = 'emerald',
}: {
  done: boolean;
  scheduled: boolean;
  label: string;
  isToday?: boolean;
  onClick: () => void;
  tone?: 'emerald' | 'violet' | 'amber';
}) {
  const on = { emerald: 'bg-emerald-500 text-white', violet: 'bg-violet-500 text-white', amber: 'bg-amber-500 text-white' }[tone];
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-8 h-8 rounded-full text-[11px] font-semibold flex items-center justify-center transition active:scale-90 ${
        done ? on : scheduled ? 'bg-stone-100 text-stone-500' : 'bg-transparent text-stone-300 border border-dashed border-stone-200'
      } ${isToday ? 'ring-2 ring-offset-1 ring-stone-900' : ''}`}
    >
      {label}
    </button>
  );
}

function RoutineCard({ r }: { r: Routine }) {
  const { toggleRoutine, setEditing } = useBrain();
  const today = todayStr();
  const streak = routineStreak(r, today);

  let body: React.ReactNode;
  if (r.pattern === 'novena') {
    const days = novenaDays(r, today);
    const doneN = days.filter(d => r.history?.[d]).length;
    body = (
      <>
        <div className="flex justify-between gap-1 mt-3">
          {days.map((d, i) => (
            <Dot
              key={d}
              tone="violet"
              done={!!r.history?.[d]}
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
              done={!!r.history?.[d]}
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
            done={!!r.history?.[d]}
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
      className={`bg-white rounded-2xl border border-stone-200 p-4 cursor-pointer ${r.archived ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-900 leading-snug">{r.title}</div>
          <div className="text-xs text-stone-500 mt-0.5">{describeRoutine(r)}</div>
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

  return (
    <div>
      <button
        onClick={() => setEditing({ kind: 'routine', item: null, preset: group ? { category: group } : undefined })}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-stone-200 text-sm font-medium text-stone-700 shadow-sm"
      >
        <Plus size={17} /> Hábito, bloco, novena ou desafio
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
    </div>
  );
}
