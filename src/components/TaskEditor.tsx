import React, { useEffect, useState } from 'react';
import { CalendarX, Repeat, Trash2 } from 'lucide-react';
import { Recurrence, RecurrenceFreq, Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { addDays, formatDayLabel, parseDate, todayStr, weekday, WEEKDAYS_LETTER } from '../lib/dates';
import { AutoTextarea, Chip, Field, inputCls, primaryBtn, Sheet, TagInput } from './ui';
import { StatusMenu } from './status';

export default function TaskEditor({ task, preset, onClose }: { task: Task | null; preset?: Partial<Task>; onClose: () => void }) {
  const { newTask, saveTask, deleteTask, deleteTaskOccurrence, toggleTask, allTags } = useBrain();
  const [askDelete, setAskDelete] = useState(false);
  const [draft, setDraft] = useState<Task>(() => task || newTask(preset));
  const isNew = !task;
  const today = todayStr();

  useEffect(() => {
    if (task) setDraft(task);
  }, [task?.id]);

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft(d => ({ ...d, [k]: v }));

  const setFreq = (freq: RecurrenceFreq | '') => {
    if (!freq) return set('recurrence', null);
    const due = draft.dueDate || today;
    const rec: Recurrence = { freq, interval: draft.recurrence?.interval || 1 };
    if (freq === 'weekly') rec.weekDays = [weekday(due)];
    if (freq === 'monthly' || freq === 'yearly') rec.monthDay = parseDate(due).getDate();
    setDraft(d => ({ ...d, dueDate: d.dueDate || today, recurrence: rec }));
  };

  const save = () => {
    const title = draft.title.trim();
    if (!title) {
      onClose();
      return;
    }
    const rec = draft.recurrence;
    const fixed: Task = {
      ...draft,
      title,
      recurrence:
        rec && rec.freq === 'monthly' && draft.dueDate ? { ...rec, monthDay: parseDate(draft.dueDate).getDate() } : rec,
    };
    saveTask(fixed);
    onClose();
  };

  const nextMonday = (() => {
    let d = addDays(today, 1);
    while (weekday(d) !== 1) d = addDays(d, 1);
    return d;
  })();

  return (
    <Sheet
      open
      onClose={save}
      title={isNew ? 'Nova tarefa' : 'Tarefa'}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <button
              onClick={() => {
                if (task?.recurrence && task.dueDate) {
                  setAskDelete(true);
                  return;
                }
                deleteTask(draft);
                onClose();
              }}
              className="p-3 rounded-xl text-rose-600 hover:bg-rose-50"
              aria-label="Apagar tarefa"
            >
              <Trash2 size={20} />
            </button>
          )}
          {!isNew && !draft.done && (
            <button
              onClick={() => {
                toggleTask(draft);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl border border-stone-200 font-medium text-stone-700"
            >
              {draft.recurrence ? 'Feito (próxima)' : 'Concluir'}
            </button>
          )}
          <button onClick={save} className={`flex-1 py-3 ${primaryBtn}`}>
            Salvar
          </button>
        </div>
      }
    >
      {askDelete && task?.dueDate && (
        <StatusMenu
          title="Apagar tarefa que repete"
          onClose={() => setAskDelete(false)}
          options={[
            {
              key: 'one',
              label: `Apagar só esta (${formatDayLabel(task.dueDate).toLowerCase()})`,
              icon: <CalendarX size={18} />,
              tone: 'red',
              onSelect: () => {
                deleteTaskOccurrence(task);
                onClose();
              },
            },
            {
              key: 'all',
              label: 'Apagar todas as repetições',
              icon: <Trash2 size={18} />,
              tone: 'red',
              onSelect: () => {
                deleteTask(task);
                onClose();
              },
            },
          ]}
        />
      )}
      <input
        autoFocus={isNew}
        value={draft.title}
        onChange={e => set('title', e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="O que precisa ser feito?"
        className="w-full text-xl font-semibold outline-none placeholder:text-stone-300 py-1"
      />

      <Field label="Quando">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Chip active={draft.dueDate === today} onClick={() => set('dueDate', today)}>
            Hoje
          </Chip>
          <Chip active={draft.dueDate === addDays(today, 1)} onClick={() => set('dueDate', addDays(today, 1))}>
            Amanhã
          </Chip>
          <Chip active={draft.dueDate === nextMonday} onClick={() => set('dueDate', nextMonday)}>
            Segunda
          </Chip>
          <Chip
            active={!draft.dueDate}
            onClick={() => setDraft(d => ({ ...d, dueDate: null, time: null, recurrence: null }))}
          >
            Sem data
          </Chip>
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="date"
            value={draft.dueDate || ''}
            onChange={e => set('dueDate', e.target.value || null)}
            className={inputCls}
          />
          <input
            type="time"
            value={draft.time || ''}
            onChange={e => set('time', e.target.value || null)}
            className={`${inputCls} w-32`}
            aria-label="Horário"
          />
        </div>
        {draft.dueDate && <div className="text-xs text-stone-400 mt-1">{formatDayLabel(draft.dueDate)}</div>}
      </Field>

      <Field label="Repetir">
        <select
          value={draft.recurrence?.freq || ''}
          onChange={e => setFreq(e.target.value as RecurrenceFreq | '')}
          className={inputCls}
        >
          <option value="">Não repete</option>
          <option value="daily">Todo dia</option>
          <option value="weekly">Toda semana</option>
          <option value="monthly">Todo mês</option>
          <option value="yearly">Todo ano</option>
        </select>
        {draft.recurrence?.freq === 'weekly' && (
          <div className="flex gap-1.5 mt-2">
            {WEEKDAYS_LETTER.map((l, i) => {
              const on = draft.recurrence?.weekDays?.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const cur = draft.recurrence?.weekDays || [];
                    const days = on ? cur.filter(d => d !== i) : [...cur, i].sort();
                    set('recurrence', { ...draft.recurrence!, weekDays: days });
                  }}
                  className={`w-9 h-9 rounded-full text-sm font-medium ${on ? 'bg-mata-700 text-white' : 'bg-stone-100 text-stone-500'}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        )}
        {draft.recurrence && draft.recurrence.freq !== 'weekly' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-stone-500">
            A cada
            <input
              type="number"
              min={1}
              value={draft.recurrence.interval || 1}
              onChange={e => set('recurrence', { ...draft.recurrence!, interval: Math.max(1, Number(e.target.value) || 1) })}
              className={`${inputCls} w-20`}
            />
            {{ daily: 'dia(s)', monthly: 'mês(es)', yearly: 'ano(s)', weekly: '' }[draft.recurrence.freq]}
          </div>
        )}
      </Field>

      <Field label="Etiquetas (use #conta para lembretes de contas)">
        <TagInput value={draft.tags} onChange={v => set('tags', v)} suggestions={allTags} />
      </Field>

      <Field label="Observações">
        <AutoTextarea
          value={draft.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Detalhes, links, código de barras…"
          className={`${inputCls} min-h-[4.5rem]`}
        />
      </Field>

      {!!draft.history?.length && (
        <div className="mt-4 text-xs text-stone-400 flex items-start gap-1.5">
          <Repeat size={13} className="mt-0.5 shrink-0" />
          <span>
            Feita em:{' '}
            {draft.history
              .slice(-6)
              .reverse()
              .map(h => formatDayLabel(h.date))
              .join(' · ')}
          </span>
        </div>
      )}
    </Sheet>
  );
}
