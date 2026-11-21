// Modelo de dados v2 — cada item é um documento próprio em
// users/{uid}/tasks, users/{uid}/notes, users/{uid}/routines e users/{uid}/media.

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  freq: RecurrenceFreq;
  interval?: number; // a cada N dias/semanas/meses (padrão 1)
  weekDays?: number[]; // para 'weekly': 0 = domingo … 6 = sábado
  monthDay?: number; // para 'monthly': dia âncora (mantém o 31 quando o mês é curto)
}

/** Estado de um item num dia: feito, não feito ou cancelado. */
export type ItemStatus = 'done' | 'skip' | 'cancel';

export interface TaskDone {
  date: string; // data de vencimento da ocorrência (YYYY-MM-DD)
  doneAt: string; // ISO
  status?: 'done' | 'skip'; // ausente = feito
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string | null; // YYYY-MM-DD
  time?: string | null; // HH:MM
  recurrence?: Recurrence | null;
  amount?: number | null; // valor em R$ (contas)
  tags: string[];
  done: boolean;
  doneAt?: string | null;
  cancelled?: boolean; // concluída como "cancelada"
  history?: TaskDone[]; // ocorrências concluídas de tarefas repetidas
  createdAt: string;
  updatedAt: string;
}

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'amber';

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteAttachment {
  id: string;
  type: 'image' | 'video' | 'link';
  name: string;
  url?: string; // links e imagens externas
  mediaId?: string; // imagem enviada pelo app (users/{uid}/media/{mediaId})
}

export interface Note {
  id: string;
  title: string;
  text: string;
  checklist: ChecklistEntry[];
  color: NoteColor | null;
  pinned: boolean;
  tags: string[];
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type RoutinePattern = 'days' | 'novena' | 'challenge';

export interface Routine {
  id: string;
  title: string;
  notes?: string;
  pattern: RoutinePattern;
  weekDays: number[]; // vazio = todos os dias
  time?: string | null; // HH:MM — aparece na linha do tempo do dia
  endTime?: string | null;
  // Novena
  novenaMonthly?: boolean; // true: todo mês do dia novenaStartDay ao +8
  novenaStartDay?: number;
  // Novena única e desafio
  startDate?: string | null;
  durationDays?: number | null; // desafio (ex.: 40)
  category?: string;
  history: Record<string, boolean | 'skip' | 'cancel'>; // YYYY-MM-DD -> true (feito), 'skip' (não feito), 'cancel'
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaDoc {
  data: string; // data URL (JPEG comprimido)
  width: number;
  height: number;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO ou YYYY-MM-DD
  end: string;
  allDay: boolean;
  calendarName?: string;
  color?: string;
  location?: string;
}

export const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; dot: string; label: string }> = {
  yellow: { bg: 'bg-[#FFF3B8]', border: 'border-transparent', dot: 'bg-[#FFE16B]', label: 'Amarelo' },
  amber: { bg: 'bg-[#FFE3C9]', border: 'border-transparent', dot: 'bg-[#FFB977]', label: 'Laranja' },
  pink: { bg: 'bg-[#FFDDE6]', border: 'border-transparent', dot: 'bg-[#FF9DB5]', label: 'Rosa' },
  purple: { bg: 'bg-[#E9E1FF]', border: 'border-transparent', dot: 'bg-[#B9A3FF]', label: 'Roxo' },
  blue: { bg: 'bg-[#DCEEFF]', border: 'border-transparent', dot: 'bg-[#8CC4FF]', label: 'Azul' },
  green: { bg: 'bg-[#D8F1E3]', border: 'border-transparent', dot: 'bg-[#7FD3A5]', label: 'Verde' },
};
