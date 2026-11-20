import { CalendarEvent } from './types';
import { parseDate } from './dates';

// O acesso do Google vale ~1 hora. Fica só neste aparelho (não vai mais para o banco).
const TOKEN_KEY = 'sc2_cal_token';
const TOKEN_TTL = 55 * 60 * 1000;

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};

export const saveCalendarToken = (token: string) =>
  safeSet(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + TOKEN_TTL }));

export const clearCalendarToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nada */
  }
};

export const getCalendarToken = (): { token: string; exp: number } | null => {
  const raw = safeGet(TOKEN_KEY);
  if (!raw) return null;
  try {
    const t = JSON.parse(raw);
    return t.exp > Date.now() ? t : null;
  } catch {
    return null;
  }
};

export class CalendarAuthError extends Error {}

const api = async (token: string, path: string) => {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearCalendarToken();
    throw new CalendarAuthError('Acesso à agenda expirou');
  }
  if (!res.ok) throw new Error(`Agenda: erro ${res.status}`);
  return res.json();
};

let calendarsCache: { token: string; list: { id: string; name: string; color?: string }[] } | null = null;

const listCalendars = async (token: string) => {
  if (calendarsCache?.token === token) return calendarsCache.list;
  const data = await api(token, '/users/me/calendarList?minAccessRole=reader');
  const list = (data.items || [])
    .filter((c: any) => c.selected && !c.hidden)
    .map((c: any) => ({ id: c.id, name: c.summaryOverride || c.summary, color: c.backgroundColor }));
  calendarsCache = { token, list };
  return list;
};

export const fetchDayEvents = async (token: string, date: string): Promise<CalendarEvent[]> => {
  const start = parseDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const cals = await listCalendars(token);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });
  const results = await Promise.all(
    cals.map(async c => {
      try {
        const data = await api(token, `/calendars/${encodeURIComponent(c.id)}/events?${params}`);
        return (data.items || [])
          .filter((e: any) => e.status !== 'cancelled')
          .map(
            (e: any): CalendarEvent => ({
              id: `${c.id}:${e.id}`,
              title: e.summary || '(sem título)',
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date,
              allDay: !e.start?.dateTime,
              calendarName: c.name,
              color: c.color,
              location: e.location,
            }),
          );
      } catch (err) {
        if (err instanceof CalendarAuthError) throw err;
        return [];
      }
    }),
  );
  const events = results.flat();
  // Remove duplicados (mesmo evento em duas agendas)
  const seen = new Set<string>();
  const unique = events.filter(e => {
    const k = `${e.title}|${e.start}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  safeSet(`sc2_cal_${date}`, JSON.stringify({ at: Date.now(), events: unique }));
  return unique;
};

export const cachedDayEvents = (date: string): { at: number; events: CalendarEvent[] } | null => {
  const raw = safeGet(`sc2_cal_${date}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const eventTime = (e: CalendarEvent) => {
  if (e.allDay) return '';
  const d = new Date(e.start);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const eventEndTime = (e: CalendarEvent) => {
  if (e.allDay) return '';
  const d = new Date(e.end);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
