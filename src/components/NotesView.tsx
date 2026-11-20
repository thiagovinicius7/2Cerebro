import React, { useMemo, useState } from 'react';
import { ListChecks, NotebookPen, PenLine, Search, X } from 'lucide-react';
import { useBrain } from '../lib/brain';
import { newId } from '../lib/dates';
import NoteCard from './NoteCard';
import { Chip, Empty, SectionTitle } from './ui';

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

  return (
    <div>
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar em notas e listas"
          className="w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-9 py-2.5 outline-none shadow-sm text-[15px]"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400" aria-label="Limpar">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setEditing({ kind: 'note', item: null, preset: tag ? { tags: [tag] } : undefined })}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-stone-200 text-sm font-medium text-stone-700"
        >
          <PenLine size={17} /> Nota
        </button>
        <button
          onClick={() =>
            setEditing({
              kind: 'note',
              item: null,
              preset: { checklist: [{ id: newId(), text: '', done: false }], ...(tag ? { tags: [tag] } : {}) },
            })
          }
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-stone-200 text-sm font-medium text-stone-700"
        >
          <ListChecks size={17} /> Lista
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
        <Empty
          icon={<NotebookPen size={40} />}
          title={notes.length ? 'Nada encontrado' : 'Nenhuma nota ainda'}
          hint={notes.length ? 'Tente outra palavra ou tire o filtro.' : 'Anote ideias, listas de compras, recados…'}
        />
      )}

      {pinned.length > 0 && (
        <>
          <SectionTitle>Fixadas</SectionTitle>
          <div className="columns-2 sm:columns-3 gap-3">
            {pinned.map(n => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          {pinned.length > 0 && <SectionTitle>Outras</SectionTitle>}
          <div className={`columns-2 sm:columns-3 gap-3 ${pinned.length ? '' : 'mt-4'}`}>
            {others.map(n => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
