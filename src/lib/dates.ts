// Datas sempre no horário local (o app antigo usava toISOString, que vira o dia às 21h no Brasil).

export const pad = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayStr = () => toDateStr(new Date());

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

export const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

export const addMonths = (s: string, n: number, anchorDay?: number) => {
  const d = parseDate(s);
  const day = anchorDay || d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
  return toDateStr(target);
};

export const diffDays = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const weekday = (s: string) => parseDate(s).getDay();

export const formatShort = (s: string) => {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const formatDayLabel = (s: string, today = todayStr()) => {
  const diff = diffDays(today, s);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const d = parseDate(s);
  const base = `${WEEKDAYS_SHORT[d.getDay()].toLowerCase()}, ${formatShort(s)}`;
  return d.getFullYear() !== parseDate(today).getFullYear() ? `${base} ${d.getFullYear()}` : base;
};

export const formatLong = (s: string) => {
  const t = parseDate(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const formatMoney = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const nowIso = () => new Date().toISOString();

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
