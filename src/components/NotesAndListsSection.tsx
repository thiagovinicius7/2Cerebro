import React, { useState } from 'react';
import { 
  Note, 
  Checklist, 
  RoutineItem, 
  GoogleCalendarEvent 
} from '../types';
import NotesSection from './NotesSection';
import ChecklistsSection from './ChecklistsSection';
import { 
  FileText, 
  ListTodo, 
  Sparkles, 
  Plus, 
  CheckSquare, 
  BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotesAndListsSectionProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  checklists: Checklist[];
  setChecklists: React.Dispatch<React.SetStateAction<Checklist[]>>;
  routine: RoutineItem[];
  calendarEvents: GoogleCalendarEvent[];
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function NotesAndListsSection({
  notes,
  setNotes,
  checklists,
  setChecklists,
  routine,
  calendarEvents,
  addToast,
}: NotesAndListsSectionProps) {
  const [subTab, setSubTab] = useState<'notes' | 'checklists'>('notes');

  const totalChecklistItems = checklists.reduce((acc, list) => acc + list.items.length, 0);
  const completedChecklistItems = checklists.reduce(
    (acc, list) => acc + list.items.filter(i => i.done).length, 
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BookOpen size={20} />
            </div>
            <h2 className="font-display font-bold text-slate-900 text-xl sm:text-2xl">
              Notas & Listas Unificadas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seu centro de documentação pessoal: registre anotações completas com anexos ou organize checklists e tarefas.
          </p>
        </div>

        {/* Sub-Tab Selector Pills */}
        <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 self-start sm:self-center border border-slate-200/60 shadow-2xs">
          <button
            onClick={() => setSubTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'notes'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={15} className={subTab === 'notes' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Notas & Anexos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              subTab === 'notes' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('checklists')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'checklists'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTodo size={15} className={subTab === 'checklists' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Checklists & Listas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              subTab === 'checklists' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {checklists.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content */}
      <AnimatePresence mode="wait">
        {subTab === 'notes' ? (
          <motion.div
            key="notes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <NotesSection
              notes={notes}
              setNotes={setNotes}
              routine={routine}
              calendarEvents={calendarEvents}
              addToast={addToast}
            />
          </motion.div>
        ) : (
          <motion.div
            key="checklists-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <ChecklistsSection
              checklists={checklists}
              setChecklists={setChecklists}
              routine={routine}
              calendarEvents={calendarEvents}
              addToast={addToast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
