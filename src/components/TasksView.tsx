import React, { useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CalendarDays, CheckCircle2, ChevronDown, Inbox, Plus, Search, Sun, Sunrise, X } from 'lucide-react';
import { useBrain } from '../lib/brain';
import { addDays, todayStr } from '../lib/dates';
import { sortTasks, taskBucket, TaskBucket } from '../lib/schedule';
import TaskRow from './TaskRow';
import { Chip, Empty, Hero, Overlap, SectionCard, Tint } from './ui';

const BUCKETS: { key: TaskBucket; label: string; tint: Tint; icon: React.ReactNode }[] = [
  { key: 'overdue', label: 'Atrasadas', tint: 'red', icon: <AlertCircle size={17} /> },
  { key: 'today', label: 'Hoje', tint: 'green', icon: <Sun size={17} /> },
  { key: 'tomorrow', label: 'Amanhã', tint: 'blue', icon: <Sunrise size={17} /> },
  { key: 'week', label: 'Próximos 7 dias', tint: 'purple', icon: <CalendarDays size={17} /> },
  { key: 'later', label: 'Mais adiante', tint: 'amber', icon: <CalendarClock size={17} /> },
  { key: 'nodate', label: 'Sem data', tint: 'yellow', icon: <Inbox size={17} /> },
];

type When = 'none' | 'today' | 'tomorrow';

export default function TasksView() {
  const { tasks, newTask, saveTask, allTags } = useBrain();
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [draft, setDraft] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [showDone, setShowDone] = useState(false);
  const [doneLimit, setDoneLimit] = useState(20);
  const today = todayStr();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(t => {
      if (filter !== 'all' && !t.tags.includes(filter)) return false;
      if (q && !`${t.title} ${t.notes || ''} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, filter, query]);

  const open = filtered.filter(t => !t.done).sort(sortTasks);
  const done = filtered.filter(t => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const grouped = BUCKETS.map(b => ({ ...b, items: open.filter(t => taskBucket(t, today) === b.key) })).filter(g => g.items.length);
  const overdue = open.filter(t => taskBucket(t, today) === 'overdue').length;

  const quickAdd = () => {
    const title = draft.trim();
    if (!title) return;
    saveTask(
      newTask({
        title,
        tags: filter !== 'all' ? [filter] : [],
        dueDate: when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : null,
      }),
    );
    setDraft('');
  };

  // "conta" sempre aparece como filtro "Contas"
  const tagFilters = ['conta', ...allTags.filter(t => t !== 'conta' && tasks.some(x => x.tags.includes(t))).slice(0, 10)];

  return (
    <div>
      <Hero
        eyebrow={overdue ? `${open.length} pendentes · ${overdue} atrasada${overdue > 1 ? 's' : ''}` : `${open.length} pendentes`}
        title="Tarefas"
      />
      <Overlap>
        <div className="card flex gap-2 items-center pl-4 pr-2 py-2">
          <Plus size={18} className="text-mata-600 shrink-0" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && quickAdd()}
            placeholder="Adicionar tarefa…"
            className="flex-1 min-w-0 py-2 outline-none text-[15px] bg-transparent"
          />
          <button
            onClick={() => setWhen(w => (w === 'today' ? 'tomorrow' : w === 'tomorrow' ? 'none' : 'today'))}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-mata-50 text-mata-700 shrink-0"
            title="Trocar data"
          >
            {when === 'today' ? 'Hoje' : when === 'tomorrow' ? 'Amanhã' : 'Sem data'}
          </button>
          {draft.trim() && (
            <button onClick={quickAdd} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-mata-700 text-white shrink-0">
              Pôr
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <button
            onClick={() => setShowSearch(s => !s)}
            className={`shrink-0 p-2 rounded-full shadow-sm ${showSearch ? 'bg-mata-700 text-white' : 'bg-white text-stone-500'}`}
            aria-label="Buscar"
          >
            <Search size={15} />
          </button>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas
          </Chip>
          {tagFilters.map(f => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(x => (x === f ? 'all' : f))}>
              {f === 'conta' ? 'Contas' : `#${f}`}
            </Chip>
          ))}
        </div>
        {showSearch && (
          <div className="relative mt-2">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar nas tarefas"
              className="w-full rounded-2xl bg-white shadow-sm px-4 py-2.5 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {grouped.length === 0 && (
          <div className="card mt-3.5">
            <Empty
              icon={<CheckCircle2 size={40} />}
              title={tasks.length ? 'Nada pendente aqui' : 'Nenhuma tarefa ainda'}
              hint={tasks.length ? undefined : 'Escreva acima e aperte Enter.'}
            />
          </div>
        )}

        {grouped.map(g => (
          <SectionCard
            key={g.key}
            icon={g.icon}
            tint={g.tint}
            title={<span className={g.key === 'overdue' ? 'text-rose-600' : ''}>{g.label}</span>}
            right={<span className="text-xs font-semibold text-stone-400">{g.items.length}</span>}
          >
            {g.items.map(t => (
              <TaskRow key={t.id} task={t} showDate={g.key !== 'today' && g.key !== 'tomorrow'} />
            ))}
          </SectionCard>
        ))}

        {done.length > 0 && (
          <div className="mt-5">
            <button onClick={() => setShowDone(s => !s)} className="flex items-center gap-1 text-[13px] font-bold text-stone-500 px-1">
              Concluídas ({done.length})
              <ChevronDown size={15} className={`transition ${showDone ? 'rotate-180' : ''}`} />
            </button>
            {showDone && (
              <div className="card mt-2 overflow-hidden">
                {done.slice(0, doneLimit).map(t => (
                  <TaskRow key={t.id} task={t} />
                ))}
                {done.length > doneLimit && (
                  <button onClick={() => setDoneLimit(l => l + 30)} className="w-full text-sm text-stone-500 py-3">
                    Mostrar mais
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Overlap>
    </div>
  );
}
