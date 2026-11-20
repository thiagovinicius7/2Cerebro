import React from 'react';
import { Link2, Pin, Video } from 'lucide-react';
import { Note, NOTE_COLORS } from '../lib/types';
import { useBrain } from '../lib/brain';
import { CheckButton, Linkify, Tags } from './ui';
import { NoteImage } from './NoteImage';

export default function NoteCard({ note, compact = false }: { note: Note; compact?: boolean }) {
  const { setEditing, toggleChecklist } = useBrain();
  const color = note.color ? NOTE_COLORS[note.color] : null;
  const images = note.attachments.filter(a => a.type === 'image');
  const links = note.attachments.filter(a => a.type !== 'image');
  const open = note.checklist.filter(i => !i.done);
  const doneCount = note.checklist.length - open.length;
  const maxItems = compact ? 3 : 6;

  return (
    <div
      onClick={() => setEditing({ kind: 'note', item: note })}
      className={`break-inside-avoid mb-3 rounded-2xl border overflow-hidden cursor-pointer transition hover:shadow-md active:scale-[0.99] ${
        color ? `${color.bg} ${color.border}` : 'bg-white border-stone-200'
      }`}
    >
      {images[0] && <NoteImage att={images[0]} zoomable={false} className={`w-full ${compact ? 'h-24' : 'h-36'}`} />}
      <div className="p-3">
        {(note.title || note.pinned) && (
          <div className="flex items-start gap-2">
            <div className="flex-1 font-semibold text-stone-900 leading-snug break-words">{note.title}</div>
            {note.pinned && <Pin size={14} className="text-stone-400 shrink-0 mt-0.5 fill-current" />}
          </div>
        )}
        {note.text && (
          <div
            className={`text-sm text-stone-700 whitespace-pre-wrap break-words mt-1 ${compact ? 'line-clamp-3' : 'line-clamp-[8]'}`}
          >
            <Linkify text={note.text} />
          </div>
        )}
        {note.checklist.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {open.slice(0, maxItems).map(i => (
              <div key={i.id} className="flex items-start gap-2 text-sm text-stone-700">
                <CheckButton size={18} checked={false} onChange={() => toggleChecklist(note, i.id)} />
                <span className="leading-snug break-words min-w-0">{i.text}</span>
              </div>
            ))}
            {(open.length > maxItems || doneCount > 0) && (
              <div className="text-xs text-stone-400 pl-6">
                {open.length > maxItems && `+${open.length - maxItems} itens`}
                {open.length > maxItems && doneCount > 0 && ' · '}
                {doneCount > 0 && `${doneCount} de ${note.checklist.length} feitos`}
              </div>
            )}
          </div>
        )}
        {(links.length > 0 || images.length > 1) && (
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
            {images.length > 1 && <span>+{images.length - 1} fotos</span>}
            {links.length > 0 && (
              <span className="inline-flex items-center gap-1">
                {links.some(l => l.type === 'video') ? <Video size={12} /> : <Link2 size={12} />}
                {links.length} {links.length === 1 ? 'link' : 'links'}
              </span>
            )}
          </div>
        )}
        {note.tags.length > 0 && (
          <div className="mt-2">
            <Tags tags={note.tags} />
          </div>
        )}
      </div>
    </div>
  );
}
