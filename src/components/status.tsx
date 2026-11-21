import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, CalendarArrowUp, Check, RotateCcw, SkipForward, X } from 'lucide-react';
import { ItemStatus, Routine, Task } from '../lib/types';
import { Sheet } from './ui';

type Tone = 'emerald' | 'amber' | 'violet' | 'sky';

/** Depois de segurar, o soltar do dedo gera um "clique" que não deve abrir o item. */
export const swallowNextClick = () => {
  const swallow = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 700);
};

const TONES: Record<Tone, string> = {
  emerald: 'bg-mata-600 border-mata-600',
  amber: 'bg-amber-500 border-amber-500',
  violet: 'bg-violet-500 border-violet-500',
  sky: 'bg-sky-500 border-sky-500',
};

export interface MenuOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  tone?: 'green' | 'red' | 'gray' | 'blue';
  active?: boolean;
  onSelect: () => void;
}

/**
 * Bolinha de marcar com três estados.
 * Toque: marca/desmarca feito. Segurar (ou botão direito): abre o menu com todas as opções.
 */
export function StatusButton({
  status,
  onTap,
  menu,
  menuTitle,
  tone = 'emerald',
  size = 22,
}: {
  status: ItemStatus | null;
  onTap: () => void;
  menu: MenuOption[];
  menuTitle?: string;
  tone?: Tone;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      swallowNextClick();
      setOpen(true);
    }, 450);
  };
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const look =
    status === 'done'
      ? `${TONES[tone]} text-white`
      : status === 'skip'
        ? 'bg-rose-50 border-rose-400 text-rose-500'
        : status === 'cancel'
          ? 'bg-stone-100 border-stone-300 text-stone-400'
          : 'border-[#CBD3CE] bg-white hover:border-stone-400';

  return (
    <>
      <button
        type="button"
        aria-label={status === 'done' ? 'Feito' : status === 'skip' ? 'Não feito' : status === 'cancel' ? 'Cancelado' : 'Marcar'}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          cancel();
          setOpen(true);
        }}
        onClick={e => {
          e.stopPropagation();
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          onTap();
        }}
        className={`shrink-0 rounded-full border-2 flex items-center justify-center transition active:scale-90 select-none touch-manipulation ${look}`}
        style={{ width: size, height: size, WebkitTouchCallout: 'none' } as React.CSSProperties}
      >
        {status === 'done' && <Check size={size * 0.62} strokeWidth={3} />}
        {status === 'skip' && <X size={size * 0.6} strokeWidth={3} />}
        {status === 'cancel' && <Ban size={size * 0.58} strokeWidth={2.5} />}
      </button>
      {open && <StatusMenu title={menuTitle} options={menu} onClose={() => setOpen(false)} />}
    </>
  );
}

export function StatusMenu({ title, options, onClose }: { title?: string; options: MenuOption[]; onClose: () => void }) {
  const toneCls = {
    green: 'bg-mata-50 text-mata-700',
    red: 'bg-rose-50 text-rose-600',
    gray: 'bg-stone-100 text-stone-500',
    blue: 'bg-sky-50 text-sky-600',
  };
  return createPortal(
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      <Sheet open onClose={onClose} title={title}>
        <div className="space-y-2 pb-2">
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => {
                o.onSelect();
                onClose();
              }}
              className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold ${
                o.active ? 'ring-2 ring-mata-500' : ''
              } bg-stone-50 hover:bg-stone-100`}
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneCls[o.tone || 'gray']}`}>{o.icon}</span>
              <span className="flex-1 text-tinta">{o.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>,
    document.body,
  );
}

// ---------- Opções prontas ----------

export const statusOptions = (current: ItemStatus | null, set: (s: ItemStatus | null) => void): MenuOption[] => [
  { key: 'done', label: 'Feito', icon: <Check size={18} />, tone: 'green', active: current === 'done', onSelect: () => set('done') },
  { key: 'skip', label: 'Não feito', icon: <X size={18} />, tone: 'red', active: current === 'skip', onSelect: () => set('skip') },
  { key: 'cancel', label: 'Cancelado', icon: <Ban size={18} />, tone: 'gray', active: current === 'cancel', onSelect: () => set('cancel') },
  ...(current ? [{ key: 'clear', label: 'Limpar marcação', icon: <RotateCcw size={18} />, onSelect: () => set(null) }] : []),
];

export const taskOptions = (
  t: Task,
  actions: { toggle: () => void; postpone: () => void; cancel: () => void },
): MenuOption[] =>
  t.done
    ? [{ key: 'reopen', label: t.cancelled ? 'Reativar tarefa' : 'Desmarcar (ainda não fiz)', icon: <RotateCcw size={18} />, onSelect: actions.toggle }]
    : [
        { key: 'done', label: t.recurrence ? 'Feito (vai para a próxima)' : 'Concluída', icon: <Check size={18} />, tone: 'green', onSelect: actions.toggle },
        t.recurrence
          ? { key: 'skip', label: 'Não fiz — pular esta vez', icon: <SkipForward size={18} />, tone: 'red', onSelect: actions.postpone }
          : { key: 'later', label: 'Não fiz — adiar para amanhã', icon: <CalendarArrowUp size={18} />, tone: 'blue', onSelect: actions.postpone },
        { key: 'cancel', label: t.recurrence ? 'Cancelar (parar de repetir)' : 'Cancelar', icon: <Ban size={18} />, tone: 'gray', onSelect: actions.cancel },
      ];

export const routineToneOf = (r: Routine): Tone => (r.pattern === 'novena' ? 'violet' : r.pattern === 'challenge' ? 'amber' : 'emerald');
