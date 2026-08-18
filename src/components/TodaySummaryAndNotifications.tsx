import React from 'react';
import { 
  GoogleCalendarEvent, 
  RoutineItem, 
  Habit, 
  Bill, 
  CalendarTickState 
} from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Flame, 
  CreditCard, 
  Bell, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  Sparkles,
  CalendarCheck,
  AlertCircle
} from 'lucide-react';

interface TodaySummaryAndNotificationsProps {
  dashEvents: GoogleCalendarEvent[];
  customEvents: GoogleCalendarEvent[];
  dashLoading: boolean;
  routine: RoutineItem[];
  setRoutine: React.Dispatch<React.SetStateAction<RoutineItem[]>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  bills: Bill[];
  calendarTicks: CalendarTickState[];
  setCalendarTicks: React.Dispatch<React.SetStateAction<CalendarTickState[]>>;
  accessToken: string | null;
  remindersEnabled: boolean;
  setRemindersEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  notificationPermission: NotificationPermission | 'default';
  requestNotificationPermission: () => void;
  reminderMorningEnabled: boolean;
  setReminderMorningEnabled: (val: boolean) => void;
  reminderMorningTime: string;
  setReminderMorningTime: (val: string) => void;
  reminderEveningEnabled: boolean;
  setReminderEveningEnabled: (val: boolean) => void;
  reminderEveningTime: string;
  setReminderEveningTime: (val: string) => void;
  onNavigateTab: (tab: 'unified' | 'routine' | 'calendar' | 'habits' | 'bills' | 'notes_lists') => void;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function TodaySummaryAndNotifications({
  dashEvents,
  customEvents,
  dashLoading,
  routine,
  setRoutine,
  habits,
  setHabits,
  bills,
  calendarTicks,
  setCalendarTicks,
  accessToken,
  remindersEnabled,
  setRemindersEnabled,
  notificationPermission,
  requestNotificationPermission,
  reminderMorningEnabled,
  setReminderMorningEnabled,
  reminderMorningTime,
  setReminderMorningTime,
  reminderEveningEnabled,
  setReminderEveningEnabled,
  reminderEveningTime,
  setReminderEveningTime,
  onNavigateTab,
  addToast,
}: TodaySummaryAndNotificationsProps) {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const formattedTodayDate = now.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // 1. Events for today (Google + Local)
  const todayEvents = [...dashEvents, ...customEvents].filter(e => {
    if (e.start.date) return e.start.date === todayStr;
    if (e.start.dateTime) {
      const d = new Date(e.start.dateTime);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === todayStr;
    }
    return false;
  });

  // 2. Routines for today
  const todayRoutine = routine
    .filter(r => r.dayOfWeek === currentDayOfWeek)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // 3. Habits for today
  const isHabitDoneToday = (h: Habit) => !!h.history[todayStr];
  const activeHabitsToday = habits.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly' && h.weekDays) return h.weekDays.includes(currentDayOfWeek);
    if (h.frequency === 'novena' || h.frequency === 'challenge') return true;
    return true;
  });

  // 4. Bills overdue or due today
  const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueBills = unpaidBills.filter(b => b.dueDate < todayStr);
  const dueTodayBills = unpaidBills.filter(b => b.dueDate === todayStr);
  const upcomingBills = unpaidBills.filter(b => b.dueDate > todayStr).slice(0, 2);

  // Stats calculation
  const totalEventsDone = todayEvents.filter(e => 
    calendarTicks.some(t => t.eventId === e.id && t.dateStr === todayStr && t.done)
  ).length;

  const totalRoutinesDone = todayRoutine.filter(r => 
    r.history && typeof r.history[todayStr] === 'boolean' ? r.history[todayStr] : false
  ).length;

  const totalHabitsDone = activeHabitsToday.filter(isHabitDoneToday).length;

  const totalItemsToday = todayEvents.length + todayRoutine.length + activeHabitsToday.length;
  const totalDoneToday = totalEventsDone + totalRoutinesDone + totalHabitsDone;
  const progressPercent = totalItemsToday > 0 ? Math.round((totalDoneToday / totalItemsToday) * 100) : 100;

  // Toggle routine done
  const handleToggleRoutine = (r: RoutineItem) => {
    const wasDone = r.history && typeof r.history[todayStr] === 'boolean' ? r.history[todayStr] : false;
    const done = !wasDone;
    setRoutine(prev => prev.map(item => {
      if (item.id === r.id) {
        return {
          ...item,
          done,
          history: { ...(item.history || {}), [todayStr]: done }
        };
      }
      return item;
    }));
    addToast?.(done ? `Rotina "${r.title}" concluída! ✓` : `Rotina "${r.title}" desmarcada`, done ? 'success' : 'info');
  };

  // Toggle event done
  const handleToggleEvent = (e: GoogleCalendarEvent) => {
    setCalendarTicks(prev => {
      const idx = prev.findIndex(t => t.eventId === e.id && t.dateStr === todayStr);
      if (idx > -1) {
        const copy = [...prev];
        const done = !copy[idx].done;
        addToast?.(done ? `Evento "${e.summary}" concluído! ✓` : `Evento "${e.summary}" desmarcado`, done ? 'success' : 'info');
        copy[idx] = { ...copy[idx], done };
        return copy;
      } else {
        addToast?.(`Evento "${e.summary}" concluído! ✓`, 'success');
        return [...prev, { eventId: e.id, dateStr: todayStr, done: true }];
      }
    });
  };

  // Toggle habit done
  const handleToggleHabit = (habitId: string, habitTitle: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const wasDone = !!h.history[todayStr];
        addToast?.(!wasDone ? `Hábito "${habitTitle}" cumprido hoje! 🔥✓` : `Hábito "${habitTitle}" desmarcado`, !wasDone ? 'success' : 'info');
        return {
          ...h,
          history: { ...h.history, [todayStr]: !wasDone }
        };
      }
      return h;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Day Banner & Notifications Summary */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                Hoje • {dayNames[currentDayOfWeek]}
              </span>
              {(overdueBills.length > 0 || dueTodayBills.length > 0) && (
                <span className="bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <AlertCircle size={12} />
                  {overdueBills.length > 0 ? `${overdueBills.length} conta(s) atrasada(s)` : 'Conta vence hoje!'}
                </span>
              )}
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight capitalize">
              {formattedTodayDate}
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
              Você tem <strong>{todayEvents.length}</strong> evento(s), <strong>{todayRoutine.length}</strong> item(ns) de rotina e <strong>{activeHabitsToday.length}</strong> hábito(s) programados para hoje.
            </p>
          </div>

          {/* Day Progress Ring / Counter */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 shrink-0 min-w-[220px]">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-indigo-100">
                <span>Progresso do Dia</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <p className="text-[10px] text-indigo-200/80">
                {totalDoneToday} de {totalItemsToday} concluídos
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold text-xs">
              {progressPercent === 100 && totalItemsToday > 0 ? '✓' : `${progressPercent}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Daily Notifications & Modules */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Module 1: Eventos de Hoje da Agenda (Google + Local) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                Eventos de Hoje
              </h3>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {todayEvents.length} {todayEvents.length === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {dashLoading && todayEvents.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-mono animate-pulse">
                  Carregando agenda...
                </div>
              ) : todayEvents.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 italic bg-slate-50 rounded-2xl p-4">
                  Nenhum evento agendado para hoje.
                  <button
                    onClick={() => onNavigateTab('calendar')}
                    className="block mx-auto mt-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl transition text-[11px] cursor-pointer"
                  >
                    + Adicionar Evento
                  </button>
                </div>
              ) : (
                todayEvents.map(event => {
                  const isChecked = calendarTicks.some(t => t.eventId === event.id && t.dateStr === todayStr && t.done);
                  let timeLabel = 'Dia inteiro';
                  if (event.start.dateTime) {
                    timeLabel = new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  }

                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                        isChecked 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-100 hover:bg-slate-50/70 shadow-2xs'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleEvent(event)}
                        className="text-slate-400 hover:text-indigo-600 transition cursor-pointer shrink-0"
                      >
                        {isChecked ? (
                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {event.summary}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-xs">
                            {timeLabel}
                          </span>
                          {event.calendarName && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-xs font-medium truncate max-w-[120px]">
                              {event.calendarName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition self-start pt-2"
          >
            Abrir Agenda Completa <ChevronRight size={13} />
          </button>
        </div>

        {/* Module 2: Rotina de Hoje */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                Rotina de Hoje ({dayNames[currentDayOfWeek]})
              </h3>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {todayRoutine.length} {todayRoutine.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {todayRoutine.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 italic bg-slate-50 rounded-2xl p-4">
                  Nenhuma rotina cadastrada para {dayNames[currentDayOfWeek].toLowerCase()}.
                  <button
                    onClick={() => onNavigateTab('routine')}
                    className="block mx-auto mt-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl transition text-[11px] cursor-pointer"
                  >
                    + Configurar Rotina
                  </button>
                </div>
              ) : (
                todayRoutine.map(item => {
                  const isDone = item.history && typeof item.history[todayStr] === 'boolean' ? item.history[todayStr] : false;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                        isDone 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-100 hover:bg-slate-50/70 shadow-2xs'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleRoutine(item)}
                        className="text-slate-400 hover:text-indigo-600 transition cursor-pointer shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.title}
                        </p>
                        {item.time && (
                          <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-xs">
                            {item.time}{item.endTime ? ` - ${item.endTime}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('routine')}
            className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition self-start pt-2"
          >
            Gerenciar Rotina Semanal <ChevronRight size={13} />
          </button>
        </div>

        {/* Module 3: Hábitos & Devocionais de Hoje */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-emerald-950 text-sm sm:text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-600 shrink-0" />
                Hábitos & Desafios de Hoje
              </h3>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                {totalHabitsDone}/{activeHabitsToday.length} feitos
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {activeHabitsToday.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 italic bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/60">
                  Nenhum hábito diário cadastrado.
                  <button
                    onClick={() => onNavigateTab('habits')}
                    className="block mx-auto mt-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-xl transition text-[11px] cursor-pointer"
                  >
                    + Criar Hábito
                  </button>
                </div>
              ) : (
                activeHabitsToday.map(h => {
                  const done = isHabitDoneToday(h);

                  return (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition ${
                        done 
                          ? 'bg-emerald-50/60 border-emerald-200' 
                          : 'bg-white border-slate-100 hover:bg-slate-50/70 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${done ? 'text-emerald-900 font-bold' : 'text-slate-800'}`}>
                          {h.title}
                        </p>
                        <span className="text-[9px] uppercase font-bold text-emerald-700/80">
                          {h.frequency === 'novena' ? 'Novena' : h.frequency === 'challenge' ? `Desafio ${h.durationDays || 40}d` : 'Hábito Diário'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleHabit(h.id, h.title)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition cursor-pointer shrink-0 ${
                          done 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs' 
                            : 'bg-slate-50 border-slate-200 hover:border-emerald-400 text-slate-300'
                        }`}
                      >
                        <Check size={12} className="stroke-[3]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('habits')}
            className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition self-start pt-2"
          >
            Acessar Hábitos & Desafios <ChevronRight size={13} />
          </button>
        </div>

        {/* Module 4: Alertas de Contas & Finanças */}
        <div className="col-span-12 md:col-span-6 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-rose-950 text-sm sm:text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-600 shrink-0" />
                Notificações de Contas & Vencimentos
              </h3>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                {unpaidBills.length} pendente(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overdueBills.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-700 font-extrabold text-[10px] uppercase">
                    <AlertTriangle size={12} />
                    Contas Atrasadas!
                  </div>
                  <p className="text-xs font-bold text-red-950 truncate">{overdueBills[0].title}</p>
                  <p className="text-xs font-mono text-red-700 font-bold">
                    R$ {overdueBills[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {dueTodayBills.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[10px] uppercase">
                    <AlertCircle size={12} />
                    Vencendo Hoje!
                  </div>
                  <p className="text-xs font-bold text-amber-950 truncate">{dueTodayBills[0].title}</p>
                  <p className="text-xs font-mono text-amber-800 font-bold">
                    R$ {dueTodayBills[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {overdueBills.length === 0 && dueTodayBills.length === 0 && upcomingBills.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                  <div className="text-slate-500 font-bold text-[10px] uppercase">
                    Próximo Vencimento
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">{upcomingBills[0].title}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Vence em {new Date(upcomingBills[0].dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} • R$ {upcomingBills[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {unpaidBills.length === 0 && (
                <div className="col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-emerald-800">🎉 Todas as contas estão em dia!</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Nenhuma fatura pendente no momento.</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('bills')}
            className="mt-3 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition self-start pt-2"
          >
            Abrir Gestor Financeiro <ChevronRight size={13} />
          </button>
        </div>

        {/* Module 5: Central de Lembretes & Notificações Automáticas */}
        <div className="col-span-12 md:col-span-6 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-indigo-950 text-sm sm:text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                Lembretes & Web Push
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                remindersEnabled && notificationPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {remindersEnabled && notificationPermission === 'granted' ? 'Ativos 🔔' : 'Inativos 🔕'}
              </span>
            </div>

            {notificationPermission !== 'granted' ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Autorize as notificações do navegador para receber alertas automáticos no início da manhã e no fim do dia.
                </p>
                <button
                  onClick={requestNotificationPermission}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Bell size={13} />
                  Ativar Notificações no Navegador
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Lembretes Diários Automáticos</span>
                  <button
                    onClick={() => {
                      setRemindersEnabled(prev => {
                        const next = !prev;
                        addToast?.(next ? 'Lembretes automáticos ativados! 🔔' : 'Lembretes desativados.', next ? 'success' : 'info');
                        return next;
                      });
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      remindersEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      remindersEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {remindersEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="m-check"
                          checked={reminderMorningEnabled}
                          onChange={e => setReminderMorningEnabled(e.target.checked)}
                          className="rounded text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="m-check" className="text-xs text-slate-700 font-medium cursor-pointer">
                          Planejar Manhã
                        </label>
                      </div>
                      <input
                        type="time"
                        value={reminderMorningTime}
                        onChange={e => setReminderMorningTime(e.target.value)}
                        className="text-xs border border-slate-200 rounded px-1.5 py-0.5 font-mono text-slate-700 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="e-check"
                          checked={reminderEveningEnabled}
                          onChange={e => setReminderEveningEnabled(e.target.checked)}
                          className="rounded text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="e-check" className="text-xs text-slate-700 font-medium cursor-pointer">
                          Revisar Noite
                        </label>
                      </div>
                      <input
                        type="time"
                        value={reminderEveningTime}
                        onChange={e => setReminderEveningTime(e.target.value)}
                        className="text-xs border border-slate-200 rounded px-1.5 py-0.5 font-mono text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Sincronização em Tempo Real</span>
            <button
              onClick={() => onNavigateTab('unified')}
              className="text-indigo-600 font-bold hover:underline"
            >
              Ir para Visão Unificada →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
