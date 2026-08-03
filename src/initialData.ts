import { RoutineItem, Note, Bill, Habit, Checklist } from './types';

export const SAMPLE_ROUTINE: RoutineItem[] = [];

export const SAMPLE_HABITS: Habit[] = [];

export const SAMPLE_BILLS: Bill[] = [];

export const SAMPLE_NOTES: Note[] = [];

export const SAMPLE_CHECKLISTS: Checklist[] = [];

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

