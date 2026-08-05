export interface RoutineItem {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  time: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  title: string;
  description?: string;
  done: boolean;
  history?: Record<string, boolean>; // dateStr ("YYYY-MM-DD") -> done
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
  calendarName?: string;
}

export interface CalendarTickState {
  eventId: string;
  dateStr: string; // To handle recurring events on different dates
  done: boolean;
}

export interface NoteMedia {
  id: string;
  type: 'image' | 'video' | 'link';
  url: string;
  name: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  media: NoteMedia[];
  createdAt: string;
  tags?: string[];
  linkedTo?: {
    type: 'routine' | 'calendar';
    id: string;
    title: string;
  };
  category?: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  notes?: string;
  recurring?: boolean; // Se é mensal
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'novena';
  createdAt: string;
  novenaStart?: string; // YYYY-MM-DD (for 9-day novena)
  novenaStartDay?: number;
  novenaEndDay?: number;
  novenaRepeatMonthly?: boolean;
  history: Record<string, boolean>; // dateStr ("YYYY-MM-DD") -> done
  weekDays?: number[]; // Days of the week (0 = Sunday, 1 = Monday, etc.)
  time?: string; // e.g. "16:00"
  category?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  linkedTo?: {
    type: 'routine' | 'calendar';
    id: string;
    title: string;
  };
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  category?: string;
}
