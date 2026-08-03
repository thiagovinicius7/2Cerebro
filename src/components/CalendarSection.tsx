import React, { useState, useEffect } from 'react';
import { GoogleCalendarEvent, CalendarTickState } from '../types';
import { googleSignIn, logout, getAccessToken } from '../firebase';
import { Calendar, CheckCircle2, Circle, LogOut, RefreshCw, Clock, MapPin, Sparkles, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface CalendarSectionProps {
  user: User | null;
  setUser: (user: User | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  calendarTicks: CalendarTickState[];
  setCalendarTicks: React.Dispatch<React.SetStateAction<CalendarTickState[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function CalendarSection({
  user,
  setUser,
  accessToken,
  setAccessToken,
  calendarTicks,
  setCalendarTicks,
  addToast,
}: CalendarSectionProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<'today' | 'week' | 'month'>('month');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!accessToken && user) {
      import('../firebase').then(fb => {
        fb.getAccessToken().then(tok => {
          if (tok) setAccessToken(tok);
        });
      });
    }
  }, [user, accessToken]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        addToast?.('Google Agenda sincronizada com sucesso! 📅', 'success');
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        setError('Acesse pelo link compartilhado do AI Studio ou abra em uma nova aba para autorizar o domínio do Google.');
      } else if (isIframe) {
        setError('O navegador bloqueou o pop-up dentro do visualizador. Por favor, clique em "Abrir em Nova Aba" abaixo.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('O pop-up foi bloqueado. Libere os pop-ups para este site.');
      } else {
        setError(`Falha ao conectar com o Google Agenda: ${err?.message || 'Tente novamente.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setEvents([]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCalendarEvents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let timeMin = new Date();
      let timeMax = new Date();

      if (rangeType === 'today') {
        // Start of today
        timeMin.setHours(0, 0, 0, 0);
        // End of today
        timeMax.setHours(23, 59, 59, 999);
      } else if (rangeType === 'week') {
        // Start of today
        timeMin.setHours(0, 0, 0, 0);
        // End of next 7 days
        timeMax.setDate(now.getDate() + 7);
        timeMax.setHours(23, 59, 59, 999);
      } else {
        // Start of the selected month
        timeMin = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0, 0);
        // End of the selected month
        timeMax = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      // Fetch user's calendars first
      const listRes = await fetch(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      let calendars = [{ id: 'primary', summary: 'Principal' }];
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.items && listData.items.length > 0) {
          const activeCalendars = listData.items.filter((c: any) => c.selected || c.primary);
          if (activeCalendars.length > 0) {
            calendars = activeCalendars.map((c: any) => ({
              id: c.id,
              summary: c.summaryOverride || c.summary,
            }));
          } else {
            calendars = listData.items.map((c: any) => ({
              id: c.id,
              summary: c.summaryOverride || c.summary,
            }));
          }
        }
      } else if (listRes.status === 401) {
        setError('Sua sessão da Google Agenda expira periodicamente. Clique em "Sincronizar com o Google" para renovar o acesso.');
        setLoading(false);
        return;
      }

      // Fetch events for each calendar in parallel
      const eventPromises = calendars.map(async (cal) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            return (data.items || []).map((evt: any) => ({
              ...evt,
              calendarName: cal.summary,
            }));
          }
        } catch (e) {
          console.error(`Erro ao buscar eventos para a agenda ${cal.summary}:`, e);
        }
        return [];
      });

      const results = await Promise.all(eventPromises);
      const allEvents = results.flat();

      // Sort combined events chronologically
      allEvents.sort((a, b) => {
        const startA = a.start.dateTime || a.start.date || '';
        const startB = b.start.dateTime || b.start.date || '';
        return startA.localeCompare(startB);
      });

      setEvents(allEvents);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Houve um erro ao sincronizar seus eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
    }
  }, [accessToken, rangeType, currentMonth]);

  const getEventLocalDate = (eventStart: string): string => {
    if (!eventStart) return '';
    if (eventStart.includes('T')) {
      const d = new Date(eventStart);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return eventStart;
  };

  const handleToggleEventTick = (eventId: string, eventStart: string, summary: string) => {
    const dateStr = getEventLocalDate(eventStart) || new Date().toISOString().split('T')[0];
    
    setCalendarTicks(prev => {
      const existingIdx = prev.findIndex(t => t.eventId === eventId && t.dateStr === dateStr);
      if (existingIdx > -1) {
        const copy = [...prev];
        const nextDone = !copy[existingIdx].done;
        addToast?.(
          nextDone ? `Compromisso "${summary}" concluído! ✓` : `Compromisso "${summary}" desmarcado`,
          nextDone ? 'success' : 'info'
        );
        copy[existingIdx] = { ...copy[existingIdx], done: nextDone };
        return copy;
      } else {
        addToast?.(`Compromisso "${summary}" concluído! ✓`, 'success');
        return [...prev, { eventId, dateStr, done: true }];
      }
    });
  };

  const isEventChecked = (eventId: string, eventStart: string): boolean => {
    const dateStr = getEventLocalDate(eventStart) || new Date().toISOString().split('T')[0];
    return calendarTicks.some(t => t.eventId === eventId && t.dateStr === dateStr && t.done);
  };

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (event.start.date) return 'O dia todo';
    if (event.start.dateTime) {
      const startD = new Date(event.start.dateTime);
      const endD = event.end.dateTime ? new Date(event.end.dateTime) : null;
      
      const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return endD ? `${formatTime(startD)} - ${formatTime(endD)}` : formatTime(startD);
    }
    return '';
  };

  const formatEventDate = (dateTimeStr?: string, dateStr?: string) => {
    const d = dateTimeStr ? new Date(dateTimeStr) : dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  // Generate calendar grid cells for selectedMonth
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { dateStr: string; isCurrentMonth: boolean; dayNum: number }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, dNum);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(prevMonthDate.getDate()).padStart(2, '0')}`;
    cells.push({
      dateStr,
      isCurrentMonth: false,
      dayNum: dNum
    });
  }

  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    cells.push({
      dateStr,
      isCurrentMonth: true,
      dayNum: i
    });
  }

  // Next month padding days to complete full rows
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextMonthPadding = totalCells - cells.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDate.getDate()).padStart(2, '0')}`;
    cells.push({
      dateStr,
      isCurrentMonth: false,
      dayNum: i
    });
  }

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => {
      const eventStart = e.start.dateTime || e.start.date || '';
      return getEventLocalDate(eventStart) === dateStr;
    });
  };

  const displayedEvents = rangeType === 'month'
    ? getEventsForDate(selectedDate)
    : events;

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  return (
    <div id="calendar-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Google Agenda Sincronizada
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Puxa seus compromissos reais do Google e faça o controle diário ticando-os
          </p>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer self-start"
          >
            <LogOut size={14} />
            Desconectar
          </button>
        )}
      </div>

      {(!accessToken || error) && (
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                <Sparkles size={16} className="text-indigo-600" />
                Status da Sincronização da Agenda
              </p>
              <p className="text-slate-600 text-xs leading-relaxed">
                {error || 'Conecte sua conta do Google para atualizar seus compromissos em tempo real.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isIframe && (
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="bg-white hover:bg-slate-50 text-indigo-700 font-bold px-3 py-2 rounded-xl border border-indigo-200 transition shadow-xs inline-flex items-center gap-1 text-xs cursor-pointer"
                >
                  Abrir em Nova Aba ↗
                </button>
              )}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-xs inline-flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Conectando...' : 'Sincronizar com o Google'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Range Toggle & Sync Button */}
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex bg-slate-100 p-0.5 rounded-xl">
              <button
                onClick={() => setRangeType('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  rangeType === 'today'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setRangeType('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  rangeType === 'week'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setRangeType('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  rangeType === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mensal
              </button>
            </div>

            <button
              onClick={fetchCalendarEvents}
              disabled={loading || !accessToken}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition cursor-pointer flex items-center gap-1 px-3 text-xs font-semibold"
              title="Sincronizar novamente"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar Agenda</span>
            </button>
          </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-800 rounded-2xl p-4 text-xs">
                {error}
              </div>
            )}
            
            {/* Calendar Grid for 'month' view */}
            {rangeType === 'month' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4"
              >
                {/* Calendar Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-display font-semibold text-slate-800 text-sm capitalize flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleGoToToday}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                      title="Hoje"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                      title="Próximo Mês"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {/* Days of week */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">
                      {d}
                    </div>
                  ))}

                  {/* Grid Cells */}
                  {cells.map((cell, idx) => {
                    const dayEvents = getEventsForDate(cell.dateStr);
                    const isSelected = cell.dateStr === selectedDate;
                    const isToday = cell.dateStr === (() => {
                      const today = new Date();
                      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    })();

                    return (
                      <button
                        key={`${cell.dateStr}_${idx}`}
                        type="button"
                        onClick={() => {
                          if (cell.isCurrentMonth) {
                            setSelectedDate(cell.dateStr);
                          } else {
                            const d = new Date(cell.dateStr + 'T00:00:00');
                            setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                            setSelectedDate(cell.dateStr);
                          }
                        }}
                        className={`relative py-3 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer aspect-square ${
                          !cell.isCurrentMonth
                            ? 'text-slate-300 hover:bg-slate-50/50'
                            : isSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-sm scale-105 z-10'
                            : isToday
                            ? 'border border-indigo-500 text-indigo-600 font-bold bg-indigo-50/50 hover:bg-indigo-50'
                            : 'hover:bg-slate-100 text-slate-700 font-medium'
                        }`}
                      >
                        <span className="text-xs">{cell.dayNum}</span>
                        
                        {/* Event Dots */}
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 flex justify-center gap-0.5 w-full px-1">
                            {dayEvents.slice(0, 3).map((_, eIdx) => (
                              <span
                                key={eIdx}
                                className={`w-1 h-1 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-indigo-500'
                                }`}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className={`text-[8px] leading-[4px] font-bold ${isSelected ? 'text-white' : 'text-indigo-500'}`}>+</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Event List Title for Month View */}
            {rangeType === 'month' && (
              <div className="flex items-center gap-2 pt-2">
                <span className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Compromissos para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md ml-auto">
                  {displayedEvents.length} {displayedEvents.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
            )}

            {/* Event List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {loading && events.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-500 font-medium">
                    Buscando eventos com o Google...
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-1">
                      <CheckSquare size={18} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">Nenhum compromisso marcado!</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {rangeType === 'month' 
                        ? 'Não há compromissos marcados no seu Google Agenda para este dia específico.'
                        : 'Não há compromissos marcados no seu Google Agenda para o período selecionado.'}
                    </p>
                  </div>
                ) : (
                  displayedEvents.map(event => {
                    const eventStart = event.start.dateTime || event.start.date || '';
                    const checked = isEventChecked(event.id, eventStart);

                    return (
                      <motion.div
                        key={`${event.id}_${eventStart}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`group flex items-start gap-4 p-4 rounded-2xl bg-white border transition-all duration-200 ${
                          checked
                            ? 'border-slate-200/60 bg-slate-50/40 opacity-70'
                            : 'border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleEventTick(event.id, eventStart, event.summary)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                        >
                          {checked ? (
                            <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-50" />
                          ) : (
                            <Circle size={20} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                              {formatEventDate(event.start.dateTime, event.start.date)}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm font-semibold">
                              <Clock size={10} />
                              {formatEventTime(event)}
                            </span>
                            {event.calendarName && (
                              <span className="font-sans text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm font-semibold">
                                {event.calendarName}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-sm font-semibold mt-1.5 truncate ${
                            checked ? 'line-through text-slate-400 font-medium' : 'text-slate-900'
                          }`}>
                            {event.summary}
                          </h4>

                          {(event.description || event.location) && (
                            <div className="mt-2 space-y-1">
                              {event.location && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <MapPin size={11} className="shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </p>
                              )}
                              {event.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                  {event.description.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Stats sidebar */}
          <div className="space-y-4">
            {user && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-100 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{user.displayName || 'Usuário Google'}</h4>
                    <p className="text-[10px] text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Eventos listados:</span>
                    <span className="font-semibold text-slate-800">{events.length}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Concluídos:</span>
                    <span className="font-semibold text-emerald-600">
                      {events.filter(e => isEventChecked(e.id, e.start.dateTime || e.start.date || '')).length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-600" />
                Como funciona o controle?
              </h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Compromissos do Google Agenda são lidos em tempo real. Ao dar "check" neles, você registra o cumprimento no seu Segundo Cérebro sem modificar sua agenda oficial do Google.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
