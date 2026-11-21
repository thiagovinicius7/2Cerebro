import React, { useState } from 'react';
import { Archive, Plus, Trash2, X } from 'lucide-react';
import { Routine, RoutinePattern } from '../lib/types';
import { useBrain } from '../lib/brain';
import { newId, todayStr, WEEKDAYS_LETTER } from '../lib/dates';
import { AutoTextarea, Field, inputCls, Sheet } from './ui';

const PATTERNS: { key: RoutinePattern; label: string; hint: string }[] = [
  { key: 'days', label: 'Repetir', hint: 'Hábito ou bloco nos dias que você escolher' },
  { key: 'novena', label: 'Novena', hint: '9 dias seguidos, todo mês ou uma vez' },
  { key: 'challenge', label: 'Desafio', hint: 'Por um número de dias (ex.: 40)' },
];

export default function RoutineEditor({
  routine,
  preset,
  onClose,
}: {
  routine: Routine | null;
  preset?: Partial<Routine>;
  onClose: () => void;
}) {
  const { newRoutine, saveRoutine, deleteRoutine } = useBrain();
  const [d, setD] = useState<Routine>(() => routine || newRoutine(preset));
  const set = <K extends keyof Routine>(k: K, v: Routine[K]) => setD(x => ({ ...x, [k]: v }));
  const isNew = !routine;

  const [newItem, setNewItem] = useState('');
  const items = d.items || [];
  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    set('items', [...items, { id: newId(), text: t }]);
    setNewItem('');
  };

  const save = () => {
    if (!d.title.trim()) return onClose();
    const pending = newItem.trim() ? [...items, { id: newId(), text: newItem.trim() }] : items;
    saveRoutine({
      ...d,
      title: d.title.trim(),
      startDate: d.startDate || todayStr(),
      items: pending.filter(i => i.text.trim()),
    });
    onClose();
  };

  const toggleDay = (i: number) => {
    const all = d.weekDays.length ? d.weekDays : [0, 1, 2, 3, 4, 5, 6];
    const next = all.includes(i) ? all.filter(x => x !== i) : [...all, i].sort();
    set('weekDays', next.length === 7 ? [] : next);
  };
  const dayOn = (i: number) => !d.weekDays.length || d.weekDays.includes(i);

  return (
    <Sheet
      open
      onClose={save}
      title={isNew ? 'Novo na rotina' : 'Rotina'}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <>
              <button
                onClick={() => {
                  deleteRoutine(d);
                  onClose();
                }}
                className="p-3 rounded-xl text-rose-600 hover:bg-rose-50"
                aria-label="Apagar"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => {
                  saveRoutine({ ...d, archived: !d.archived });
                  onClose();
                }}
                className="px-3 rounded-xl text-stone-600 hover:bg-stone-100 flex items-center gap-1.5 text-sm"
              >
                <Archive size={18} /> {d.archived ? 'Reativar' : 'Pausar'}
              </button>
            </>
          )}
          <button onClick={save} className="flex-1 py-3 rounded-xl bg-mata-700 text-white font-semibold">
            Salvar
          </button>
        </div>
      }
    >
      <input
        autoFocus={isNew}
        value={d.title}
        onChange={e => set('title', e.target.value)}
        placeholder="Ex.: Ler a Bíblia, Academia, Terço"
        className="w-full text-xl font-semibold outline-none placeholder:text-stone-300 py-1"
      />

      <div className="grid grid-cols-3 gap-2 mt-4">
        {PATTERNS.map(p => (
          <button
            key={p.key}
            onClick={() => set('pattern', p.key)}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium ${
              d.pattern === p.key ? 'bg-mata-700 text-white border-mata-700' : 'bg-white border-stone-200 text-stone-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-stone-400 mt-1.5">{PATTERNS.find(p => p.key === d.pattern)?.hint}</div>

      {(d.pattern === 'days' || d.pattern === 'challenge') && (
        <Field label="Dias da semana">
          <div className="flex gap-1.5">
            {WEEKDAYS_LETTER.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-full text-sm font-medium ${dayOn(i) ? 'bg-mata-700 text-white' : 'bg-stone-100 text-stone-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-stone-500">
            <button onClick={() => set('weekDays', [])}>Todo dia</button>
            <button onClick={() => set('weekDays', [1, 2, 3, 4, 5])}>Dias úteis</button>
            <button onClick={() => set('weekDays', [0, 6])}>Fim de semana</button>
          </div>
        </Field>
      )}

      {d.pattern === 'novena' && (
        <Field label="Quando">
          <div className="flex gap-2">
            <button
              onClick={() => set('novenaMonthly', true)}
              className={`flex-1 rounded-xl border py-2 text-sm ${d.novenaMonthly ? 'bg-mata-700 text-white border-mata-700' : 'border-stone-200'}`}
            >
              Todo mês
            </button>
            <button
              onClick={() => set('novenaMonthly', false)}
              className={`flex-1 rounded-xl border py-2 text-sm ${!d.novenaMonthly ? 'bg-mata-700 text-white border-mata-700' : 'border-stone-200'}`}
            >
              Uma vez
            </button>
          </div>
          {d.novenaMonthly ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-stone-600">
              Começa no dia
              <input
                type="number"
                min={1}
                max={23}
                value={d.novenaStartDay || 1}
                onChange={e => set('novenaStartDay', Math.min(23, Math.max(1, Number(e.target.value) || 1)))}
                className={`${inputCls} w-20`}
              />
              e vai até o dia {(d.novenaStartDay || 1) + 8}
            </div>
          ) : (
            <input type="date" value={d.startDate || ''} onChange={e => set('startDate', e.target.value)} className={`${inputCls} mt-2`} />
          )}
        </Field>
      )}

      {d.pattern === 'challenge' && (
        <Field label="Início e duração">
          <div className="flex gap-2">
            <input type="date" value={d.startDate || ''} onChange={e => set('startDate', e.target.value)} className={inputCls} />
            <div className="relative w-32">
              <input
                type="number"
                min={1}
                value={d.durationDays || 40}
                onChange={e => set('durationDays', Math.max(1, Number(e.target.value) || 1))}
                className={`${inputCls} pr-12`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">dias</span>
            </div>
          </div>
        </Field>
      )}

      {d.pattern !== 'novena' && (
        <Field label="Horário (opcional — aparece na linha do tempo de Hoje)">
          <div className="flex items-center gap-2">
            <input type="time" value={d.time || ''} onChange={e => set('time', e.target.value || null)} className={inputCls} />
            <span className="text-stone-400">até</span>
            <input type="time" value={d.endTime || ''} onChange={e => set('endTime', e.target.value || null)} className={inputCls} />
          </div>
        </Field>
      )}

      <Field label="Subitens (opcional — viram uma lista para marcar a cada dia)">
        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-4 text-right">{idx + 1}</span>
              <input
                value={it.text}
                onChange={e => set('items', items.map(x => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => set('items', items.filter(x => x.id !== it.id))}
                className="p-2 text-stone-400 hover:text-rose-600"
                aria-label="Tirar subitem"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-stone-400 w-4" />
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem();
                }
              }}
              onBlur={addItem}
              placeholder="Adicionar subitem"
              className={inputCls}
            />
          </div>
        </div>
      </Field>

      <Field label="Grupo (opcional)">
        <input
          value={d.category || ''}
          onChange={e => set('category', e.target.value)}
          placeholder="ex.: espiritual, saúde, casa"
          className={inputCls}
          list="routine-cats"
        />
      </Field>

      <Field label="Observações">
        <AutoTextarea
          value={d.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Oração, link, detalhes…"
          className={`${inputCls} min-h-[4rem]`}
        />
      </Field>
    </Sheet>
  );
}
