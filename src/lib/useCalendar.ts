import { useCallback, useEffect, useState } from 'react';
import { CalendarEvent } from './types';
import { CalendarAuthError, cachedDayEvents, fetchDayEvents, getCalendarToken } from './calendar';
import { reconnectCalendar } from '../firebase';

export type CalendarStatus = 'loading' | 'ok' | 'disconnected' | 'error';

export function useCalendarDay(date: string) {
  const cached = cachedDayEvents(date);
  const [events, setEvents] = useState<CalendarEvent[]>(cached?.events || []);
  const [updatedAt, setUpdatedAt] = useState<number | null>(cached?.at || null);
  const [status, setStatus] = useState<CalendarStatus>('loading');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const c = cachedDayEvents(date);
    setEvents(c?.events || []);
    setUpdatedAt(c?.at || null);
    const tok = getCalendarToken();
    if (!tok) {
      setStatus('disconnected');
      return;
    }
    setStatus('loading');
    fetchDayEvents(tok.token, date)
      .then(evs => {
        if (!alive) return;
        setEvents(evs);
        setUpdatedAt(Date.now());
        setStatus('ok');
      })
      .catch(err => {
        if (!alive) return;
        setStatus(err instanceof CalendarAuthError ? 'disconnected' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [date, tick]);

  const connect = useCallback(async () => {
    await reconnectCalendar();
    setTick(t => t + 1);
  }, []);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  return { events, status, updatedAt, connect, refresh };
}
