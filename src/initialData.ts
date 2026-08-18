import { RoutineItem, Note, Bill, Habit, Checklist, StickyNote } from './types';

export const SAMPLE_ROUTINE: RoutineItem[] = [];

export const SAMPLE_HABITS: Habit[] = [];

export const SAMPLE_BILLS: Bill[] = [];

export const SAMPLE_NOTES: Note[] = [];

export const SAMPLE_CHECKLISTS: Checklist[] = [];

export const SAMPLE_STICKY_NOTES: StickyNote[] = [
  {
    id: 'stick_welcome_1',
    content: '📌 Bem-vindo ao seu novo Quadro de Post-its!\nUse este espaço para anotar ideias rápidas, números e recados instantâneos.',
    color: 'yellow',
    createdAt: new Date().toISOString(),
    pinned: true,
    tag: 'dica',
  },
  {
    id: 'stick_welcome_2',
    content: '💡 Dica: Você pode categorizar por cores (Rosa, Azul, Verde, Amarelo...) e fixar no topo.',
    color: 'blue',
    createdAt: new Date().toISOString(),
    pinned: false,
    tag: 'organizacao',
  }
];

export const getLocalStorageData = <T>(key: string, initial: T): T => {
  try {
    const data = localStorage.getItem(key);
    if (!data || data === 'null' || data === 'undefined') {
      return initial;
    }
    const parsed = JSON.parse(data);
    return parsed !== null && parsed !== undefined ? parsed : initial;
  } catch (e) {
    console.error(`Erro ao ler ${key} do localStorage`, e);
    return initial;
  }
};

export const setLocalStorageData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage`, e);
  }
};

