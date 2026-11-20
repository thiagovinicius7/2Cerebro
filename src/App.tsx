import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CheckSquare, CloudOff, ListChecks, NotebookPen, PenLine, Plus, Repeat, Sun, X } from 'lucide-react';
import { auth } from './firebase';
import { migrateIfNeeded } from './lib/migrate';
import { BrainProvider, useBrain } from './lib/brain';
import { onDbError } from './lib/db';
import { newId, todayStr } from './lib/dates';
import LoginScreen from './components/LoginScreen';
import TodayView from './components/TodayView';
import TasksView from './components/TasksView';
import NotesView from './components/NotesView';
import RoutineView from './components/RoutineView';
import TaskEditor from './components/TaskEditor';
import NoteEditor from './components/NoteEditor';
import RoutineEditor from './components/RoutineEditor';
import SettingsSheet from './components/SettingsSheet';
import { ToastProvider, useToast } from './components/ui';

type Tab = 'hoje' | 'tarefas' | 'notas' | 'rotina';

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'hoje', label: 'Hoje', icon: Sun },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'notas', label: 'Notas', icon: NotebookPen },
  { id: 'rotina', label: 'Rotina', icon: Repeat },
];

const readTab = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.some(t => t.id === h) ? h : 'hoje';
};

function Shell({ user }: { user: User }) {
  const { editing, setEditing, loaded, synced, tasks } = useBrain();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(readTab);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => onDbError(msg => toast(msg)), [toast]);
  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (t: Tab) => {
    window.location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const today = todayStr();
  const overdue = tasks.filter(t => !t.done && t.dueDate && t.dueDate <= today).length;

  const add = (kind: 'task' | 'note' | 'list' | 'routine') => {
    setMenu(false);
    if (kind === 'task') setEditing({ kind: 'task', item: null, preset: { dueDate: tab === 'tarefas' ? null : today } });
    if (kind === 'note') setEditing({ kind: 'note', item: null });
    if (kind === 'list') setEditing({ kind: 'note', item: null, preset: { checklist: [{ id: newId(), text: '', done: false }] } });
    if (kind === 'routine') setEditing({ kind: 'routine', item: null });
  };

  const title = TABS.find(t => t.id === tab)!.label;

  return (
    <div className="min-h-[100dvh] bg-stone-100">
      <header className="sticky top-0 z-30 bg-stone-100/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <h1 className="text-lg font-bold text-stone-900 sm:hidden">{tab === 'hoje' ? '🧠 Segundo Cérebro' : title}</h1>
          <span className="hidden sm:block text-lg font-bold text-stone-900">🧠 Segundo Cérebro</span>
          <nav className="hidden sm:flex gap-1 ml-4">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium ${tab === t.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-white'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          {!synced && loaded && (
            <span className="flex items-center gap-1 text-xs text-amber-700" title="Sem conexão">
              <CloudOff size={15} /> offline
            </span>
          )}
          <button onClick={() => setSettings(true)} className="rounded-full" aria-label="Conta e configurações">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 pb-32 sm:pb-16">
        {!loaded ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-[3px] border-stone-300 border-t-stone-800 animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'hoje' && <TodayView />}
            {tab === 'tarefas' && <TasksView />}
            {tab === 'notas' && <NotesView />}
            {tab === 'rotina' && <RoutineView />}
          </>
        )}
      </main>

      {/* Botão + */}
      {menu && <div className="fixed inset-0 z-30 bg-stone-900/20" onClick={() => setMenu(false)} />}
      <div className="fixed z-40 right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-6 flex flex-col items-end gap-2">
        {menu && (
          <div className="flex flex-col items-end gap-2 animate-sheet">
            {[
              { k: 'task' as const, label: 'Tarefa', icon: CheckSquare },
              { k: 'note' as const, label: 'Nota', icon: PenLine },
              { k: 'list' as const, label: 'Lista', icon: ListChecks },
              { k: 'routine' as const, label: 'Rotina', icon: Repeat },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => add(o.k)}
                className="flex items-center gap-2 bg-white rounded-2xl pl-4 pr-3 py-2.5 shadow-lg border border-stone-100 font-medium text-stone-800"
              >
                {o.label}
                <o.icon size={18} className="text-stone-500" />
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setMenu(m => !m)}
          className="w-14 h-14 rounded-2xl bg-stone-900 text-white shadow-xl flex items-center justify-center active:scale-95 transition"
          aria-label={menu ? 'Fechar' : 'Adicionar'}
        >
          {menu ? <X size={26} /> : <Plus size={28} />}
        </button>
      </div>

      {/* Barra de abas (celular) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => go(t.id)} className={`relative flex flex-col items-center gap-0.5 py-2.5 ${on ? 'text-stone-900' : 'text-stone-400'}`}>
                <t.icon size={22} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] ${on ? 'font-semibold' : ''}`}>{t.label}</span>
                {t.id === 'tarefas' && overdue > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {overdue}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {editing?.kind === 'task' && <TaskEditor task={editing.item} preset={editing.preset} onClose={() => setEditing(null)} />}
      {editing?.kind === 'note' && <NoteEditor note={editing.item} preset={editing.preset} onClose={() => setEditing(null)} />}
      {editing?.kind === 'routine' && <RoutineEditor routine={editing.item} preset={editing.preset} onClose={() => setEditing(null)} />}
      {settings && <SettingsSheet user={user} onClose={() => setSettings(false)} />}
    </div>
  );
}

function Migrator({ user, children }: { user: User; children: React.ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    migrateIfNeeded(user.uid)
      .then(res => {
        if (res.migrated && res.counts)
          toast(`Seus dados foram trazidos para a nova versão: ${res.counts.tasks} tarefas, ${res.counts.notes} notas, ${res.counts.routines} itens de rotina.`);
      })
      .catch(e => {
        console.error(e);
        toast('Não consegui converter os dados antigos agora. Nada foi perdido; tento de novo na próxima vez.');
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [user.uid, toast]);
  if (!ready)
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-stone-100 text-stone-500">
        <div className="w-8 h-8 rounded-full border-[3px] border-stone-300 border-t-stone-800 animate-spin" />
        <span className="text-sm">Abrindo…</span>
      </div>
    );
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined)
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-100">
        <div className="w-8 h-8 rounded-full border-[3px] border-stone-300 border-t-stone-800 animate-spin" />
      </div>
    );

  return (
    <ToastProvider>
      {!user ? (
        <LoginScreen />
      ) : (
        <Migrator user={user} key={user.uid}>
          <BrainProvider uid={user.uid}>
            <Shell user={user} />
          </BrainProvider>
        </Migrator>
      )}
    </ToastProvider>
  );
}
