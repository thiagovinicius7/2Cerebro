import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CheckSquare, CloudOff, ListChecks, NotebookPen, PenLine, Plus, Repeat, Sun, X } from 'lucide-react';
import { auth } from './firebase';
import { migrateIfNeeded } from './lib/migrate';
import { BrainProvider, useBrain } from './lib/brain';
import { onDbError } from './lib/db';
import { refreshPush } from './lib/push';
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
import { AvatarProvider, ToastProvider, useToast } from './components/ui';

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
  const { uid, editing, setEditing, loaded, synced, tasks } = useBrain();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(readTab);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => onDbError(msg => toast(msg)), [toast]);
  useEffect(() => {
    refreshPush(uid);
  }, [uid]);
  useEffect(() => {
    // Atalho "Nova tarefa" do ícone do app: abre o editor de tarefa para hoje
    const onHash = () => {
      if (window.location.hash === '#nova') {
        history.replaceState(null, '', '#hoje');
        setTab('hoje');
        setEditing({ kind: 'task', item: null, preset: { dueDate: todayStr() } });
        return;
      }
      setTab(readTab());
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setEditing]);
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


  const avatar = (
    <button onClick={() => setSettings(true)} className="rounded-full shrink-0" aria-label="Conta e configurações">
      {user.photoURL ? (
        <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full ring-2 ring-white/40" referrerPolicy="no-referrer" />
      ) : (
        <span className="w-9 h-9 rounded-full bg-white/25 text-white flex items-center justify-center font-bold text-sm">
          {(user.displayName || user.email || '?')[0].toUpperCase()}
        </span>
      )}
    </button>
  );

  return (
    <AvatarProvider value={avatar}>
      <div className="min-h-[100dvh] bg-fundo">
        {/* Barra de cima (computador) */}
        <header className="hidden sm:block sticky top-0 z-30 bg-tinta text-white">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <span className="text-lg font-bold">🧠 Segundo Cérebro</span>
            <nav className="flex gap-1 ml-4">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium ${tab === t.id ? 'bg-white text-tinta' : 'text-white/70 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="flex-1" />
            {!synced && loaded && (
              <span className="flex items-center gap-1 text-xs text-sol-300" title="Sem conexão">
                <CloudOff size={15} /> offline
              </span>
            )}
            {avatar}
          </div>
        </header>

        {!synced && loaded && (
          <div className="sm:hidden fixed top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 text-xs bg-tinta/90 text-sol-300 px-3 py-1 rounded-full">
            <CloudOff size={13} /> offline
          </div>
        )}

        <main className="max-w-3xl mx-auto pb-36 sm:pb-16 sm:pt-4">
          {!loaded ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 rounded-full border-[3px] border-mata-100 border-t-mata-700 animate-spin" />
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
        {menu && <div className="fixed inset-0 z-30 bg-tinta/25" onClick={() => setMenu(false)} />}
        <div className="fixed z-40 right-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:bottom-6 flex flex-col items-end gap-2">
          {menu && (
            <div className="flex flex-col items-end gap-2 animate-sheet">
              {[
                { k: 'task' as const, label: 'Tarefa', icon: CheckSquare, tint: 'bg-rose-50 text-rose-500' },
                { k: 'note' as const, label: 'Nota', icon: PenLine, tint: 'bg-yellow-50 text-yellow-600' },
                { k: 'list' as const, label: 'Lista', icon: ListChecks, tint: 'bg-mata-50 text-mata-600' },
                { k: 'routine' as const, label: 'Rotina', icon: Repeat, tint: 'bg-violet-50 text-violet-500' },
              ].map(o => (
                <button
                  key={o.k}
                  onClick={() => add(o.k)}
                  className="flex items-center gap-2.5 bg-white rounded-2xl pl-4 pr-2 py-2 shadow-lg font-semibold text-tinta"
                >
                  {o.label}
                  <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${o.tint}`}>
                    <o.icon size={17} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setMenu(m => !m)}
            className="w-14 h-14 rounded-[18px] bg-sol-400 text-tinta shadow-[0_8px_18px_rgba(0,0,0,0.18)] flex items-center justify-center active:scale-95 transition"
            aria-label={menu ? 'Fechar' : 'Adicionar'}
          >
            {menu ? <X size={26} /> : <Plus size={28} strokeWidth={2.4} />}
          </button>
        </div>

        {/* Barra de abas flutuante (celular) */}
        <nav className="sm:hidden fixed z-30 left-4 right-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] bg-tinta rounded-3xl shadow-xl">
          <div className="grid grid-cols-4">
            {TABS.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => go(t.id)} className={`relative flex flex-col items-center gap-0.5 py-2.5 ${on ? 'text-white' : 'text-[#8E9993]'}`}>
                  <t.icon size={21} strokeWidth={on ? 2.4 : 2} />
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
    </AvatarProvider>
  );
}

// Uma migração por conta por carregamento da página (o React pode montar o componente duas vezes)
const migrations = new Map<string, ReturnType<typeof migrateIfNeeded>>();

function Migrator({ user, children }: { user: User; children: React.ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const first = !migrations.has(user.uid);
    if (first) migrations.set(user.uid, migrateIfNeeded(user.uid));
    migrations
      .get(user.uid)!
      .then(res => {
        if (first && res.migrated && res.counts)
          toast(`Seus dados foram trazidos para a nova versão: ${res.counts.tasks} tarefas, ${res.counts.notes} notas, ${res.counts.routines} itens de rotina.`);
      })
      .catch(e => {
        console.error(e);
        if (first) toast('Não consegui converter os dados antigos agora. Nada foi perdido; tento de novo na próxima vez.');
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [user.uid, toast]);
  if (!ready)
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-fundo text-stone-500">
        <div className="w-8 h-8 rounded-full border-[3px] border-mata-100 border-t-mata-700 animate-spin" />
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-fundo">
        <div className="w-8 h-8 rounded-full border-[3px] border-mata-100 border-t-mata-700 animate-spin" />
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
