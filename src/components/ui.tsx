import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

// ---------- Folha (bottom sheet no celular, janela no computador) ----------

export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
  footer,
  headerRight,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/40 animate-fade" onClick={onClose} />
      <div
        role="dialog"
        className={`relative w-full sm:max-w-lg bg-white shadow-2xl flex flex-col animate-sheet ${
          full ? 'h-[100dvh] sm:h-[85vh] sm:rounded-[28px]' : 'max-h-[92dvh] rounded-t-[28px] sm:rounded-[28px]'
        }`}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-500" aria-label="Fechar">
            <X size={20} />
          </button>
          <div className="flex-1 font-semibold text-stone-900 truncate">{title}</div>
          {headerRight}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-stone-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Caixa de marcar redonda ----------

export function CheckButton({
  checked,
  onChange,
  size = 22,
  tone = 'emerald',
  label,
}: {
  checked: boolean;
  onChange: () => void;
  size?: number;
  tone?: 'emerald' | 'amber' | 'violet' | 'sky';
  label?: string;
}) {
  const tones = {
    emerald: 'bg-mata-600 border-mata-600',
    amber: 'bg-amber-500 border-amber-500',
    violet: 'bg-violet-500 border-violet-500',
    sky: 'bg-sky-500 border-sky-500',
  };
  return (
    <button
      type="button"
      aria-label={label || (checked ? 'Desmarcar' : 'Marcar como feito')}
      aria-pressed={checked}
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
      className={`shrink-0 rounded-full border-2 flex items-center justify-center transition active:scale-90 ${
        checked ? `${tones[tone]} text-white` : 'border-[#CBD3CE] bg-white hover:border-stone-400'
      }`}
      style={{ width: size, height: size }}
    >
      {checked && <Check size={size * 0.62} strokeWidth={3} />}
    </button>
  );
}

// ---------- Pequenos blocos ----------

export const Chip = ({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition ${
      active ? 'bg-mata-700 text-white border-mata-700' : 'bg-white text-stone-600 border-transparent shadow-sm hover:border-stone-200'
    }`}
  >
    {children}
  </button>
);

export const SectionTitle = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between mt-6 mb-2 px-1">
    <h2 className="text-[13px] font-bold text-stone-600">{children}</h2>
    {right}
  </div>
);

export const Empty = ({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) => (
  <div className="flex flex-col items-center text-center py-14 px-6 text-stone-400">
    <div className="mb-3">{icon}</div>
    <div className="font-medium text-stone-600">{title}</div>
    {hint && <div className="text-sm mt-1">{hint}</div>}
  </div>
);

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block mt-4">
    <span className="block text-xs font-medium text-stone-500 mb-1.5">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-mata-500 focus:ring-2 focus:ring-mata-50';

export const primaryBtn = 'rounded-xl bg-mata-700 text-white font-semibold active:bg-mata-800';

// ---------- Topo verde de cada aba + cartões com ícone ----------

const AvatarCtx = createContext<React.ReactNode>(null);
export const AvatarProvider = AvatarCtx.Provider;

export function Hero({
  eyebrow,
  title,
  right,
  children,
  overlap = true,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  overlap?: boolean;
}) {
  const avatar = useContext(AvatarCtx);
  return (
    <div className={`hero-bg text-white px-5 pt-[max(1.25rem,env(safe-area-inset-top))] rounded-b-[28px] ${overlap ? 'pb-16' : 'pb-6'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {eyebrow && <div className="text-[13px] text-white/80">{eyebrow}</div>}
          <h1 className="text-[26px] font-bold leading-tight mt-0.5">{title}</h1>
        </div>
        {right}
        <div className="sm:hidden">{avatar}</div>
      </div>
      {children}
    </div>
  );
}

/** Área que sobe por cima do topo verde. */
export const Overlap = ({ children }: { children: React.ReactNode }) => <div className="-mt-12 px-4 relative">{children}</div>;

const TINTS = {
  blue: 'bg-sky-50 text-sky-600',
  red: 'bg-rose-50 text-rose-500',
  purple: 'bg-violet-50 text-violet-500',
  green: 'bg-mata-50 text-mata-600',
  amber: 'bg-amber-50 text-amber-600',
  yellow: 'bg-yellow-50 text-yellow-600',
};
export type Tint = keyof typeof TINTS;

export function SectionCard({
  icon,
  tint = 'green',
  title,
  right,
  children,
  flush = false,
}: {
  icon: React.ReactNode;
  tint?: Tint;
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="card mt-3.5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1">
        <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${TINTS[tint]}`}>{icon}</span>
        <h2 className="flex-1 font-bold text-[15px] text-tinta">{title}</h2>
        {right}
      </div>
      <div className={flush ? '' : 'pb-1.5'}>{children}</div>
    </section>
  );
}

export const Tags = ({ tags }: { tags: string[] }) =>
  tags.length ? (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500">
          #{t}
        </span>
      ))}
    </span>
  ) : null;

/** Campo de etiquetas: digite e aperte Enter ou vírgula. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  const sugg = suggestions.filter(s => !value.includes(s) && (!draft || s.startsWith(draft.toLowerCase()))).slice(0, 8);
  return (
    <div>
      <div className={`${inputCls} flex flex-wrap gap-1.5 items-center`}>
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700">
            #{t}
            <button type="button" onClick={() => onChange(value.filter(x => x !== t))} aria-label={`Tirar ${t}`}>
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => {
            const v = e.target.value;
            if (v.endsWith(',') || v.endsWith(' ')) add(v.slice(0, -1));
            else setDraft(v);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : 'ex.: escola, casa'}
          className="flex-1 min-w-[6rem] outline-none bg-transparent"
        />
      </div>
      {sugg.length > 0 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {sugg.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="shrink-0 text-xs px-2 py-1 rounded-lg border border-dashed border-stone-300 text-stone-500"
            >
              + #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Textarea que cresce com o texto. */
export function AutoTextarea({
  inputRef,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputRef?: (el: HTMLTextAreaElement | null) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={el => {
        ref.current = el;
        inputRef?.(el);
      }}
      rows={1}
      {...props}
      className={`resize-none overflow-hidden ${props.className || ''}`}
    />
  );
}

/** Mostra links clicáveis em texto simples. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-sky-700 underline break-all"
          >
            {p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
          </a>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
}

// ---------- Avisos (toasts) com "Desfazer" ----------

interface Toast {
  id: number;
  msg: string;
  action?: { label: string; run: () => void };
}
const ToastCtx = createContext<(msg: string, action?: Toast['action']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { id, msg, action }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), action ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-28 sm:bottom-6 inset-x-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 bg-tinta text-white text-sm rounded-2xl pl-4 pr-2 py-2.5 shadow-lg animate-sheet max-w-md"
          >
            <span className="flex-1">{t.msg}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run();
                  setToasts(x => x.filter(y => y.id !== t.id));
                }}
                className="font-semibold text-sol-400 px-2 py-1 rounded-lg hover:bg-white/10"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
