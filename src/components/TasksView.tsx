import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useBrain } from '../lib/brain';
import { addDays, formatMoney, todayStr } from '../lib/dates';
import { sortTasks, taskBucket, TaskBucket } from '../lib/schedule';
import TaskRow from './TaskRow';
import { Chip, Empty, SectionTitle } from './ui';

const BUCKETS: { key: TaskBucket; label: string }[] = [
  { key: 'overdue', label: 'Atrasadas' },
  { key: 'today', label: 'Hoje' },
  { key: 'tomorrow', label: 'Amanhã' },
  { key: 'week', label: 'Próximos 7 dias' },
  { key: 'later', label: 'Mais adiante' },
  { key: 'nodate', label: 'Sem data' },
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
      if (filter === 'contas' && !(t.amount != null || t.tags.includes('conta'))) return false;
      if (filter !== 'all' && filter !== 'contas' && !t.tags.includes(filter)) return false;
      if (q && !`${t.title} ${t.notes || ''} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, filter, query]);

  const open = filtered.filter(t => !t.done).sort(sortTasks);
  const done = filtered
    .filter(t => t.done)
    .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const grouped = BUCKETS.map(b => ({ ...b, items: open.filter(t => taskBucket(t, today) === b.key) })).filter(
    g => g.items.length,
  );

  const monthKey = today.slice(0, 7);
  const billsMonth = useMemo(() => {
    if (filter !== 'contas') return null;
    let toPay = 0;
    let paid = 0;
    let overdue = 0;
    for (const t of filtered) {
      if (t.amount == null) continue;
      if (!t.done && t.dueDate && t.dueDate.slice(0, 7) <= monthKey) {
        toPay += t.amount;
        if (t.dueDate < today) overdue += t.amount;
      }
      if (t.done && (t.doneAt || '').slice(0, 7) === monthKey) paid += t.amount;
      for (const h of t.history || []) if (h.doneAt.slice(0, 7) === monthKey) paid += t.amount;
    }
    return { toPay, paid, overdue };
  }, [filter, filtered, monthKey, today]);

  const quickAdd = () => {
    const title = draft.trim();
    if (!title) return;
    const tags = filter !== 'all' && filter !== 'contas' ? [filter] : filter === 'contas' ? ['conta'] : [];
    saveTask(
      newTask({
        title,
        tags,
        dueDate: when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : null,
      }),
    );
    setDraft('');
  };

  const filters = ['all', 'contas', ...allTags.filter(t => t !== 'conta' && tasks.some(x => x.tags.includes(t))).slice(0, 10)];

  return (
    <div>
      <div className="flex gap-2 items-center bg-white rounded-2xl border border-stone-200 pl-3 pr-1.5 py-1.5 shadow-sm">
        <Plus size={18} className="text-stone-400 shrink-0" />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && quickAdd()}
          placeholder="Adicionar tarefa…"
          className="flex-1 min-w-0 py-1.5 outline-none text-[15px] bg-transparent"
        />
        <button
          onClick={() => setWhen(w => (w === 'today' ? 'tomorrow' : w === 'tomorrow' ? 'none' : 'today'))}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 shrink-0"
          title="Trocar data"
        >
          {when === 'today' ? 'Hoje' : when === 'tomorrow' ? 'Amanhã' : 'Sem data'}
        </button>
        {draft.trim() && (
          <button onClick={quickAdd} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-stone-900 text-white shrink-0">
            Pôr
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        <button
          onClick={() => setShowSearch(s => !s)}
          className={`shrink-0 p-2 rounded-full border ${showSearch ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-500'}`}
          aria-label="Buscar"
        >
          <Search size={15} />
        </button>
        {filters.map(f => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todas' : f === 'contas' ? 'Contas' : `#${f}`}
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
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {billsMonth && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-3">
            <div className="text-[11px] text-stone-500">A pagar até o fim do mês</div>
            <div className="font-semibold tabular-nums mt-0.5">{formatMoney(billsMonth.toPay)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-3">
            <div className="text-[11px] text-stone-500">Atrasado</div>
            <div className={`font-semibold tabular-nums mt-0.5 ${billsMonth.overdue ? 'text-rose-600' : ''}`}>
              {formatMoney(billsMonth.overdue)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-3">
            <div className="text-[11px] text-stone-500">Pago este mês</div>
            <div className="font-semibold tabular-nums mt-0.5 text-emerald-700">{formatMoney(billsMonth.paid)}</div>
          </div>
        </div>
      )}

      {grouped.length === 0 && (
        <Empty
          icon={<CheckCircle2 size={40} />}
          title={tasks.length ? 'Nada pendente aqui' : 'Nenhuma tarefa ainda'}
          hint={tasks.length ? undefined : 'Escreva acima e aperte Enter.'}
        />
      )}

      {grouped.map(g => (
        <div key={g.key}>
          <SectionTitle right={<span className="text-xs text-stone-400">{g.items.length}</span>}>
            <span className={g.key === 'overdue' ? 'text-rose-600' : ''}>{g.label}</span>
          </SectionTitle>
          <div className="rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
            {g.items.map(t => (
              <TaskRow key={t.id} task={t} showDate={g.key !== 'today' && g.key !== 'tomorrow'} />
            ))}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone(s => !s)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-500 px-1"
          >
            Concluídas ({done.length})
            <ChevronDown size={14} className={`transition ${showDone ? 'rotate-180' : ''}`} />
          </button>
          {showDone && (
            <>
              <div className="mt-2 rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                {done.slice(0, doneLimit).map(t => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
              {done.length > doneLimit && (
                <button onClick={() => setDoneLimit(l => l + 30)} className="w-full text-sm text-stone-500 py-3">
                  Mostrar mais
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
