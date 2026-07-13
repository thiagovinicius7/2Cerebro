import React, { useState } from 'react';
import { Habit } from '../types';
import { Plus, Trash2, Calendar, Sparkles, Check, Play, BookOpen, Clock, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WEEKDAYS_CONFIG = [
  { value: 1, label: 'Seg', fullName: 'Segunda-feira' },
  { value: 2, label: 'Ter', fullName: 'Terça-feira' },
  { value: 3, label: 'Qua', fullName: 'Quarta-feira' },
  { value: 4, label: 'Qui', fullName: 'Quinta-feira' },
  { value: 5, label: 'Sex', fullName: 'Sexta-feira' },
  { value: 6, label: 'Sáb', fullName: 'Sábado' },
  { value: 0, label: 'Dom', fullName: 'Domingo' },
];

interface HabitsSectionProps {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function HabitsSection({ habits, setHabits, addToast }: HabitsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'novena'>('daily');
  const [novenaRepeatMonthly, setNovenaRepeatMonthly] = useState(true);
  const [novenaStartDay, setNovenaStartDay] = useState(9);
  const [novenaEndDay, setNovenaEndDay] = useState(17);
  const [novenaStart, setNovenaStart] = useState(new Date().toISOString().split('T')[0]);
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [time, setTime] = useState('');

  const handleOpenAdd = () => {
    setEditingHabitId(null);
    setTitle('');
    setCategory('');
    setFrequency('daily');
    setWeekDays([]);
    setTime('');
    setIsAdding(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setTitle(habit.title);
    setCategory(habit.category || '');
    setFrequency(habit.frequency);
    setWeekDays(habit.weekDays || []);
    setTime(habit.time || '');
    setNovenaRepeatMonthly(habit.novenaRepeatMonthly ?? true);
    setNovenaStartDay(habit.novenaStartDay || 9);
    setNovenaEndDay(habit.novenaEndDay || 17);
    setNovenaStart(habit.novenaStart || new Date().toISOString().split('T')[0]);
    setIsAdding(true);
  };

  const toggleWeekDay = (dayValue: number) => {
    setWeekDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0];
            return order.indexOf(a) - order.indexOf(b);
          })
    );
  };

  // Generate the last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const last7Days = getLast7Days();

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingHabitId) {
      setHabits(prev =>
        prev.map(h => {
          if (h.id === editingHabitId) {
            return {
              ...h,
              title: title.trim(),
              frequency,
              novenaStart: frequency === 'novena' && !novenaRepeatMonthly ? novenaStart : undefined,
              novenaStartDay: frequency === 'novena' && novenaRepeatMonthly ? novenaStartDay : undefined,
              novenaEndDay: frequency === 'novena' && novenaRepeatMonthly ? novenaEndDay : undefined,
              novenaRepeatMonthly: frequency === 'novena' ? novenaRepeatMonthly : undefined,
              weekDays: frequency === 'weekly' && weekDays.length > 0 ? weekDays : undefined,
              time: frequency !== 'novena' && time.trim() ? time.trim() : undefined,
              category: category.trim() || undefined,
            };
          }
          return h;
        })
      );
      addToast?.(`Hábito atualizado com sucesso!`, 'success');
    } else {
      const newHabit: Habit = {
        id: `hab-${Date.now()}`,
        title: title.trim(),
        frequency,
        createdAt: new Date().toISOString(),
        novenaStart: frequency === 'novena' && !novenaRepeatMonthly ? novenaStart : undefined,
        novenaStartDay: frequency === 'novena' && novenaRepeatMonthly ? novenaStartDay : undefined,
        novenaEndDay: frequency === 'novena' && novenaRepeatMonthly ? novenaEndDay : undefined,
        novenaRepeatMonthly: frequency === 'novena' ? novenaRepeatMonthly : undefined,
        weekDays: frequency === 'weekly' && weekDays.length > 0 ? weekDays : undefined,
        time: frequency !== 'novena' && time.trim() ? time.trim() : undefined,
        history: {},
        category: category.trim() || undefined,
      };

      setHabits(prev => [...prev, newHabit]);
      addToast?.(`Hábito "${newHabit.title}" criado com sucesso!`, 'success');
    }

    const catName = category.trim() || 'Sem Categoria';
    setExpandedCategories(prev => ({ ...prev, [catName]: true }));
    setTitle('');
    setCategory('');
    setFrequency('daily');
    setWeekDays([]);
    setTime('');
    setIsAdding(false);
    setEditingHabitId(null);
  };

  const handleToggleDay = (habitId: string, dateStr: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          const currentStatus = h.history[dateStr] || false;
          const nextStatus = !currentStatus;
          addToast?.(
            nextStatus ? `Hábito "${h.title}" realizado! ✓` : `Hábito "${h.title}" desfeito`,
            nextStatus ? 'success' : 'info'
          );
          return {
            ...h,
            history: {
              ...h.history,
              [dateStr]: nextStatus,
            },
          };
        }
        return h;
      })
    );
  };

  const handleDeleteHabit = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (window.confirm('Tem certeza que deseja remover este hábito?')) {
      setHabits(prev => prev.filter(h => h.id !== id));
      if (habit) {
        addToast?.(`Hábito "${habit.title}" removido.`, 'info');
      }
    }
  };

  // Helper: Format date as day/month
  const formatDateLabel = (d: Date) => {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return {
      dayName: weekdays[d.getDay()],
      dateStr: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
    };
  };

  // Helper to render Novena Tracker
  const renderNovenaTracker = (habit: Habit) => {
    const totalDays = 9;
    const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
    
    const startDay = habit.novenaStartDay || 9;
    const endDay = habit.novenaEndDay || (startDay + 8);
    const repeatMonthly = habit.novenaRepeatMonthly ?? true;

    const getNovenaDayDateStr = (day: number) => {
      if (repeatMonthly) {
        const now = new Date();
        const dayNum = startDay + (day - 1);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dayNum).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      } else {
        const startDate = new Date((habit.novenaStart || habit.createdAt.split('T')[0]) + 'T00:00:00');
        startDate.setDate(startDate.getDate() + (day - 1));
        return startDate.toISOString().split('T')[0];
      }
    };

    const isDayCompleted = (day: number) => {
      const dateKey = getNovenaDayDateStr(day);
      return habit.history[dateKey] || false;
    };

    const toggleNovenaDay = (day: number) => {
      const dateKey = getNovenaDayDateStr(day);
      setHabits(prev =>
        prev.map(h => {
          if (h.id === habit.id) {
            const completed = h.history[dateKey] || false;
            return {
              ...h,
              history: {
                ...h.history,
                [dateKey]: !completed,
              },
            };
          }
          return h;
        })
      );
    };

    const completedCount = daysArray.filter(day => isDayCompleted(day)).length;
    const isCompleted = completedCount === 9;

    return (
      <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 mt-3 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-[10px] font-mono text-indigo-800 uppercase font-bold flex items-center gap-1">
            <BookOpen size={11} />
            {repeatMonthly ? `Novena Mensal (Dias ${startDay} a ${endDay})` : 'Novena Temporária (9 Dias)'}
          </span>
          <span className="text-xs font-semibold text-indigo-950 font-mono self-start sm:self-auto">
            Dia {completedCount} de 9 {isCompleted && '🎉 Concluída!'}
          </span>
        </div>

        {/* Novena progress row */}
        <div className="grid grid-cols-9 gap-1.5">
          {daysArray.map(day => {
            const done = isDayCompleted(day);
            const dayNumToShow = repeatMonthly ? (startDay + (day - 1)) : day;
            return (
              <button
                key={day}
                onClick={() => toggleNovenaDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  done
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-800'
                }`}
                title={repeatMonthly ? `Marcar Dia ${dayNumToShow} do mês` : `Marcar Dia ${day}`}
              >
                <span>{repeatMonthly ? `${dayNumToShow}` : `D${day}`}</span>
                {done && <Check size={8} className="mt-0.5 stroke-[4]" />}
              </button>
            );
          })}
        </div>

        {/* ProgressBar */}
        <div className="w-full h-1 bg-indigo-200/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(completedCount / 9) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div id="habits-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Rastreador de Hábitos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Mapeie rituais diários, leituras mensais e novenas para criar consistência
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Adicionar Hábito
        </button>
      </div>

      {/* Habits layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {(() => {
              const groupedHabits = habits.reduce<Record<string, Habit[]>>((acc, habit) => {
                const cat = habit.category?.trim() || 'Sem Categoria';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(habit);
                return acc;
              }, {});

              const categories = Object.keys(groupedHabits).sort((a, b) => {
                if (a === 'Sem Categoria') return 1;
                if (b === 'Sem Categoria') return -1;
                return a.localeCompare(b);
              });

              if (habits.length === 0) {
                return (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                      <Calendar size={18} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">Sem hábitos rastreados</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Crie rituais que moldam sua identidade e registre-os diariamente.
                    </p>
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
                  <div className="flex justify-end gap-3 text-xs mb-2">
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
                    const catItems = groupedHabits[catName];
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
                            <span className="text-xs text-slate-400 font-mono">({catItems.length} {catItems.length === 1 ? 'hábito' : 'hábitos'})</span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={16} className="text-slate-400" />
                          )}
                        </button>

                        {/* Category Habits List */}
                        {isExpanded && (
                          <div className="pl-1 pr-1 space-y-3 animate-fade-in">
                            {catItems.map(habit => {
                              const isDaily = habit.frequency === 'daily';
                              const isWeekly = habit.frequency === 'weekly';
                              const isMonthly = habit.frequency === 'monthly';
                              const isNovena = habit.frequency === 'novena';

                              return (
                                <motion.div
                                  key={habit.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="bg-white border border-slate-200 rounded-xl p-4.5 hover:border-indigo-200 transition duration-200 relative group shadow-xs"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase ${
                                            isNovena
                                              ? 'bg-indigo-100 text-indigo-900'
                                              : isDaily
                                              ? 'bg-blue-50 text-blue-800'
                                              : isWeekly
                                              ? 'bg-purple-50 text-purple-800'
                                              : 'bg-emerald-50 text-emerald-800'
                                          }`}>
                                            {isNovena ? 'Novena (9d)' : habit.frequency === 'daily' ? 'Diário' : habit.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                                          </span>
                                          <h4 className="text-sm font-semibold text-slate-900">{habit.title}</h4>
                                        </div>

                                        {(!isNovena && (habit.weekDays || habit.time)) && (
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {habit.weekDays && habit.weekDays.length > 0 && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                                                <Calendar size={10} />
                                                {habit.weekDays.map(val => WEEKDAYS_CONFIG.find(w => w.value === val)?.label).join(', ')}
                                              </span>
                                            )}
                                            {habit.time && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded font-medium border border-slate-100">
                                                <Clock size={10} />
                                                {habit.time}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 shrink-0">
                                      <button
                                        onClick={() => handleOpenEdit(habit)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                                        title="Editar Hábito"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteHabit(habit.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
                                        title="Remover Hábito"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Standard Habits Horizontal Bubble Row */}
                                  {!isNovena && (
                                    <div className="mt-4 flex items-center justify-between overflow-x-auto pb-1 gap-2 scrollbar-none">
                                      {last7Days.map(day => {
                                        const { dayName, dateStr, dayNum } = formatDateLabel(day);
                                        const checked = habit.history[dateStr] || false;
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                                        // Check if this day is a scheduled weekday for this habit
                                        const hasWeekDayRestriction = habit.frequency === 'weekly' && habit.weekDays && habit.weekDays.length > 0;
                                        const isScheduledDay = !hasWeekDayRestriction || (habit.weekDays && habit.weekDays.includes(day.getDay()));

                                        return (
                                          <button
                                            key={dateStr}
                                            onClick={() => handleToggleDay(habit.id, dateStr)}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition cursor-pointer min-w-[45px] ${
                                              checked
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                                                : isToday
                                                ? 'bg-indigo-50/60 border-indigo-200 text-slate-800 font-semibold'
                                                : isScheduledDay
                                                ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                                : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-200'
                                            }`}
                                            title={
                                              !isScheduledDay 
                                                ? `${dayName} (${dayNum}) - Não planejado para este dia` 
                                                : `${dayName} (${dayNum})${habit.time ? ` às ${habit.time}` : ''}`
                                            }
                                          >
                                            <span className="text-[9px] font-bold font-mono tracking-wide uppercase">
                                              {dayName}
                                            </span>
                                            <span className="text-xs font-bold font-mono">
                                              {dayNum}
                                            </span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                              checked 
                                                ? 'bg-white' 
                                                : isToday 
                                                ? 'bg-indigo-400' 
                                                : isScheduledDay 
                                                ? 'bg-indigo-200' 
                                                : 'bg-slate-200/50'
                                            }`} />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Custom Novena Devotion Track */}
                                  {isNovena && renderNovenaTracker(habit)}
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

        {/* Habits insight bar */}
        <div className="space-y-4">
          <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-2">
              <Sparkles size={14} />
              Identidade Atomizada
            </h3>
            <p className="text-xs text-indigo-950 mt-2.5 leading-relaxed font-light">
              "Hábitos não são tarefas, são votos de quem você quer se tornar." Comece pequeno (Ex: ler 2 páginas, beber 1 copo) e seja consistente.
            </p>
          </div>
        </div>
      </div>

      {/* Add Habit Dialog */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-slate-900">
                {editingHabitId ? 'Editar Hábito ou Devocional' : 'Novo Hábito ou Devocional'}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título do Hábito</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Beber 3L de Água, Rosário Diário, Ler livro"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoria (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Saúde, Espiritualidade, Trabalho, Estudos"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Frequência / Tipo</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['daily', 'weekly', 'monthly', 'novena'] as const).map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer capitalize ${
                        frequency === freq
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {freq === 'daily' && 'Diário'}
                      {freq === 'weekly' && 'Semanal'}
                      {freq === 'monthly' && 'Mensal'}
                      {freq === 'novena' && 'Novena (9 Dias)'}
                    </button>
                  ))}
                </div>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2 p-4 bg-purple-50/40 border border-purple-100 rounded-2xl animate-fade-in">
                  <label className="block text-xs font-semibold text-purple-950 uppercase">Dias de Repetição</label>
                  <div className="flex flex-wrap gap-1 md:gap-1.5 justify-between">
                    {WEEKDAYS_CONFIG.map(d => {
                      const isSelected = weekDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleWeekDay(d.value)}
                          className={`flex-1 min-w-[38px] py-1.5 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white shadow-3xs'
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
              )}

              {frequency !== 'novena' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Horário (Opcional)</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                  />
                </div>
              )}

              {frequency === 'novena' && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Configuração da Novena</p>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Repetir todo mês?</label>
                    <input
                      type="checkbox"
                      checked={novenaRepeatMonthly}
                      onChange={e => setNovenaRepeatMonthly(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                    />
                  </div>

                  {novenaRepeatMonthly ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Dia Início do Mês</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          required
                          value={novenaStartDay}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setNovenaStartDay(val);
                            setNovenaEndDay(Math.min(31, val + 8));
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Dia Fim do Mês</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          required
                          value={novenaEndDay}
                          onChange={e => setNovenaEndDay(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Data de Início</label>
                      <input
                        type="date"
                        required
                        value={novenaStart}
                        onChange={e => setNovenaStart(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

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
                  {editingHabitId ? 'Salvar Alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
