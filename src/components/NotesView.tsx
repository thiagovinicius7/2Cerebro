import React, { useMemo, useState } from 'react';
import { ListChecks, NotebookPen, PenLine, Pin, Search, X } from 'lucide-react';
import { useBrain } from '../lib/brain';
import { newId } from '../lib/dates';
import NoteCard from './NoteCard';
import { Chip, Empty, Hero, Overlap } from './ui';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function NotesView() {
  const { notes, setEditing } = useBrain();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [kind, setKind] = useState<'all' | 'lists' | 'photos'>('all');

  const tags = useMemo(() => {
    const c = new Map<string, number>();
    notes.forEach(n => n.tags.forEach(t => c.set(t, (c.get(t) || 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [notes]);

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return notes
      .filter(n => {
        if (tag && !n.tags.includes(tag)) return false;
        if (kind === 'lists' && !n.checklist.length) return false;
        if (kind === 'photos' && !n.attachments.some(a => a.type === 'image')) return false;
        if (!words.length) return true;
        const hay = normalize(
          [n.title, n.text, ...n.checklist.map(i => i.text), ...n.tags, ...n.attachments.map(a => `${a.name} ${a.url || ''}`)].join(' '),
        );
        return words.every(w => hay.includes(w));
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [notes, query, tag, kind]);

  const pinned = filtered.filter(n => n.pinned);
  const others = filtered.filter(n => !n.pinned);
  const lists = notes.filter(n => n.checklist.length).length;

  return (
    <div>
      <Hero eyebrow={`${notes.length} ${notes.length === 1 ? 'nota' : 'notas'} · ${lists} ${lists === 1 ? 'lista' : 'listas'}`} title="Notas" />
      <Overlap>
        <div className="card relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em notas e listas"
            className="w-full rounded-[22px] bg-transparent pl-11 pr-10 py-3.5 outline-none text-[15px]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400" aria-label="Limpar">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button
            onClick={() => setEditing({ kind: 'note', item: null, preset: tag ? { tags: [tag] } : undefined })}
            className="card flex items-center justify-center gap-2 py-3 text-sm font-semibold text-tinta"
          >
            <span className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <PenLine size={16} />
            </span>
            Nova nota
          </button>
          <button
            onClick={() =>
              setEditing({
                kind: 'note',
                item: null,
                preset: { checklist: [{ id: newId(), text: '', done: false }], ...(tag ? { tags: [tag] } : {}) },
              })
            }
            className="card flex items-center justify-center gap-2 py-3 text-sm font-semibold text-tinta"
          >
            <span className="w-7 h-7 rounded-lg bg-mata-50 text-mata-600 flex items-center justify-center">
              <ListChecks size={16} />
            </span>
            Nova lista
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <Chip active={kind === 'all' && !tag} onClick={() => { setKind('all'); setTag(null); }}>
            Todas
          </Chip>
          <Chip active={kind === 'lists'} onClick={() => setKind(k => (k === 'lists' ? 'all' : 'lists'))}>
            Listas
          </Chip>
          <Chip active={kind === 'photos'} onClick={() => setKind(k => (k === 'photos' ? 'all' : 'photos'))}>
            Com fotos
          </Chip>
          {tags.map(t => (
            <Chip key={t} active={tag === t} onClick={() => setTag(x => (x === t ? null : t))}>
              #{t}
            </Chip>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card mt-3.5">
            <Empty
              icon={<NotebookPen size={40} />}
              title={notes.length ? 'Nada encontrado' : 'Nenhuma nota ainda'}
              hint={notes.length ? 'Tente outra palavra ou tire o filtro.' : 'Anote ideias, listas de compras, recados…'}
            />
          </div>
        )}

        {pinned.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-5 mb-2.5 px-1 text-[13px] font-bold text-stone-600">
              <Pin size={14} /> Fixadas
            </div>
            <div className="columns-2 sm:columns-3 gap-3">
              {pinned.map(n => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          </>
        )}
        {others.length > 0 && (
          <>
            <div className="mt-5 mb-2.5 px-1 text-[13px] font-bold text-stone-600">{pinned.length ? 'Outras' : 'Recentes'}</div>
            <div className="columns-2 sm:columns-3 gap-3">
              {others.map(n => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          </>
        )}
      </Overlap>
    </div>
  );
}
