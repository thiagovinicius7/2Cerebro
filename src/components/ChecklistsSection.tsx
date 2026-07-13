import React, { useState } from 'react';
import { Checklist, ChecklistItem, RoutineItem, GoogleCalendarEvent } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, Calendar, PlusCircle, CheckSquare, Sparkles, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChecklistsSectionProps {
  checklists: Checklist[];
  setChecklists: React.Dispatch<React.SetStateAction<Checklist[]>>;
  routine: RoutineItem[];
  calendarEvents: GoogleCalendarEvent[];
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ChecklistsSection({
  checklists,
  setChecklists,
  routine,
  calendarEvents,
  addToast,
}: ChecklistsSectionProps) {
  const [isAddingList, setIsAddingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState('');
  const [listCategory, setListCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Adding items to a specific list
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  // Item linking
  const [activeLinkingItemId, setActiveLinkingItemId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<'none' | 'routine' | 'calendar'>('none');
  const [linkedId, setLinkedId] = useState('');

  // Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTextValue, setEditingItemTextValue] = useState('');
  const [editingItemParentListId, setEditingItemParentListId] = useState<string | null>(null);

  const handleOpenAddList = () => {
    setEditingListId(null);
    setListTitle('');
    setListCategory('');
    setIsAddingList(true);
  };

  const handleOpenEditList = (list: Checklist) => {
    setEditingListId(list.id);
    setListTitle(list.title);
    setListCategory(list.category || '');
    setIsAddingList(true);
  };

  const handleStartEditItem = (listId: string, item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemParentListId(listId);
    setEditingItemTextValue(item.text);
  };

  const handleSaveItemEdit = () => {
    if (!editingItemId || !editingItemParentListId || !editingItemTextValue.trim()) return;

    setChecklists(prev =>
      prev.map(list => {
        if (list.id === editingItemParentListId) {
          return {
            ...list,
            items: list.items.map(item =>
              item.id === editingItemId ? { ...item, text: editingItemTextValue.trim() } : item
            ),
          };
        }
        return list;
      })
    );

    addToast?.('Tarefa atualizada!', 'success');
    setEditingItemId(null);
    setEditingItemParentListId(null);
    setEditingItemTextValue('');
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listTitle.trim()) return;

    if (editingListId) {
      setChecklists(prev =>
        prev.map(list => {
          if (list.id === editingListId) {
            return {
              ...list,
              title: listTitle.trim(),
              category: listCategory.trim() || undefined,
            };
          }
          return list;
        })
      );
      addToast?.(`Checklist "${listTitle.trim()}" atualizado!`, 'success');
    } else {
      const newList: Checklist = {
        id: `chk-${Date.now()}`,
        title: listTitle.trim(),
        items: [],
        createdAt: new Date().toISOString(),
        category: listCategory.trim() || undefined,
      };

      setChecklists(prev => [newList, ...prev]);
      addToast?.(`Lista "${newList.title}" criada!`, 'success');
    }

    const catName = listCategory.trim() || 'Sem Categoria';
    setExpandedCategories(prev => ({ ...prev, [catName]: true }));
    setListTitle('');
    setListCategory('');
    setIsAddingList(false);
    setEditingListId(null);
  };

  const handleDeleteList = (listId: string) => {
    const list = checklists.find(c => c.id === listId);
    if (window.confirm('Excluir esta lista de tarefas permanentemente?')) {
      setChecklists(prev => prev.filter(c => c.id !== listId));
      if (list) {
        addToast?.(`Lista "${list.title}" excluída.`, 'info');
      }
    }
  };

  const handleAddItem = (listId: string) => {
    const text = newItemText[listId] || '';
    if (!text.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: text.trim(),
      done: false,
    };

    setChecklists(prev =>
      prev.map(list => {
        if (list.id === listId) {
          addToast?.(`Tarefa adicionada!`, 'success');
          return {
            ...list,
            items: [...list.items, newItem],
          };
        }
        return list;
      })
    );

    setNewItemText(prev => ({ ...prev, [listId]: '' }));
  };

  const handleToggleItem = (listId: string, itemId: string) => {
    setChecklists(prev =>
      prev.map(list => {
        if (list.id === listId) {
          const item = list.items.find(i => i.id === itemId);
          if (item) {
            const nextDone = !item.done;
            addToast?.(
              nextDone ? `Tarefa "${item.text}" concluída! ✓` : `Tarefa "${item.text}" desmarcada`,
              nextDone ? 'success' : 'info'
            );
          }
          return {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, done: !item.done } : item
            ),
          };
        }
        return list;
      })
    );
  };

  const handleDeleteItem = (listId: string, itemId: string) => {
    setChecklists(prev =>
      prev.map(list => {
        if (list.id === listId) {
          const item = list.items.find(i => i.id === itemId);
          if (item) {
            addToast?.(`Tarefa "${item.text}" excluída.`, 'info');
          }
          return {
            ...list,
            items: list.items.filter(item => item.id !== itemId),
          };
        }
        return list;
      })
    );
  };

  const formatDayName = (dayNum: number) => {
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return names[dayNum];
  };

  const handleOpenLinkingModal = (itemId: string) => {
    setActiveLinkingItemId(itemId);
    setLinkType('none');
    setLinkedId('');
  };

  const handleSaveLinkage = (listId: string) => {
    if (!activeLinkingItemId) return;

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

    setChecklists(prev =>
      prev.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.map(item =>
              item.id === activeLinkingItemId ? { ...item, linkedTo } : item
            ),
          };
        }
        return list;
      })
    );

    setActiveLinkingItemId(null);
  };

  return (
    <div id="checklists-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Checklists de Planejamento
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gere checklists de apoio estruturados para eventos, compras ou roteiros e anexe a rotinas
          </p>
        </div>

        <button
          onClick={handleOpenAddList}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Criar Checklist
        </button>
      </div>

      {/* Grid of lists grouped by category */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {(() => {
            const groupedChecklists = checklists.reduce<Record<string, Checklist[]>>((acc, list) => {
              const cat = list.category?.trim() || 'Sem Categoria';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(list);
              return acc;
            }, {});

            const categories = Object.keys(groupedChecklists).sort((a, b) => {
              if (a === 'Sem Categoria') return 1;
              if (b === 'Sem Categoria') return -1;
              return a.localeCompare(b);
            });

            if (checklists.length === 0) {
              return (
                <div className="py-12 text-center text-slate-500">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                    <ListTodo size={18} />
                  </div>
                  <p className="text-sm font-semibold">Sem checklists cadastrados</p>
                  <p className="text-xs text-slate-500 mt-1">Clique acima e crie sua primeira lista.</p>
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
                  const catLists = groupedChecklists[catName];
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
                          <span className="text-xs text-slate-400 font-mono">({catLists.length} {catLists.length === 1 ? 'checklist' : 'checklists'})</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                      </button>

                      {/* Category Checklists Grid */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start p-1 animate-fade-in">
                          {catLists.map(list => {
                            const totalItems = list.items.length;
                            const completedItems = list.items.filter(i => i.done).length;
                            const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                            return (
                              <motion.div
                                key={list.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xs transition duration-200"
                              >
                                {/* Checklist Header */}
                                <div className="flex items-center justify-between gap-4 mb-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">
                                      {list.title}
                                    </h3>
                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                      {completedItems} de {totalItems} tarefas concluídas ({progressPct}%)
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleOpenEditList(list)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                                      title="Editar Checklist"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteList(list.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
                                      title="Excluir Checklist"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                                  <div
                                    className="h-full bg-indigo-600 transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>

                                {/* Checklist Items */}
                                <div className="space-y-2.5 mb-5 max-h-72 overflow-y-auto pr-1">
                                  <AnimatePresence mode="popLayout">
                                    {list.items.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic text-center py-4">Sua lista está vazia</p>
                                    ) : (
                                      list.items.map(item => (
                                        <motion.div
                                          key={item.id}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          className="flex items-start gap-3 group/item p-1 relative"
                                        >
                                          <button
                                            onClick={() => handleToggleItem(list.id, item.id)}
                                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                                          >
                                            {item.done ? (
                                              <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                                            ) : (
                                              <Circle size={16} />
                                            )}
                                          </button>

                                          <div className="flex-1 min-w-0">
                                            {editingItemId === item.id ? (
                                              <div className="flex gap-1 items-center">
                                                <input
                                                  type="text"
                                                  value={editingItemTextValue}
                                                  onChange={e => setEditingItemTextValue(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveItemEdit();
                                                    if (e.key === 'Escape') {
                                                      setEditingItemId(null);
                                                      setEditingItemParentListId(null);
                                                    }
                                                  }}
                                                  autoFocus
                                                  className="flex-1 px-2 py-1 border border-indigo-300 rounded-lg text-xs focus:outline-none bg-white"
                                                />
                                                <button
                                                  onClick={handleSaveItemEdit}
                                                  className="p-1 text-emerald-600 hover:text-emerald-800 font-bold text-xs"
                                                >
                                                  ✓
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingItemId(null);
                                                    setEditingItemParentListId(null);
                                                  }}
                                                  className="p-1 text-red-500 hover:text-red-700 font-bold text-xs"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <p className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                  {item.text}
                                                </p>
                                                {item.linkedTo && (
                                                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-[9px] text-indigo-800 px-1.5 py-0.5 rounded-md font-mono mt-1 font-semibold">
                                                    <Calendar size={9} />
                                                    Vínculo: {item.linkedTo.title}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => handleStartEditItem(list.id, item)}
                                              className="p-1 rounded-md text-slate-400 hover:text-indigo-700 hover:bg-slate-50 transition"
                                              title="Editar texto da tarefa"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                            <button
                                              onClick={() => handleOpenLinkingModal(item.id)}
                                              className="p-1 rounded-md text-slate-400 hover:text-indigo-700 hover:bg-slate-50 transition"
                                              title="Vincular a Rotina/Agenda"
                                            >
                                              <Calendar size={12} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteItem(list.id, item.id)}
                                              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-50 transition"
                                              title="Excluir tarefa"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>

                                          {/* Inline linking selector */}
                                          {activeLinkingItemId === item.id && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                                              <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
                                                <h4 className="font-semibold text-sm text-slate-900">Vincular Tarefa a evento ou rotina</h4>
                                                
                                                <div className="grid grid-cols-3 gap-2">
                                                  {(['none', 'routine', 'calendar'] as const).map(type => (
                                                    <button
                                                      key={type}
                                                      onClick={() => {
                                                        setLinkType(type);
                                                        setLinkedId('');
                                                      }}
                                                      className={`py-1 rounded-lg text-[11px] font-bold border transition ${
                                                        linkType === type
                                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                                                          : 'bg-white border-slate-200 text-slate-600'
                                                      }`}
                                                    >
                                                      {type === 'none' && 'Nenhum'}
                                                      {type === 'routine' && 'Rotina'}
                                                      {type === 'calendar' && 'Agenda'}
                                                    </button>
                                                  ))}
                                                </div>

                                                {linkType === 'routine' && (
                                                  <select
                                                    value={linkedId}
                                                    onChange={e => setLinkedId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                                                  >
                                                    <option value="">-- Selecione a Rotina Semanal --</option>
                                                    {routine.map(r => (
                                                      <option key={r.id} value={r.id}>
                                                        [{formatDayName(r.dayOfWeek)}] {r.title}
                                                      </option>
                                                    ))}
                                                  </select>
                                                )}

                                                {linkType === 'calendar' && (
                                                  <select
                                                    value={linkedId}
                                                    onChange={e => setLinkedId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                                                  >
                                                    <option value="">-- Selecione o compromisso --</option>
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

                                                <div className="flex gap-2 pt-2">
                                                  <button
                                                    onClick={() => setActiveLinkingItemId(null)}
                                                    className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                  >
                                                    Fechar
                                                  </button>
                                                  <button
                                                    onClick={() => handleSaveLinkage(list.id)}
                                                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                                                  >
                                                    Salvar Vínculo
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </motion.div>
                                      ))
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Add item bar */}
                                <div className="flex gap-2 mt-auto">
                                  <input
                                    type="text"
                                    placeholder="Adicionar item..."
                                    value={newItemText[list.id] || ''}
                                    onChange={e =>
                                      setNewItemText(prev => ({ ...prev, [list.id]: e.target.value }))
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleAddItem(list.id);
                                    }}
                                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                                  />
                                  <button
                                    onClick={() => handleAddItem(list.id)}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                                  >
                                    <PlusCircle size={15} />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
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

      {/* Create List Modal */}
      {isAddingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-slate-900">
                {editingListId ? 'Editar Checklist' : 'Novo Checklist'}
              </h3>
              <button
                onClick={() => setIsAddingList(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateList} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título do Checklist</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mala para a Praia, Compras de Natal"
                  value={listTitle}
                  onChange={e => setListTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoria (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Viagens, Casa, Trabalho, Pessoal"
                  value={listCategory}
                  onChange={e => setListCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingList(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  {editingListId ? 'Salvar Alterações' : 'Criar Lista'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
