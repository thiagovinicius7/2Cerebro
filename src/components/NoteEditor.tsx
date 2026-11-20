import React, { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, Hash, Link2, ListChecks, Palette, Pin, Plus, Trash2, X } from 'lucide-react';
import { ChecklistEntry, Note, NOTE_COLORS, NoteAttachment, NoteColor } from '../lib/types';
import { useBrain } from '../lib/brain';
import { newId } from '../lib/dates';
import { deleteMedia, uploadImage } from '../lib/media';
import { AutoTextarea, CheckButton, inputCls, Sheet, TagInput, useToast } from './ui';
import { NoteImage } from './NoteImage';

const hasContent = (n: Note) =>
  !!(n.title.trim() || n.text.trim() || n.checklist.some(i => i.text.trim()) || n.attachments.length);

export default function NoteEditor({ note, preset, onClose }: { note: Note | null; preset?: Partial<Note>; onClose: () => void }) {
  const { uid, newNote, saveNote, deleteNote, allTags } = useBrain();
  const toast = useToast();
  const [draft, setDraft] = useState<Note>(() => note || newNote(preset));
  const [showColors, setShowColors] = useState(false);
  const [showTags, setShowTags] = useState(!!draft.tags.length);
  const [showDone, setShowDone] = useState(false);
  const [linkForm, setLinkForm] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const savedOnce = useRef(!!note);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Salva sozinho enquanto você escreve
  useEffect(() => {
    if (!hasContent(draft) && !savedOnce.current) return;
    const t = setTimeout(() => {
      saveNote(draft);
      savedOnce.current = true;
    }, 700);
    return () => clearTimeout(t);
  }, [draft, saveNote]);

  useEffect(() => {
    if (focusId && itemRefs.current[focusId]) {
      itemRefs.current[focusId]!.focus();
      setFocusId(null);
    }
  }, [focusId, draft.checklist]);

  const close = () => {
    const d = draftRef.current;
    if (hasContent(d) || savedOnce.current) {
      const cleaned = { ...d, checklist: d.checklist.filter(i => i.text.trim()) };
      saveNote(cleaned);
    }
    onClose();
  };

  const update = (patch: Partial<Note>) => setDraft(d => ({ ...d, ...patch }));
  const setItems = (fn: (items: ChecklistEntry[]) => ChecklistEntry[]) =>
    setDraft(d => ({ ...d, checklist: fn(d.checklist) }));

  const addItem = (afterId?: string) => {
    const item = { id: newId(), text: '', done: false };
    setItems(items => {
      if (!afterId) return [...items, item];
      const idx = items.findIndex(i => i.id === afterId);
      const copy = [...items];
      copy.splice(idx + 1, 0, item);
      return copy;
    });
    setFocusId(item.id);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      setUploading(n => n + 1);
      try {
        const mediaId = await uploadImage(uid, f);
        const att: NoteAttachment = { id: newId(), type: 'image', name: f.name, mediaId };
        setDraft(d => ({ ...d, attachments: [...d.attachments, att] }));
      } catch (e: any) {
        toast(e?.message || 'Não consegui adicionar a foto.');
      } finally {
        setUploading(n => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (att: NoteAttachment) => {
    update({ attachments: draft.attachments.filter(a => a.id !== att.id) });
    if (att.mediaId) deleteMedia(uid, att.mediaId);
  };

  const addLink = () => {
    if (!linkForm?.url.trim()) return setLinkForm(null);
    let url = linkForm.url.trim();
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    const isVideo = /youtu\.?be|vimeo|instagram\.com\/(reel|p)\//.test(url);
    const isImage = /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
    const att: NoteAttachment = {
      id: newId(),
      type: isImage ? 'image' : isVideo ? 'video' : 'link',
      url,
      name: linkForm.name.trim() || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60),
    };
    update({ attachments: [...draft.attachments, att] });
    setLinkForm(null);
  };

  const open = draft.checklist.filter(i => !i.done);
  const done = draft.checklist.filter(i => i.done);
  const images = draft.attachments.filter(a => a.type === 'image');
  const links = draft.attachments.filter(a => a.type !== 'image');
  const color = draft.color ? NOTE_COLORS[draft.color] : null;

  const renderItem = (i: ChecklistEntry) => (
    <div key={i.id} className="flex items-start gap-2.5 group py-1">
      <div className="pt-1">
        <CheckButton size={20} checked={i.done} onChange={() => setItems(items => items.map(x => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
      </div>
      <AutoTextarea
        inputRef={el => (itemRefs.current[i.id] = el)}
        value={i.text}
        onChange={e => setItems(items => items.map(x => (x.id === i.id ? { ...x, text: e.target.value.replace(/\n/g, '') } : x)))}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addItem(i.id);
          } else if (e.key === 'Backspace' && !i.text) {
            e.preventDefault();
            const idx = draft.checklist.findIndex(x => x.id === i.id);
            const prev = draft.checklist[idx - 1];
            setItems(items => items.filter(x => x.id !== i.id));
            if (prev) setFocusId(prev.id);
          }
        }}
        placeholder="Item"
        className={`flex-1 bg-transparent outline-none text-[15px] leading-snug py-0.5 ${i.done ? 'line-through text-stone-400' : 'text-stone-800'}`}
      />
      <button
        onClick={() => setItems(items => items.filter(x => x.id !== i.id))}
        className="p-1 text-stone-300 hover:text-stone-500 sm:opacity-0 group-hover:opacity-100"
        aria-label="Tirar item"
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <Sheet
      open
      full
      onClose={close}
      title={<span className="text-sm font-normal text-stone-400">{note ? 'Nota' : 'Nova nota'}</span>}
      headerRight={
        <div className="flex items-center gap-1">
          <button
            onClick={() => update({ pinned: !draft.pinned })}
            className={`p-2 rounded-full hover:bg-stone-100 ${draft.pinned ? 'text-amber-600' : 'text-stone-400'}`}
            aria-label={draft.pinned ? 'Desafixar' : 'Fixar'}
            title={draft.pinned ? 'Fixada (aparece em Hoje)' : 'Fixar em Hoje'}
          >
            <Pin size={19} className={draft.pinned ? 'fill-current' : ''} />
          </button>
          <button
            onClick={() => setShowColors(s => !s)}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400"
            aria-label="Cor"
          >
            {color ? <span className={`block w-[18px] h-[18px] rounded-full ${color.dot}`} /> : <Palette size={19} />}
          </button>
          {note && (
            <button
              onClick={() => {
                deleteNote(draft);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-rose-50 text-stone-400 hover:text-rose-600"
              aria-label="Apagar nota"
            >
              <Trash2 size={19} />
            </button>
          )}
        </div>
      }
      footer={
        <div className="flex items-center gap-1 -mx-1">
          <button onClick={() => addItem()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-600 text-sm">
            <ListChecks size={18} /> Lista
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-600 text-sm">
            <Camera size={18} /> Foto
          </button>
          <button onClick={() => setLinkForm({ url: '', name: '' })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-600 text-sm">
            <Link2 size={18} /> Link
          </button>
          <button onClick={() => setShowTags(s => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-600 text-sm">
            <Hash size={18} /> Etiqueta
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onPickFiles(e.target.files)} />
        </div>
      }
    >
      {showColors && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => update({ color: null })}
            className={`w-8 h-8 rounded-full border-2 bg-white ${!draft.color ? 'border-mata-700' : 'border-stone-200'}`}
            aria-label="Sem cor"
          />
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
            <button
              key={c}
              onClick={() => update({ color: c })}
              className={`w-8 h-8 rounded-full border-2 ${NOTE_COLORS[c].dot} ${draft.color === c ? 'border-mata-700' : 'border-transparent'}`}
              aria-label={NOTE_COLORS[c].label}
            />
          ))}
        </div>
      )}

      <div className={`rounded-2xl ${color ? `${color.bg} p-3 -mx-1` : ''}`}>
        <AutoTextarea
          value={draft.title}
          onChange={e => update({ title: e.target.value.replace(/\n/g, ' ') })}
          placeholder="Título"
          className="w-full text-xl font-semibold bg-transparent outline-none placeholder:text-stone-300"
        />
        <AutoTextarea
          autoFocus={!note && !preset?.checklist}
          value={draft.text}
          onChange={e => update({ text: e.target.value })}
          placeholder={draft.checklist.length ? 'Texto (opcional)' : 'Escreva aqui…'}
          className="w-full mt-1 text-[16px] leading-relaxed bg-transparent outline-none placeholder:text-stone-300 min-h-[3rem]"
        />

        {draft.checklist.length > 0 && (
          <div className="mt-2">
            {open.map(renderItem)}
            <button onClick={() => addItem()} className="flex items-center gap-2.5 py-1.5 text-stone-400 text-[15px]">
              <Plus size={20} /> Item
            </button>
            {done.length > 0 && (
              <div className="mt-2 border-t border-stone-200/70 pt-2">
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowDone(s => !s)} className="flex items-center gap-1 text-sm text-stone-500">
                    <ChevronDown size={15} className={`transition ${showDone ? '' : '-rotate-90'}`} />
                    {done.length} {done.length === 1 ? 'marcado' : 'marcados'}
                  </button>
                  <div className="flex gap-3 text-xs text-stone-400">
                    <button onClick={() => setItems(items => items.map(i => ({ ...i, done: false })))}>Desmarcar todos</button>
                    <button onClick={() => setItems(items => items.filter(i => !i.done))}>Apagar marcados</button>
                  </div>
                </div>
                {showDone && done.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </div>

      {(images.length > 0 || uploading > 0) && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {images.map(a => (
            <div key={a.id} className="relative">
              <NoteImage att={a} className="w-full h-28 rounded-xl" />
              <button
                onClick={() => removeAttachment(a)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                aria-label="Tirar foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="h-28 rounded-xl bg-stone-100 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-transparent animate-spin" />
            </div>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-4 space-y-2">
          {links.map(a => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
              <Link2 size={15} className="text-stone-400 shrink-0" />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-sm text-sky-700">
                {a.name}
              </a>
              <button onClick={() => removeAttachment(a)} className="p-1 text-stone-300 hover:text-stone-500" aria-label="Tirar link">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {linkForm && (
        <div className="mt-4 rounded-2xl border border-stone-200 p-3 space-y-2 bg-stone-50">
          <input
            autoFocus
            value={linkForm.url}
            onChange={e => setLinkForm({ ...linkForm, url: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addLink()}
            placeholder="Cole o link (site, vídeo, foto)"
            className={inputCls}
            inputMode="url"
          />
          <input
            value={linkForm.name}
            onChange={e => setLinkForm({ ...linkForm, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addLink()}
            placeholder="Nome (opcional)"
            className={inputCls}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setLinkForm(null)} className="px-3 py-2 text-sm text-stone-500">
              Cancelar
            </button>
            <button onClick={addLink} className="px-4 py-2 text-sm rounded-xl bg-mata-700 text-white font-medium">
              Adicionar
            </button>
          </div>
        </div>
      )}

      {showTags && (
        <div className="mt-4">
          <TagInput value={draft.tags} onChange={tags => update({ tags })} suggestions={allTags} />
        </div>
      )}

      <div className="text-xs text-stone-300 mt-6 text-center">
        {note ? `Editada ${new Date(draft.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Salva sozinha enquanto você escreve'}
      </div>
    </Sheet>
  );
}
