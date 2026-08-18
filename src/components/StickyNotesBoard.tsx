import React, { useState } from 'react';
import { StickyNote, StickyNoteColor } from '../types';
import { 
  Pin, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Tag, 
  Search, 
  Sparkles, 
  Pencil, 
  X,
  StickyNote as StickyNoteIcon,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StickyNotesBoardProps {
  stickyNotes: StickyNote[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNote[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const COLOR_MAP: Record<
  StickyNoteColor, 
  { 
    name: string; 
    bg: string; 
    border: string; 
    text: string; 
    accent: string;
    pinBg: string;
    badge: string;
  }
> = {
  yellow: {
    name: 'Amarelo',
    bg: 'bg-amber-100/95 hover:bg-amber-100',
    border: 'border-amber-200/90',
    text: 'text-amber-950',
    accent: 'bg-amber-400',
    pinBg: 'text-amber-700',
    badge: 'bg-amber-200/80 text-amber-900',
  },
  pink: {
    name: 'Rosa',
    bg: 'bg-rose-100/95 hover:bg-rose-100',
    border: 'border-rose-200/90',
    text: 'text-rose-950',
    accent: 'bg-rose-400',
    pinBg: 'text-rose-700',
    badge: 'bg-rose-200/80 text-rose-900',
  },
  blue: {
    name: 'Azul',
    bg: 'bg-sky-100/95 hover:bg-sky-100',
    border: 'border-sky-200/90',
    text: 'text-sky-950',
    accent: 'bg-sky-400',
    pinBg: 'text-sky-700',
    badge: 'bg-sky-200/80 text-sky-900',
  },
  green: {
    name: 'Verde',
    bg: 'bg-emerald-100/95 hover:bg-emerald-100',
    border: 'border-emerald-200/90',
    text: 'text-emerald-950',
    accent: 'bg-emerald-400',
    pinBg: 'text-emerald-700',
    badge: 'bg-emerald-200/80 text-emerald-900',
  },
  purple: {
    name: 'Roxo',
    bg: 'bg-purple-100/95 hover:bg-purple-100',
    border: 'border-purple-200/90',
    text: 'text-purple-950',
    accent: 'bg-purple-400',
    pinBg: 'text-purple-700',
    badge: 'bg-purple-200/80 text-purple-900',
  },
  amber: {
    name: 'Laranja',
    bg: 'bg-orange-100/95 hover:bg-orange-100',
    border: 'border-orange-200/90',
    text: 'text-orange-950',
    accent: 'bg-orange-400',
    pinBg: 'text-orange-700',
    badge: 'bg-orange-200/80 text-orange-900',
  },
};

export default function StickyNotesBoard({
  stickyNotes,
  setStickyNotes,
  addToast,
}: StickyNotesBoardProps) {
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>('yellow');
  const [newTag, setNewTag] = useState('');
  const [isPinnedNew, setIsPinnedNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState<StickyNoteColor | 'all'>('all');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<StickyNoteColor>('yellow');
  const [editTag, setEditTag] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newContent.trim()) return;

    const newNote: StickyNote = {
      id: 'stick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      content: newContent.trim(),
      color: selectedColor,
      createdAt: new Date().toISOString(),
      pinned: isPinnedNew,
      tag: newTag.trim() || undefined,
    };

    setStickyNotes(prev => [newNote, ...prev]);
    setNewContent('');
    setNewTag('');
    setIsPinnedNew(false);
    addToast?.('Post-it afixado no quadro! 📌', 'success');
  };

  const handleDelete = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
    addToast?.('Post-it removido!', 'info');
  };

  const handleTogglePin = (id: string) => {
    setStickyNotes(prev => prev.map(n => {
      if (n.id === id) {
        const nextPinned = !n.pinned;
        addToast?.(nextPinned ? 'Post-it fixado no topo 📌' : 'Post-it desafixado', 'info');
        return { ...n, pinned: nextPinned };
      }
      return n;
    }));
  };

  const handleStartEdit = (note: StickyNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditColor(note.color);
    setEditTag(note.tag || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) {
      handleDelete(id);
      return;
    }

    setStickyNotes(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          content: editContent.trim(),
          color: editColor,
          tag: editTag.trim() || undefined,
        };
      }
      return n;
    }));

    setEditingId(null);
    addToast?.('Post-it atualizado!', 'success');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast?.('Copiado para a área de transferência! 📋', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and sort: pinned notes first, then chronological
  const filteredNotes = stickyNotes
    .filter(note => {
      const matchesSearch = searchTerm.trim() === '' || 
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.tag && note.tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesColor = colorFilter === 'all' || note.color === colorFilter;
      return matchesSearch && matchesColor;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90 space-y-6">
      {/* Header & Quick Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <StickyNoteIcon size={18} />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-lg sm:text-xl">
              Quadro de Post-its & Lembretes Rápidos
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Anote pensamentos rápidos, ideias instantâneas, telefones ou lembretes passageiros em cartões autoadesivos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/60 px-3 py-1 rounded-xl">
            {stickyNotes.length} {stickyNotes.length === 1 ? 'post-it' : 'post-its'}
          </span>
        </div>
      </div>

      {/* Creation Box (Quick Post-it Creator) */}
      <div className="bg-gradient-to-br from-amber-50/70 via-slate-50 to-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-amber-200/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Novo Post-it Rápido
          </span>

          {/* Color selector palette */}
          <div className="flex items-center gap-1.5">
            {(['yellow', 'pink', 'blue', 'green', 'purple', 'amber'] as StickyNoteColor[]).map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${COLOR_MAP[color].accent} ${
                  selectedColor === color 
                    ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110 shadow-xs' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={COLOR_MAP[color].name}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleAddNote} className="space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              placeholder="Escreva algo rápido aqui... (Ex: Comprar pilhas, ligar para Dr. Carlos, ideia para projeto...)"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAddNote();
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400 shadow-2xs resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Tag size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Tag/Etiqueta (opcional)"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="bg-transparent border-none outline-hidden text-xs text-slate-700 placeholder-slate-400 w-28 sm:w-36"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsPinnedNew(!isPinnedNew)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isPinnedNew
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Pin size={13} className={isPinnedNew ? 'fill-amber-600' : ''} />
                <span>{isPinnedNew ? 'Fixado no Topo' : 'Fixar'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!newContent.trim()}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer ml-auto"
            >
              <Plus size={15} />
              Afixar Post-it
            </button>
          </div>
        </form>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar nos post-its..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Color filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Cor:</span>
          <button
            onClick={() => setColorFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              colorFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas
          </button>
          {(['yellow', 'pink', 'blue', 'green', 'purple', 'amber'] as StickyNoteColor[]).map(c => (
            <button
              key={c}
              onClick={() => setColorFilter(c)}
              className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${COLOR_MAP[c].accent} ${
                colorFilter === c
                  ? 'ring-2 ring-slate-800 scale-110 shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
              title={COLOR_MAP[c].name}
            />
          ))}
        </div>
      </div>

      {/* Post-it Grid Display */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-2">
          <div className="w-12 h-12 mx-auto bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
            <StickyNoteIcon size={24} />
          </div>
          <h4 className="font-bold text-slate-700 text-sm">
            {searchTerm || colorFilter !== 'all' ? 'Nenhum post-it encontrado no filtro' : 'Seu quadro de post-its está vazio'}
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm || colorFilter !== 'all' 
              ? 'Tente remover o termo de busca ou selecionar outra cor.' 
              : 'Use o campo acima para pregar ideias, lembretes instantâneos e tarefas rápidas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <AnimatePresence>
            {filteredNotes.map(note => {
              const colorInfo = COLOR_MAP[note.color] || COLOR_MAP.yellow;
              const isEditing = editingId === note.id;

              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className={`relative group rounded-2xl p-4 sm:p-5 border shadow-sm transition-all duration-200 flex flex-col justify-between min-h-[160px] ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text}`}
                >
                  {/* Pin / Tape indicator */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1 rounded-md transition cursor-pointer ${
                          note.pinned 
                            ? 'text-amber-800 bg-amber-200/70 hover:bg-amber-300' 
                            : 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
                        }`}
                        title={note.pinned ? 'Desafixar' : 'Fixar no topo'}
                      >
                        <Pin size={14} className={note.pinned ? 'fill-current' : ''} />
                      </button>

                      {note.tag && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorInfo.badge} truncate max-w-[130px]`}>
                          #{note.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleCopy(note.id, note.content)}
                        className="p-1 rounded-md hover:bg-black/10 transition cursor-pointer text-slate-600"
                        title="Copiar texto"
                      >
                        {copiedId === note.id ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="p-1 rounded-md hover:bg-black/10 transition cursor-pointer text-slate-600"
                        title="Editar post-it"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="p-1 rounded-md hover:bg-red-500/20 hover:text-red-700 transition cursor-pointer text-slate-600"
                        title="Excluir post-it"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body Content / Inline Editor */}
                  {isEditing ? (
                    <div className="space-y-2 my-1">
                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-white/90 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {(['yellow', 'pink', 'blue', 'green', 'purple', 'amber'] as StickyNoteColor[]).map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`w-4 h-4 rounded-full border ${COLOR_MAP[c].accent} ${
                                editColor === c ? 'ring-2 ring-slate-800' : 'opacity-60'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-white/80 hover:bg-white text-slate-700 rounded-lg text-[10px] font-bold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-2 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-bold"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words flex-1 py-1">
                      {note.content}
                    </p>
                  )}

                  {/* Footer date info */}
                  <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] opacity-70 font-mono">
                    <span>
                      {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {note.pinned && <span className="font-bold uppercase tracking-wider text-[9px]">Fixado</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
