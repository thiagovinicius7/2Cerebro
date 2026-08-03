import React, { useState } from 'react';
import { GoogleCalendarEvent, RoutineItem, Bill, Habit, CalendarTickState } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CreditCard, 
  Flame, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Filter, 
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';

interface WeeklyOverviewProps {
  events: GoogleCalendarEvent[];
  dashLoading: boolean;
  routine: RoutineItem[];
  setRoutine: React.Dispatch<React.SetStateAction<RoutineItem[]>>;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  calendarTicks: CalendarTickState[];
  setCalendarTicks: React.Dispatch<React.SetStateAction<CalendarTickState[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  accessToken: string | null;
  onNavigateTab: (tab: 'routine' | 'calendar' | 'bills' | 'habits') => void;
}

const WEEKDAYS_NAMES = [
  { short: 'Dom', full: 'Domingo', index: 0 },
  { short: 'Seg', full: 'Segunda-feira', index: 1 },
  { short: 'Ter', full: 'Terça-feira', index: 2 },
  { short: 'Qua', full: 'Quarta-feira', index: 3 },
  { short: 'Qui', full: 'Quinta-feira', index: 4 },
  { short: 'Sex', full: 'Sexta-feira', index: 5 },
  { short: 'Sáb', full: 'Sábado', index: 6 },
];

export default function WeeklyOverview({
  events,
  dashLoading,
  routine,
  setRoutine,
  bills,
  setBills,
  habits,
  setHabits,
  calendarTicks,
  setCalendarTicks,
  addToast,
  accessToken,
  onNavigateTab,
}: WeeklyOverviewProps) {
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'events' | 'routine' | 'bills' | 'habits'>('all');
  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState<number>(new Date().getDay());
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Compute Sunday of the target week
  const getSundayOfWeek = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + offset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const sundayOfTargetWeek = getSundayOfWeek(weekOffset);

  // Generate array of 7 days (Sunday to Saturday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dayDate = new Date(sundayOfTargetWeek);
    dayDate.setDate(dayDate.getDate() + i);

    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    return {
      dateObj: dayDate,
      dateStr,
      dayOfWeek: i,
      name: WEEKDAYS_NAMES[i],
      isToday: dateStr === todayStr,
    };
  });

  const weekStartDateLabel = weekDays[0].dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const weekEndDateLabel = weekDays[6].dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  // Helper to format date cleanly
  const formatDayMonth = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  // 1. Toggle Event done state
  const handleToggleEvent = (eventId: string, dateStr: string, summary: string) => {
    setCalendarTicks(prev => {
      const idx = prev.findIndex(t => t.eventId === eventId && t.dateStr === dateStr);
      if (idx > -1) {
        const copy = [...prev];
        const done = !copy[idx].done;
        addToast?.(done ? `Evento "${summary}" concluído! ✓` : `Evento "${summary}" desmarcado`, done ? 'success' : 'info');
        copy[idx] = { ...copy[idx], done };
        return copy;
      } else {
        addToast?.(`Evento "${summary}" concluído! ✓`, 'success');
        return [...prev, { eventId, dateStr, done: true }];
      }
    });
  };

  // 2. Toggle Routine item done state
  const handleToggleRoutine = (routineId: string, title: string) => {
    setRoutine(prev => prev.map(r => {
      if (r.id === routineId) {
        const done = !r.done;
        addToast?.(done ? `Rotina "${title}" concluída! ✓` : `Rotina "${title}" desmarcada`, done ? 'success' : 'info');
        return { ...r, done };
      }
      return r;
    }));
  };

  // 3. Toggle Bill paid state
  const handleToggleBill = (billId: string, title: string) => {
    setBills(prev => prev.map(b => {
      if (b.id === billId) {
        const paid = !b.paid;
        addToast?.(paid ? `Conta "${title}" marcada como PAGA! 💳✓` : `Conta "${title}" marcada como pendente`, paid ? 'success' : 'info');
        return { ...b, paid };
      }
      return b;
    }));
  };

  // 4. Toggle Habit history for dateStr
  const handleToggleHabit = (habitId: string, dateStr: string, title: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const wasDone = !!h.history[dateStr];
        const newHistory = { ...h.history, [dateStr]: !wasDone };
        addToast?.(!wasDone ? `Hábito "${title}" concluído em ${formatDayMonth(dateStr)}! 🔥✓` : `Hábito "${title}" desmarcado`, !wasDone ? 'success' : 'info');
        return { ...h, history: newHistory };
      }
      return h;
    }));
  };

  // Function to gather items for a specific day
  const getDayItems = (dateStr: string, dayOfWeek: number) => {
    const items: Array<{
      id: string;
      type: 'event' | 'routine' | 'bill' | 'habit';
      title: string;
      subtitle?: string;
      time?: string;
      done: boolean;
      amount?: number;
      badgeColor: string;
      onToggle: () => void;
    }> = [];

    // A. Eventos do Google Agenda
    if (categoryFilter === 'all' || categoryFilter === 'events') {
      const dayEvts = events.filter(e => {
        if (e.start.date) return e.start.date === dateStr;
        if (e.start.dateTime) {
          const d = new Date(e.start.dateTime);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}` === dateStr;
        }
        return false;
      });

      dayEvts.forEach(evt => {
        const isChecked = calendarTicks.some(t => t.eventId === evt.id && t.dateStr === dateStr && t.done);
        let timeStr = 'Dia inteiro';
        if (evt.start.dateTime) {
          timeStr = new Date(evt.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        items.push({
          id: `evt-${evt.id}-${dateStr}`,
          type: 'event',
          title: evt.summary,
          subtitle: evt.calendarName || 'Agenda Google',
          time: timeStr,
          done: isChecked,
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          onToggle: () => handleToggleEvent(evt.id, dateStr, evt.summary),
        });
      });
    }

    // B. Rotina Semanal
    if (categoryFilter === 'all' || categoryFilter === 'routine') {
      const dayRoutine = routine.filter(r => r.dayOfWeek === dayOfWeek);
      dayRoutine.forEach(r => {
        items.push({
          id: `rout-${r.id}`,
          type: 'routine',
          title: r.title,
          subtitle: r.description,
          time: r.time + (r.endTime ? ` - ${r.endTime}` : ''),
          done: r.done,
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          onToggle: () => handleToggleRoutine(r.id, r.title),
        });
      });
    }

    // C. Contas a Pagar
    if (categoryFilter === 'all' || categoryFilter === 'bills') {
      const dayBills = bills.filter(b => b.dueDate === dateStr);
      dayBills.forEach(b => {
        items.push({
          id: `bill-${b.id}`,
          type: 'bill',
          title: b.title,
          subtitle: `Vencimento: ${formatDayMonth(b.dueDate)}`,
          time: `R$ ${b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          done: b.paid,
          amount: b.amount,
          badgeColor: b.paid ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          onToggle: () => handleToggleBill(b.id, b.title),
        });
      });
    }

    // D. Hábitos & Devocionais
    if (categoryFilter === 'all' || categoryFilter === 'habits') {
      const dayHabits = habits.filter(h => {
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly') {
          return !h.weekDays || h.weekDays.length === 0 || h.weekDays.includes(dayOfWeek);
        }
        if (h.frequency === 'novena') {
          const startDay = h.novenaStartDay || 9;
          const repeatMonthly = h.novenaRepeatMonthly ?? true;
          if (repeatMonthly) {
            const dayNum = parseInt(dateStr.split('-')[2], 10);
            return dayNum >= startDay && dayNum < startDay + 9;
          } else {
            const startDate = h.novenaStart || h.createdAt.split('T')[0];
            const endNovena = new Date(startDate + 'T00:00:00');
            endNovena.setDate(endNovena.getDate() + 8);
            const endDateStr = endNovena.toISOString().split('T')[0];
            return dateStr >= startDate && dateStr <= endDateStr;
          }
        }
        return true;
      });

      dayHabits.forEach(h => {
        const done = !!h.history[dateStr];
        items.push({
          id: `habit-${h.id}-${dateStr}`,
          type: 'habit',
          title: h.title,
          subtitle: h.frequency === 'novena' ? 'Novena' : 'Hábito',
          time: h.time || 'A qualquer hora',
          done,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          onToggle: () => handleToggleHabit(h.id, dateStr, h.title),
        });
      });
    }

    // Sort items: undone first, then by time or type
    return items.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.time || '').localeCompare(b.time || '');
    });
  };

  // Calculate week-wide statistics
  let totalWeekItems = 0;
  let totalWeekDone = 0;
  let totalWeekBillsUnpaid = 0;
  let weekBillsAmountUnpaid = 0;

  weekDays.forEach(day => {
    const items = getDayItems(day.dateStr, day.dayOfWeek);
    totalWeekItems += items.length;
    totalWeekDone += items.filter(i => i.done).length;
    items.forEach(i => {
      if (i.type === 'bill' && !i.done && i.amount) {
        totalWeekBillsUnpaid++;
        weekBillsAmountUnpaid += i.amount;
      }
    });
  });

  const weekProgressPct = totalWeekItems > 0 ? Math.round((totalWeekDone / totalWeekItems) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 space-y-6">
      
      {/* Header with Navigation & Progress Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 p-2 rounded-2xl shrink-0">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                Visão Semanal Integrada
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  Painel Central
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Combine e conclua Eventos, Rotinas, Contas e Hábitos direto desta tela
              </p>
            </div>
          </div>
        </div>

        {/* Week Navigator Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Semana Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 font-bold rounded-xl transition cursor-pointer text-xs ${
                weekOffset === 0 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Próxima Semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            {weekStartDateLabel} — {weekEndDateLabel}
          </span>
        </div>

      </div>

      {/* Progress & Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
        
        {/* Metric summary */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${weekProgressPct}%` }}
              />
            </div>
            <span>
              <strong className="text-slate-900">{totalWeekDone}/{totalWeekItems}</strong> concluídos ({weekProgressPct}%)
            </span>
          </div>

          {totalWeekBillsUnpaid > 0 && (
            <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
              <CreditCard size={13} />
              {totalWeekBillsUnpaid} conta(s) pendente(s) (R$ {weekBillsAmountUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
          {[
            { id: 'all', label: 'Todos', icon: Sparkles },
            { id: 'events', label: 'Agenda', icon: CalendarIcon },
            { id: 'routine', label: 'Rotina', icon: Clock },
            { id: 'bills', label: 'Contas', icon: CreditCard },
            { id: 'habits', label: 'Hábitos', icon: Flame },
          ].map(cat => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                <Icon size={13} className={isSelected ? 'text-indigo-300' : 'text-slate-400'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Mobile Day Picker (Visible on small screens) */}
      <div className="block lg:hidden">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione o Dia da Semana</p>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => {
            const dayItems = getDayItems(day.dateStr, day.dayOfWeek);
            const isSelected = mobileSelectedDayIndex === idx;

            return (
              <button
                key={day.dateStr}
                onClick={() => setMobileSelectedDayIndex(idx)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border text-center transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : day.isToday
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] font-extrabold uppercase opacity-80">{day.name.short}</span>
                <span className="text-sm font-bold mt-0.5">{day.dateObj.getDate()}</span>
                {dayItems.length > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-indigo-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Weekly Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3.5 items-start">
        {weekDays.map((day, idx) => {
          const dayItems = getDayItems(day.dateStr, day.dayOfWeek);
          const isMobileHidden = mobileSelectedDayIndex !== idx;

          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl border transition-all flex flex-col h-full min-h-[320px] ${
                isMobileHidden ? 'hidden lg:flex' : 'flex'
              } ${
                day.isToday
                  ? 'bg-indigo-50/40 border-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                  : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-2xl border-b flex justify-between items-center ${
                day.isToday ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-800 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-extrabold text-xs uppercase tracking-wider">{day.name.short}</span>
                  <span className={`text-xs font-semibold ${day.isToday ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {day.dateObj.getDate()}
                  </span>
                </div>
                
                {day.isToday && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white text-indigo-700 px-2 py-0.5 rounded-full shadow-2xs">
                    Hoje
                  </span>
                )}
              </div>

              {/* Items List inside Day */}
              <div className="p-2.5 space-y-2 flex-1 overflow-y-auto max-h-[420px]">
                {dayItems.length === 0 ? (
                  <div className="py-8 px-2 text-center text-slate-400 italic text-[11px]">
                    Nenhum item agendado
                  </div>
                ) : (
                  dayItems.map(item => {
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 group ${
                          item.done
                            ? 'bg-slate-100/80 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                        }`}
                      >
                        {/* Checkbox Trigger */}
                        <button
                          onClick={item.onToggle}
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                          title={item.done ? 'Marcar como não feito' : 'Marcar como feito'}
                        >
                          {item.done ? (
                            <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50 shrink-0" />
                          ) : (
                            <Circle size={16} className="shrink-0 group-hover:text-indigo-500" />
                          )}
                        </button>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase border ${item.badgeColor}`}>
                              {item.type === 'event' && 'Agenda'}
                              {item.type === 'routine' && 'Rotina'}
                              {item.type === 'bill' && 'Conta'}
                              {item.type === 'habit' && 'Hábito'}
                            </span>
                            {item.time && (
                              <span className="text-[9px] font-mono font-semibold text-slate-500 truncate">
                                {item.time}
                              </span>
                            )}
                          </div>

                          <p className={`text-xs font-semibold leading-snug mt-1 break-words ${
                            item.done ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}>
                            {item.title}
                          </p>

                          {item.subtitle && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Direct Shortcuts Bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2">
        <span className="font-semibold text-slate-600">Atalhos para gerenciamento completo:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-indigo-600 hover:underline font-bold text-xs"
          >
            📅 Google Agenda
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigateTab('routine')}
            className="text-indigo-600 hover:underline font-bold text-xs"
          >
            ⏰ Rotina Semanal
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigateTab('bills')}
            className="text-indigo-600 hover:underline font-bold text-xs"
          >
            💳 Contas a Pagar
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigateTab('habits')}
            className="text-indigo-600 hover:underline font-bold text-xs"
          >
            🔥 Hábitos
          </button>
        </div>
      </div>

    </div>
  );
}
