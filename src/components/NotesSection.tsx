import React, { useState } from 'react';
import { Note, NoteMedia, RoutineItem, GoogleCalendarEvent } from '../types';
import { Plus, Trash2, Search, Link2, Image, Video, Paperclip, ExternalLink, Calendar, HelpCircle, FileText, Sparkles, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotesSectionProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  routine: RoutineItem[];
  calendarEvents: GoogleCalendarEvent[];
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function NotesSection({ notes, setNotes, routine, calendarEvents, addToast }: NotesSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setNoteCategory('');
    setMediaList([]);
    setMediaUrl('');
    setMediaName('');
    setLinkType('none');
    setLinkedId('');
    setIsAdding(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title || '');
    setContent(note.content || '');
    setNoteCategory(note.category || '');
    setMediaList(note.media || []);
    setMediaUrl('');
    setMediaName('');
    if (note.linkedTo) {
      setLinkType(note.linkedTo.type);
      setLinkedId(note.linkedTo.id);
    } else {
      setLinkType('none');
      setLinkedId('');
    }
    setIsAdding(true);
  };
  
  // Media states
  const [mediaList, setMediaList] = useState<NoteMedia[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('link');

  // Linkages
  const [linkType, setLinkType] = useState<'none' | 'routine' | 'calendar'>('none');
  const [linkedId, setLinkedId] = useState('');

  const handleAddMedia = () => {
    if (!mediaUrl.trim() || !mediaName.trim()) return;
    
    const newMedia: NoteMedia = {
      id: `media-${Date.now()}`,
      type: mediaType,
      url: mediaUrl.trim(),
      name: mediaName.trim(),
    };

    setMediaList(prev => [...prev, newMedia]);
    setMediaUrl('');
    setMediaName('');
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList(prev => prev.filter(m => m.id !== id));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    let linkedTo = undefined;
    if (linkType !== 'none' && linkedId) {
      if (linkType === 'routine') {
        const item = routine.find(r => r.id === linkedId);
        linkedTo = {
          type: 'routine' as const,
          id: linkedId,
          title: item ? `${item.title} (${formatDayName(item.dayOfWeek)})` : 'Rotina vinculada',
        };
      } else {
        const event = calendarEvents.find(c => c.id === linkedId);
        linkedTo = {
          type: 'calendar' as const,
          id: linkedId,
          title: event ? event.summary : 'Compromisso vinculado',
        };
      }
    }

    if (editingNoteId) {
      setNotes(prev =>
        prev.map(n => {
          if (n.id === editingNoteId) {
            return {
              ...n,
              title: title.trim() || 'Nota sem título',
              content: content.trim(),
              category: noteCategory.trim() || undefined,
              media: mediaList,
              linkedTo,
            };
          }
          return n;
        })
      );
      addToast?.(`Nota "${title.trim() || 'Nota sem título'}" atualizada com sucesso!`, 'success');
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: title.trim() || 'Nota sem título',
        content: content.trim(),
        category: noteCategory.trim() || undefined,
        media: mediaList,
        createdAt: new Date().toISOString(),
        linkedTo,
      };

      setNotes(prev => [newNote, ...prev]);
      addToast?.(`Nota "${newNote.title}" salva com sucesso!`, 'success');
    }

    // Auto-expand the category when created/edited
    const catName = noteCategory.trim() || 'Sem Categoria';
    setExpandedCategories(prev => ({ ...prev, [catName]: true }));

    resetForm();
  };

  const handleDeleteNote = (id: string) => {
    const note = notes.find(n => n.id !== id); // Actually let's use the exact matching in the original file, wait, we'll keep the same behavior
    if (window.confirm('Excluir esta nota permanentemente?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      const deletedNote = notes.find(n => n.id === id);
      if (deletedNote) {
        addToast?.(`Nota "${deletedNote.title}" excluída.`, 'info');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setNoteCategory('');
    setMediaList([]);
    setMediaUrl('');
    setMediaName('');
    setLinkType('none');
    setLinkedId('');
    setIsAdding(false);
    setEditingNoteId(null);
  };

  const formatDayName = (dayNum: number) => {
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return names[dayNum];
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="notes-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Notas & Mídias Rápidas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deposite pensamentos, artigos, referências de imagem ou vídeos em um local centralizado
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Nova Nota
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Pesquisar em suas notas..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      {/* Grid of Notes grouped by category */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {(() => {
            const groupedNotes = filteredNotes.reduce<Record<string, Note[]>>((acc, note) => {
              const cat = note.category?.trim() || 'Sem Categoria';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(note);
              return acc;
            }, {});

            const categories = Object.keys(groupedNotes).sort((a, b) => {
              if (a === 'Sem Categoria') return 1;
              if (b === 'Sem Categoria') return -1;
              return a.localeCompare(b);
            });

            if (filteredNotes.length === 0) {
              return (
                <div className="py-12 text-center text-slate-500">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                    <FileText size={18} />
                  </div>
                  <p className="text-sm font-medium">Nenhuma nota encontrada</p>
                  <p className="text-xs text-slate-400 mt-1">Crie insights e salve seus links importantes.</p>
                </div>
              );
            }

            const toggleCategory = (cat: string) => {
              setExpandedCategories(prev => ({
                ...prev,
                [cat]: !prev[cat],
              }));
            };

            return (
              <div className="space-y-4">
                {/* Expand/Collapse All helpers */}
                <div className="flex justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const newExpanded: Record<string, boolean> = {};
                      categories.forEach(cat => {
                        newExpanded[cat] = true;
                      });
                      setExpandedCategories(newExpanded);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer transition"
                  >
                    Expandir Todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setExpandedCategories({})}
                    className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer transition"
                  >
                    Recolher Todas
                  </button>
                </div>

                {categories.map(catName => {
                  const catNotes = groupedNotes[catName];
                  const isExpanded = !!expandedCategories[catName];

                  return (
                    <div key={catName} className="space-y-3 bg-white/40 rounded-2xl p-2 border border-slate-100">
                      {/* Category Header (Collapsible Accordion Trigger) */}
                      <button
                        onClick={() => toggleCategory(catName)}
                        className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 border border-slate-200/60 rounded-xl transition text-left cursor-pointer font-medium shadow-3xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${catName === 'Sem Categoria' ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                          <span className="text-sm font-semibold text-slate-800">{catName}</span>
                          <span className="text-xs text-slate-400 font-mono">({catNotes.length} {catNotes.length === 1 ? 'nota' : 'notas'})</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                      </button>

                      {/* Category Notes Grid */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start p-1 animate-fade-in">
                          {catNotes.map(note => (
                            <motion.div
                              key={note.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xs transition duration-200 relative"
                            >
                              {/* Linked label if present */}
                              {note.linkedTo && (
                                <div className="bg-indigo-50 px-4 py-1.5 border-b border-indigo-100 flex items-center gap-1.5 text-[10px] text-indigo-800 font-semibold font-mono">
                                  <Calendar size={11} />
                                  VINCULADO: {note.linkedTo.title}
                                </div>
                              )}

                              <div className="p-5 flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition truncate">
                                    {note.title}
                                  </h3>
                                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 shrink-0">
                                    <button
                                      onClick={() => handleOpenEdit(note)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                                      title="Editar Nota"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-light font-sans">
                                  {note.content}
                                </p>

                                {/* Render note media list */}
                                {note.media && note.media.length > 0 && (
                                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                    {note.media.map(media => {
                                      if (media.type === 'image') {
                                        return (
                                          <div key={media.id} className="relative rounded-lg overflow-hidden group/img">
                                            <img
                                              src={media.url}
                                              alt={media.name}
                                              referrerPolicy="no-referrer"
                                              className="w-full h-32 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                              <span className="text-[10px] font-semibold text-white truncate">{media.name}</span>
                                            </div>
                                          </div>
                                        );
                                      } else if (media.type === 'video') {
                                        return (
                                          <div key={media.id} className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between border border-slate-100">
                                            <div className="flex items-center gap-2">
                                              <span className="p-1 bg-red-50 text-red-600 rounded">
                                                <Video size={12} />
                                              </span>
                                              <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">{media.name}</span>
                                            </div>
                                            <a
                                              href={media.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                                            >
                                              Assistir
                                              <ExternalLink size={10} />
                                            </a>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <a
                                            key={media.id}
                                            href={media.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-slate-50 hover:bg-indigo-50/50 rounded-xl p-2.5 flex items-center justify-between border border-slate-100 transition"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="p-1 bg-blue-50 text-blue-600 rounded">
                                                <Link2 size={12} />
                                              </span>
                                              <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">{media.name}</span>
                                            </div>
                                            <ExternalLink size={11} className="text-slate-400" />
                                          </a>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                                <span>{note.media?.length || 0} anexo(s)</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Add Note Modal Dialog */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-xl overflow-hidden my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-slate-900">
                {editingNoteId ? 'Editar Nota' : 'Criar Nova Nota'}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Ex: Resumo do livro antifrágil, Projeto XYZ"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Livros, Trabalho, Ideias"
                  value={noteCategory}
                  onChange={e => setNoteCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Conteúdo</label>
                <textarea
                  required
                  placeholder="Escreva suas anotações livres aqui..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Linking to other modules */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" />
                  Vincular a Rotina ou Compromisso?
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'routine', 'calendar'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setLinkType(type);
                        setLinkedId('');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        linkType === type
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type === 'none' && 'Não'}
                      {type === 'routine' && 'Rotina'}
                      {type === 'calendar' && 'Google Agenda'}
                    </button>
                  ))}
                </div>

                {linkType === 'routine' && (
                  <select
                    value={linkedId}
                    onChange={e => setLinkedId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    <option value="">-- Selecione a Rotina --</option>
                    {routine.map(r => (
                      <option key={r.id} value={r.id}>
                        [{formatDayName(r.dayOfWeek)} - {r.time}] {r.title}
                      </option>
                    ))}
                  </select>
                )}

                {linkType === 'calendar' && (
                  <select
                    value={linkedId}
                    onChange={e => setLinkedId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    <option value="">-- Selecione o Evento --</option>
                    {calendarEvents.length === 0 ? (
                      <option disabled>Nenhum evento do Google Agenda sincronizado</option>
                    ) : (
                      calendarEvents.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Add attachment item */}
              <div className="p-4 bg-indigo-50/10 rounded-2xl border border-indigo-100/30 space-y-3">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Paperclip size={13} className="text-indigo-600" />
                  Adicionar Link, Imagem ou Vídeo Curto
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {(['link', 'image', 'video'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMediaType(type)}
                      className={`py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        mediaType === type
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {type === 'link' && 'Link Externo'}
                      {type === 'image' && 'Imagem URL'}
                      {type === 'video' && 'Vídeo URL'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Título do anexo (ex: Ver no Pinterest)"
                    value={mediaName}
                    onChange={e => setMediaName(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="https://exemplo.com/recurso"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddMedia}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Confirmar Anexo
                </button>

                {mediaList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mediaList.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] text-slate-700">
                        {m.type === 'image' && <Image size={10} />}
                        {m.type === 'video' && <Video size={10} />}
                        {m.type === 'link' && <Link2 size={10} />}
                        <span className="truncate max-w-[80px]">{m.name}</span>
                        <button type="button" onClick={() => handleRemoveMedia(m.id)} className="text-slate-400 hover:text-red-500 font-bold ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  {editingNoteId ? 'Salvar Alterações' : 'Criar Nota'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
