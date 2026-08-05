import React, { useState } from 'react';
import { RoutineItem } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, AlertCircle, Sun, Sunset, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoutineSectionProps {
  routine: RoutineItem[];
  setRoutine: React.Dispatch<React.SetStateAction<RoutineItem[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', shortLabel: 'Dom' },
  { value: 1, label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 2, label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 3, label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 4, label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 5, label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 6, label: 'Sábado', shortLabel: 'Sáb' },
];

const WEEKDAYS_CONFIG = [
  { value: 1, label: 'Seg', fullName: 'Segunda-feira' },
  { value: 2, label: 'Ter', fullName: 'Terça-feira' },
  { value: 3, label: 'Qua', fullName: 'Quarta-feira' },
  { value: 4, label: 'Qui', fullName: 'Quinta-feira' },
  { value: 5, label: 'Sex', fullName: 'Sexta-feira' },
  { value: 6, label: 'Sáb', fullName: 'Sábado' },
  { value: 0, label: 'Dom', fullName: 'Domingo' },
];

// Helper to get YYYY-MM-DD date for a specific dayOfWeek in the offset week
const getDateForDay = (dayOfWeek: number, offset: number = 0) => {
  const d = new Date();
  const currentDayOfWeek = d.getDay();
  const diff = dayOfWeek - currentDayOfWeek + (offset * 7);
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDayMonth = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

const isItemDoneForDate = (item: RoutineItem, dateStr: string): boolean => {
  if (item.history && typeof item.history[dateStr] === 'boolean') {
    return item.history[dateStr];
  }
  return false;
};

export default function RoutineSection({ routine, setRoutine, addToast }: RoutineSectionProps) {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([selectedDay]);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const selectedDateStr = getDateForDay(selectedDay, weekOffset);
  const weekStartDateLabel = formatDayMonth(getDateForDay(0, weekOffset));
  const weekEndDateLabel = formatDayMonth(getDateForDay(6, weekOffset));

  const toggleDayOfWeek = (dayVal: number) => {
    setSelectedDays(prev =>
      prev.includes(dayVal)
        ? prev.filter(d => d !== dayVal)
        : [...prev, dayVal].sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0];
            return order.indexOf(a) - order.indexOf(b);
          })
    );
  };

  const getPeriod = (timeStr: string): 'manha' | 'tarde' | 'noite' => {
    if (!timeStr) return 'manha';
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 6 && hour < 12) return 'manha';
    if (hour >= 12 && hour < 18) return 'tarde';
    return 'noite'; // Covers 18:00 to 05:59
  };

  const getDurationMinutes = (startTime: string, endTime?: string): number => {
    if (!endTime) return 45; // Default to 45 mins
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff <= 0) diff = 45; // Safety fallback
    return diff;
  };

  const getProportionalHeight = (startTime: string, endTime?: string): number => {
    const minutes = getDurationMinutes(startTime, endTime);
    return Math.max(75, Math.min(220, minutes * 1.1));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;

    const newItems: RoutineItem[] = selectedDays.map((day, index) => ({
      id: `rout-${Date.now()}-${index}`,
      dayOfWeek: day,
      time,
      endTime: endTime || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      done: false,
      history: {},
    }));

    setRoutine(prev => [...prev, ...newItems].sort((a, b) => a.time.localeCompare(b.time)));
    setTitle('');
    setDescription('');
    setEndTime('');
    setIsAdding(false);
    
    const daysText = selectedDays
      .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.split('-')[0])
      .filter(Boolean)
      .join(', ');
    addToast?.(`Tarefa "${title.trim()}" adicionada para: ${daysText}!`, 'success');
  };

  const handleToggle = (id: string) => {
    setRoutine(prev =>
      prev.map(item => {
        if (item.id === id) {
          const dateStr = selectedDateStr;
          const currentDone = isItemDoneForDate(item, dateStr);
          const nextDone = !currentDone;
          const newHistory = { ...(item.history || {}), [dateStr]: nextDone };
          addToast?.(
            nextDone ? `Tarefa "${item.title}" concluída para ${formatDayMonth(dateStr)}! ✓` : `Tarefa "${item.title}" desmarcada`,
            nextDone ? 'success' : 'info'
          );
          return { ...item, done: nextDone, history: newHistory };
        }
        return item;
      })
    );
  };

  const handleDelete = (id: string) => {
    const item = routine.find(r => r.id === id);
    if (window.confirm('Tem certeza que deseja excluir esta rotina?')) {
      setRoutine(prev => prev.filter(item => item.id !== id));
      if (item) {
        addToast?.(`Tarefa "${item.title}" removida.`, 'info');
      }
    }
  };

  const filteredItems = routine.filter(item => item.dayOfWeek === selectedDay);

  return (
    <div id="routine-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Rotina Semanal Recorrente
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Sua rotina reinicia a cada nova semana automaticamente para acompanhamento contínuo
          </p>
        </div>
        
        <button
          onClick={() => {
            setSelectedDays([selectedDay]);
            setIsAdding(true);
          }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-xs hover:shadow-md cursor-pointer"
        >
          <Plus size={16} />
          Adicionar Rotina
        </button>
      </div>

      {/* Week Navigator Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Semana Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-2.5 py-1 font-bold rounded-lg transition cursor-pointer text-xs ${
                weekOffset === 0 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Próxima Semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            Semana: {weekStartDateLabel} — {weekEndDateLabel}
          </span>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Dia ativo: <strong className="text-slate-900">{DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label} ({formatDayMonth(selectedDateStr)})</strong>
        </div>
      </div>

      {/* Days Selector Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 border-b border-slate-200 scrollbar-none">
        {DAYS_OF_WEEK.map(day => {
          const isSelected = selectedDay === day.value;
          const dayDateStr = getDateForDay(day.value, weekOffset);
          const dayItems = routine.filter(item => item.dayOfWeek === day.value);
          const count = dayItems.length;
          const pendingCount = dayItems.filter(item => !isItemDoneForDate(item, dayDateStr)).length;

          return (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day.value)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 relative cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="hidden sm:inline">{day.label}</span>
                <span className="inline sm:hidden">{day.shortLabel}</span>
                <span className="text-[10px] font-mono text-slate-400">({formatDayMonth(dayDateStr)})</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    pendingCount === 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {isSelected && (
                <motion.div
                  layoutId="activeDayIndicator"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Seletor de Modo de Visualização */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-100/55 p-1 rounded-xl border border-slate-200/40 max-w-xs">
        <button
          type="button"
          onClick={() => setViewMode('timeline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
            viewMode === 'timeline'
              ? 'bg-white text-indigo-950 shadow-xs border border-indigo-100/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={12} />
          Blocos por Turno
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
            viewMode === 'list'
              ? 'bg-white text-indigo-950 shadow-xs border border-indigo-100/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={12} />
          Lista Simples
        </button>
      </div>

      {/* Routine list or modal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center"
              >
                <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                  <Calendar size={20} />
                </div>
                <h3 className="text-sm font-medium text-slate-900">Nenhuma rotina para este dia</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Crie blocos de tarefas diários para automatizar seu foco.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDays([selectedDay]);
                    setIsAdding(true);
                  }}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                >
                  Adicionar primeira rotina
                </button>
              </motion.div>
            ) : viewMode === 'list' ? (
              <motion.div key="list-view" className="space-y-4">
                {filteredItems.map(item => {
                  const done = isItemDoneForDate(item, selectedDateStr);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group relative flex items-start gap-4 p-4 rounded-2xl bg-white border transition-all duration-200 ${
                        done
                          ? 'border-slate-200/60 bg-slate-50/40 opacity-75'
                          : 'border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                      >
                        {done ? (
                          <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                            <Clock size={12} />
                            {item.time}{item.endTime ? ` - ${item.endTime}` : ''}
                          </span>
                          <h4 className={`text-sm font-semibold truncate ${
                            done ? 'line-through text-slate-400 font-medium' : 'text-slate-900'
                          }`}>
                            {item.title}
                          </h4>
                        </div>
                        {item.description && (
                          <p className={`text-xs mt-1.5 leading-relaxed ${
                            done ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="md:opacity-0 md:group-hover:opacity-100 opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition shrink-0 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              // Timeline columns view split into Morning, Afternoon, and Night
              <motion.div key="timeline-view" className="grid grid-cols-1 md:grid-cols-3 gap-6 align-stretch">
                {[
                  {
                    id: 'manha' as const,
                    label: 'Manhã',
                    range: '06:00 - 12:00',
                    icon: <Sun size={15} className="text-amber-500" />,
                    headerBg: 'bg-amber-50/55 border-amber-200/50',
                    badgeText: 'text-amber-800',
                    axisBorder: 'border-amber-200/50',
                    bulletBg: 'bg-amber-500',
                  },
                  {
                    id: 'tarde' as const,
                    label: 'Tarde',
                    range: '12:00 - 18:00',
                    icon: <Sunset size={15} className="text-orange-500" />,
                    headerBg: 'bg-orange-50/55 border-orange-200/50',
                    badgeText: 'text-orange-800',
                    axisBorder: 'border-orange-200/50',
                    bulletBg: 'bg-orange-500',
                  },
                  {
                    id: 'noite' as const,
                    label: 'Noite',
                    range: '18:00 - 06:00',
                    icon: <Moon size={15} className="text-indigo-500" />,
                    headerBg: 'bg-indigo-50/55 border-indigo-200/50',
                    badgeText: 'text-indigo-800',
                    axisBorder: 'border-indigo-200/50',
                    bulletBg: 'bg-indigo-600',
                  },
                ].map(period => {
                  const items = filteredItems.filter(item => getPeriod(item.time) === period.id);

                  return (
                    <div key={period.id} className="flex flex-col gap-4 bg-slate-50/30 border border-slate-200/50 rounded-2xl p-4">
                      {/* Section Header */}
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${period.headerBg}`}>
                        <div className="flex items-center gap-1.5">
                          {period.icon}
                          <span className={`text-xs font-bold ${period.badgeText}`}>{period.label}</span>
                        </div>
                        <span className="text-[9px] font-mono font-medium text-slate-400">{period.range}</span>
                      </div>

                      {/* Timeline column with relative line on the left */}
                      <div className="relative pl-5 flex-1 min-h-[120px]">
                        {/* Dashed background timeline vertical bar */}
                        <div className={`absolute left-[7px] top-2 bottom-2 border-l-2 border-dashed ${period.axisBorder}`} />

                        {items.length === 0 ? (
                          <div className="flex items-center justify-center h-full min-h-[100px] text-center">
                            <p className="text-[11px] text-slate-400 font-light">Sem rotina planejada</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {items.map(item => {
                              const cardHeight = getProportionalHeight(item.time, item.endTime);
                              const done = isItemDoneForDate(item, selectedDateStr);
                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  style={{ minHeight: `${cardHeight}px` }}
                                  className={`group relative flex flex-col justify-between p-3 rounded-xl border bg-white transition-all duration-200 ${
                                    done
                                      ? 'border-slate-100 bg-slate-50/40 opacity-75'
                                      : 'border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs'
                                  }`}
                                >
                                  {/* Absolute timeline bullet dot over the line */}
                                  <div className={`absolute left-[-17px] top-[14px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-3xs ${period.bulletBg} ${done ? 'opacity-40' : ''}`} />

                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-start justify-between gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggle(item.id)}
                                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                                      >
                                        {done ? (
                                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                                        ) : (
                                          <Circle size={16} />
                                        )}
                                      </button>
                                      
                                      <h5 className={`text-xs font-bold leading-tight flex-1 ${
                                        done ? 'line-through text-slate-400 font-medium' : 'text-slate-800'
                                      }`}>
                                        {item.title}
                                      </h5>

                                      <button
                                        type="button"
                                        onClick={() => handleDelete(item.id)}
                                        className="md:opacity-0 md:group-hover:opacity-100 opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-slate-50 transition shrink-0 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>

                                    {item.description && (
                                      <p className={`text-[10px] leading-relaxed line-clamp-3 pl-5 ${
                                        done ? 'text-slate-400' : 'text-slate-500'
                                      }`}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Bottom timeline block label */}
                                  <div className="mt-2 pt-1 border-t border-slate-50 flex items-center justify-between text-[9px] font-mono text-slate-400">
                                    <span className="flex items-center gap-0.5">
                                      <Clock size={10} className="text-slate-400" />
                                      {item.time}{item.endTime ? ` - ${item.endTime}` : ''}
                                    </span>
                                    {item.endTime && (
                                      <span className="font-semibold text-slate-500">
                                        {getDurationMinutes(item.time, item.endTime)}m
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar help / Overview */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <AlertCircle size={14} className="text-indigo-600" />
              Dicas do Segundo Cérebro
            </h3>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              As rotinas são recorrentes para cada dia da semana e reiniciam semanalmente. Marcar uma rotina hoje conclui a atividade apenas para esta data específica.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-medium">
              <span>Progresso para {formatDayMonth(selectedDateStr)}</span>
              <span className="font-bold text-indigo-600">
                {filteredItems.length > 0
                  ? `${Math.round((filteredItems.filter(i => isItemDoneForDate(i, selectedDateStr)).length / filteredItems.length) * 100)}%`
                  : 'Nenhum item'}
              </span>
            </div>
            {filteredItems.length > 0 && (
              <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${(filteredItems.filter(i => isItemDoneForDate(i, selectedDateStr)).length / filteredItems.length) * 100}%`
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Routine Modal Backdrop & Dialog */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-neutral-100 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-neutral-900">Nova Rotina Recorrente</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-neutral-400 hover:text-neutral-600 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título da Atividade</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinar, Leitura matinal, Checar e-mails"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 p-3 bg-indigo-50/30 border border-indigo-100/40 rounded-2xl">
                <label className="block text-xs font-semibold text-indigo-950 uppercase">Dias de Repetição</label>
                <div className="flex flex-wrap gap-1.5 justify-between">
                  {WEEKDAYS_CONFIG.map(d => {
                    const isSelected = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(d.value)}
                        className={`flex-1 min-w-[36px] py-1.5 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                        title={d.fullName}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Início</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fim (Opcional)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Instruções / Descrição (Opcional)</label>
                <textarea
                  placeholder="Instruções curtas ou material de apoio..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
