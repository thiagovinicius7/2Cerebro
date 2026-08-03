import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { initAuth, db, googleSignIn, logout, clearGoogleTokenOn401, setCachedAccessToken } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { RoutineItem, Note, Bill, Habit, Checklist, CalendarTickState, GoogleCalendarEvent } from './types';
import {
  SAMPLE_ROUTINE,
  SAMPLE_HABITS,
  SAMPLE_BILLS,
  SAMPLE_NOTES,
  SAMPLE_CHECKLISTS,
  getLocalStorageData,
  setLocalStorageData,
} from './initialData';

// Icons
import {
  Brain,
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  ListTodo,
  FileText,
  Sparkles,
  Check,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronRight,
  TrendingUp,
  Bell,
  BellOff,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Subsections
import RoutineSection from './components/RoutineSection';
import CalendarSection from './components/CalendarSection';
import NotesSection from './components/NotesSection';
import BillsSection from './components/BillsSection';
import HabitsSection from './components/HabitsSection';
import ChecklistsSection from './components/ChecklistsSection';
import WeeklyOverview from './components/WeeklyOverview';
import LoginScreen from './components/LoginScreen';

// Helper functions to merge local and cloud states on login/first load
const mergeRoutines = (local: RoutineItem[], cloud: RoutineItem[]): RoutineItem[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const exists = merged.some(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || 
      (cloudItem.dayOfWeek === localItem.dayOfWeek && cloudItem.title === localItem.title && cloudItem.time === localItem.time))
    );
    if (!exists) {
      merged.push(localItem);
    }
  });
  return merged;
};

const mergeHabits = (local: Habit[], cloud: Habit[]): Habit[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const cloudIndex = merged.findIndex(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || cloudItem.title === localItem.title)
    );
    if (cloudIndex > -1) {
      merged[cloudIndex] = {
        ...merged[cloudIndex],
        history: {
          ...(merged[cloudIndex]?.history || {}),
          ...(localItem.history || {})
        }
      };
    } else {
      merged.push(localItem);
    }
  });
  return merged;
};

const mergeBills = (local: Bill[], cloud: Bill[]): Bill[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const cloudIndex = merged.findIndex(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || 
      (cloudItem.title === localItem.title && cloudItem.dueDate === localItem.dueDate))
    );
    if (cloudIndex > -1) {
      if (localItem.paid && merged[cloudIndex] && !merged[cloudIndex].paid) {
        merged[cloudIndex] = { ...merged[cloudIndex], paid: true };
      }
    } else {
      merged.push(localItem);
    }
  });
  return merged;
};

const mergeNotes = (local: Note[], cloud: Note[]): Note[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const exists = merged.some(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || 
      (cloudItem.title === localItem.title && cloudItem.content === localItem.content))
    );
    if (!exists) {
      merged.push(localItem);
    }
  });
  return merged;
};

const mergeChecklists = (local: Checklist[], cloud: Checklist[]): Checklist[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const cloudIndex = merged.findIndex(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || cloudItem.title === localItem.title)
    );
    if (cloudIndex > -1) {
      const cloudItems = Array.isArray(merged[cloudIndex]?.items) ? merged[cloudIndex].items : [];
      const mergedItems = [...cloudItems];
      const localCheckItems = Array.isArray(localItem.items) ? localItem.items : [];
      localCheckItems.forEach(localCheckItem => {
        if (!localCheckItem) return;
        const itemExists = mergedItems.some(cloudCheckItem => 
          cloudCheckItem && (cloudCheckItem.id === localCheckItem.id || cloudCheckItem.text === localCheckItem.text)
        );
        if (!itemExists) {
          mergedItems.push(localCheckItem);
        }
      });
      merged[cloudIndex] = {
        ...merged[cloudIndex],
        items: mergedItems
      };
    } else {
      merged.push(localItem);
    }
  });
  return merged;
};

const mergeCalendarTicks = (local: CalendarTickState[], cloud: CalendarTickState[]): CalendarTickState[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const exists = merged.some(cloudItem => 
      cloudItem && (cloudItem.eventId === localItem.eventId && cloudItem.dateStr === localItem.dateStr)
    );
    if (!exists) {
      merged.push(localItem);
    }
  });
  return merged;
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Core brain states (persisted in localStorage)
  const [routine, setRoutine] = useState<RoutineItem[]>(() =>
    getLocalStorageData('brain_routine', SAMPLE_ROUTINE)
  );
  const [habits, setHabits] = useState<Habit[]>(() =>
    getLocalStorageData('brain_habits', SAMPLE_HABITS)
  );
  const [bills, setBills] = useState<Bill[]>(() =>
    getLocalStorageData('brain_bills', SAMPLE_BILLS)
  );
  const [notes, setNotes] = useState<Note[]>(() =>
    getLocalStorageData('brain_notes', SAMPLE_NOTES)
  );
  const [checklists, setChecklists] = useState<Checklist[]>(() =>
    getLocalStorageData('brain_checklists', SAMPLE_CHECKLISTS)
  );
  const [calendarTicks, setCalendarTicks] = useState<CalendarTickState[]>(() =>
    getLocalStorageData('brain_calendar_ticks', [])
  );

  // Notification states
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() =>
    getLocalStorageData('brain_reminders_enabled', false)
  );
  const [reminderMorningEnabled, setReminderMorningEnabled] = useState<boolean>(() =>
    getLocalStorageData('brain_reminders_morning_enabled', true)
  );
  const [reminderEveningEnabled, setReminderEveningEnabled] = useState<boolean>(() =>
    getLocalStorageData('brain_reminders_evening_enabled', true)
  );
  const [reminderMorningTime, setReminderMorningTime] = useState<string>(() =>
    getLocalStorageData('brain_reminders_morning_time', '08:00')
  );
  const [reminderEveningTime, setReminderEveningTime] = useState<string>(() =>
    getLocalStorageData('brain_reminders_evening_time', '18:00')
  );
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
    } catch (e) {
      console.warn('Erro ao acessar permissão de notificação no iframe:', e);
      return 'denied';
    }
  });
  const [lastTriggeredReminders, setLastTriggeredReminders] = useState<Record<string, boolean>>(() =>
    getLocalStorageData('brain_reminders_last_triggered', {})
  );

  // Sync state changes to localStorage
  useEffect(() => {
    setLocalStorageData('brain_routine', routine);
  }, [routine]);

  useEffect(() => {
    setLocalStorageData('brain_habits', habits);
  }, [habits]);

  useEffect(() => {
    setLocalStorageData('brain_bills', bills);
  }, [bills]);

  useEffect(() => {
    setLocalStorageData('brain_notes', notes);
  }, [notes]);

  useEffect(() => {
    setLocalStorageData('brain_checklists', checklists);
  }, [checklists]);

  useEffect(() => {
    setLocalStorageData('brain_calendar_ticks', calendarTicks);
  }, [calendarTicks]);

  // Sync notification states to localStorage
  useEffect(() => {
    setLocalStorageData('brain_reminders_enabled', remindersEnabled);
  }, [remindersEnabled]);

  useEffect(() => {
    setLocalStorageData('brain_reminders_morning_enabled', reminderMorningEnabled);
  }, [reminderMorningEnabled]);

  useEffect(() => {
    setLocalStorageData('brain_reminders_evening_enabled', reminderEveningEnabled);
  }, [reminderEveningEnabled]);

  useEffect(() => {
    setLocalStorageData('brain_reminders_morning_time', reminderMorningTime);
  }, [reminderMorningTime]);

  useEffect(() => {
    setLocalStorageData('brain_reminders_evening_time', reminderEveningTime);
  }, [reminderEveningTime]);

  useEffect(() => {
    setLocalStorageData('brain_reminders_last_triggered', lastTriggeredReminders);
  }, [lastTriggeredReminders]);

  // Notification scheduler interval
  useEffect(() => {
    if (!remindersEnabled || notificationPermission !== 'granted') return;

    const checkAndTriggerReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;

      // 1. Morning Reminder check
      if (reminderMorningEnabled && currentTimeStr === reminderMorningTime) {
        const triggerKey = `${todayStr}-morning-${reminderMorningTime}`;
        if (!lastTriggeredReminders[triggerKey]) {
          try {
            new Notification('Planeje seu Dia! 🧠✍️', {
              body: 'Bom dia! Que tal tirar 5 minutos para organizar suas rotinas, hábitos e tarefas de hoje?',
              tag: 'morning-reminder',
              requireInteraction: true,
            });
            setLastTriggeredReminders(prev => ({
              ...prev,
              [triggerKey]: true
            }));
          } catch (err) {
            console.error('Falha ao enviar notificação matinal:', err);
          }
        }
      }

      // 2. Evening Reminder check
      if (reminderEveningEnabled && currentTimeStr === reminderEveningTime) {
        const triggerKey = `${todayStr}-evening-${reminderEveningTime}`;
        if (!lastTriggeredReminders[triggerKey]) {
          try {
            new Notification('Revisão do Dia! 🔍🌙', {
              body: 'Boa noite! Que tal conferir se esqueceu de concluir algum hábito ou registrar alguma conta?',
              tag: 'evening-reminder',
              requireInteraction: true,
            });
            setLastTriggeredReminders(prev => ({
              ...prev,
              [triggerKey]: true
            }));
          } catch (err) {
            console.error('Falha ao enviar notificação noturna:', err);
          }
        }
      }
    };

    // Run check immediately
    checkAndTriggerReminders();

    const interval = setInterval(checkAndTriggerReminders, 20000);
    return () => clearInterval(interval);
  }, [
    remindersEnabled,
    notificationPermission,
    reminderMorningEnabled,
    reminderMorningTime,
    reminderEveningEnabled,
    reminderEveningTime,
    lastTriggeredReminders
  ]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      addToast('Este navegador não suporta notificações de desktop.', 'error');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        addToast('Notificações de lembretes ativadas! 🔔', 'success');
        new Notification('Lembretes Diários Ativos! 🧠', {
          body: 'Seu Segundo Cérebro enviará alertas nos horários configurados.',
        });
        return true;
      } else {
        addToast('Permissão de notificação negada no navegador.', 'error');
        return false;
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificação:', err);
      addToast('Erro ao configurar notificações.', 'error');
      return false;
    }
  };

  // Firestore Sync States
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Refs to always access freshest state inside subscription callback
  const routineRef = useRef(routine);
  const habitsRef = useRef(habits);
  const billsRef = useRef(bills);
  const notesRef = useRef(notes);
  const checklistsRef = useRef(checklists);
  const calendarTicksRef = useRef(calendarTicks);
  const hasInitialLoadRef = useRef(false);

  // Firestore comparison refs to prevent write-back loops and race conditions
  const cloudRoutineRef = useRef<RoutineItem[] | null>(null);
  const cloudHabitsRef = useRef<Habit[] | null>(null);
  const cloudBillsRef = useRef<Bill[] | null>(null);
  const cloudNotesRef = useRef<Note[] | null>(null);
  const cloudChecklistsRef = useRef<Checklist[] | null>(null);
  const cloudCalendarTicksRef = useRef<CalendarTickState[] | null>(null);

  // Update refs on state changes
  useEffect(() => { routineRef.current = routine; }, [routine]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);
  useEffect(() => { billsRef.current = bills; }, [bills]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { checklistsRef.current = checklists; }, [checklists]);
  useEffect(() => { calendarTicksRef.current = calendarTicks; }, [calendarTicks]);

  // Reset initial load flag on logout
  useEffect(() => {
    if (!user) {
      hasInitialLoadRef.current = false;
      cloudRoutineRef.current = null;
      cloudHabitsRef.current = null;
      cloudBillsRef.current = null;
      cloudNotesRef.current = null;
      cloudChecklistsRef.current = null;
      cloudCalendarTicksRef.current = null;
    }
  }, [user]);

  // Load data and set up real-time onSnapshot subscription
  useEffect(() => {
    if (!user) {
      setFirestoreLoaded(false);
      setSyncingCloud(false);
      return;
    }

    setSyncingCloud(true);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            // Skip applying updates that we are currently writing
            if (snapshot.metadata.hasPendingWrites) {
              setFirestoreLoaded(true);
              setSyncingCloud(false);
              return;
            }

            const data = snapshot.data();

            if (data.googleAccessToken && data.googleAccessToken !== accessToken) {
              setAccessToken(data.googleAccessToken);
              setCachedAccessToken(data.googleAccessToken);
            }

            if (!hasInitialLoadRef.current) {
              // Merging local data (from this device's localStorage) and cloud data
              const mergedRoutine = mergeRoutines(routineRef.current, data.routine || []);
              const mergedHabits = mergeHabits(habitsRef.current, data.habits || []);
              const mergedBills = mergeBills(billsRef.current, data.bills || []);
              const mergedNotes = mergeNotes(notesRef.current, data.notes || []);
              const mergedChecklists = mergeChecklists(checklistsRef.current, data.checklists || []);
              const mergedCalendarTicks = mergeCalendarTicks(calendarTicksRef.current, data.calendarTicks || []);

              // Set the cloud references so we know what is already in the database
              cloudRoutineRef.current = data.routine || [];
              cloudHabitsRef.current = data.habits || [];
              cloudBillsRef.current = data.bills || [];
              cloudNotesRef.current = data.notes || [];
              cloudChecklistsRef.current = data.checklists || [];
              cloudCalendarTicksRef.current = data.calendarTicks || [];

              // Update state with the merged result
              setRoutine(mergedRoutine);
              setHabits(mergedHabits);
              setBills(mergedBills);
              setNotes(mergedNotes);
              setChecklists(mergedChecklists);
              setCalendarTicks(mergedCalendarTicks);

              // Detect if local storage had any new/un-synced changes
              const hadLocalAdditions = 
                JSON.stringify(mergedRoutine) !== JSON.stringify(data.routine) ||
                JSON.stringify(mergedHabits) !== JSON.stringify(data.habits) ||
                JSON.stringify(mergedBills) !== JSON.stringify(data.bills) ||
                JSON.stringify(mergedNotes) !== JSON.stringify(data.notes) ||
                JSON.stringify(mergedChecklists) !== JSON.stringify(data.checklists) ||
                JSON.stringify(mergedCalendarTicks) !== JSON.stringify(data.calendarTicks);

              if (hadLocalAdditions) {
                addToast('Dados locais e nuvem sincronizados e mesclados! ☁️✨', 'success');
              } else {
                addToast('Seus dados foram sincronizados com a nuvem! ☁️', 'success');
              }
              hasInitialLoadRef.current = true;
            } else {
              // Subsequent snapshots (live edits from another device)
              cloudRoutineRef.current = data.routine || [];
              cloudHabitsRef.current = data.habits || [];
              cloudBillsRef.current = data.bills || [];
              cloudNotesRef.current = data.notes || [];
              cloudChecklistsRef.current = data.checklists || [];
              cloudCalendarTicksRef.current = data.calendarTicks || [];

              const routineDiff = JSON.stringify(data.routine) !== JSON.stringify(routineRef.current);
              const habitsDiff = JSON.stringify(data.habits) !== JSON.stringify(habitsRef.current);
              const billsDiff = JSON.stringify(data.bills) !== JSON.stringify(billsRef.current);
              const notesDiff = JSON.stringify(data.notes) !== JSON.stringify(notesRef.current);
              const checklistsDiff = JSON.stringify(data.checklists) !== JSON.stringify(checklistsRef.current);
              const calendarTicksDiff = JSON.stringify(data.calendarTicks) !== JSON.stringify(calendarTicksRef.current);

              if (routineDiff || habitsDiff || billsDiff || notesDiff || checklistsDiff || calendarTicksDiff) {
                if (routineDiff && data.routine) setRoutine(data.routine);
                if (habitsDiff && data.habits) setHabits(data.habits);
                if (billsDiff && data.bills) setBills(data.bills);
                if (notesDiff && data.notes) setNotes(data.notes);
                if (checklistsDiff && data.checklists) setChecklists(data.checklists);
                if (calendarTicksDiff && data.calendarTicks) setCalendarTicks(data.calendarTicks);

                addToast('Dados atualizados de outro dispositivo! 🔄', 'info');
              }
            }
          } else {
            // New user or no data on Firestore yet. Save local copy.
            const payload: any = {
              routine: routineRef.current,
              habits: habitsRef.current,
              bills: billsRef.current,
              notes: notesRef.current,
              checklists: checklistsRef.current,
              calendarTicks: calendarTicksRef.current,
              updatedAt: new Date().toISOString()
            };
            if (accessToken) {
              payload.googleAccessToken = accessToken;
            }
            await setDoc(userDocRef, payload, { merge: true });
            cloudRoutineRef.current = routineRef.current;
            cloudHabitsRef.current = habitsRef.current;
            cloudBillsRef.current = billsRef.current;
            cloudNotesRef.current = notesRef.current;
            cloudChecklistsRef.current = checklistsRef.current;
            cloudCalendarTicksRef.current = calendarTicksRef.current;
            addToast('Seus dados locais foram salvos na nuvem para sincronização! ☁️', 'info');
            hasInitialLoadRef.current = true;
          }
          setFirestoreLoaded(true);
        } catch (error) {
          console.error('Erro na sincronização Firestore:', error);
          addToast('Erro ao sincronizar dados em tempo real.', 'error');
        } finally {
          setSyncingCloud(false);
        }
      },
      (error) => {
        console.error('Erro na subscrição em tempo real:', error);
        setSyncingCloud(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Save to Firestore on state changes (debounced)
  useEffect(() => {
    if (!user || !firestoreLoaded) return;

    // Check if there are any actual differences compared to what we have in cloud
    const hasChanges = 
      (cloudRoutineRef.current === null || JSON.stringify(routine) !== JSON.stringify(cloudRoutineRef.current)) ||
      (cloudHabitsRef.current === null || JSON.stringify(habits) !== JSON.stringify(cloudHabitsRef.current)) ||
      (cloudBillsRef.current === null || JSON.stringify(bills) !== JSON.stringify(cloudBillsRef.current)) ||
      (cloudNotesRef.current === null || JSON.stringify(notes) !== JSON.stringify(cloudNotesRef.current)) ||
      (cloudChecklistsRef.current === null || JSON.stringify(checklists) !== JSON.stringify(cloudChecklistsRef.current)) ||
      (cloudCalendarTicksRef.current === null || JSON.stringify(calendarTicks) !== JSON.stringify(cloudCalendarTicksRef.current));

    if (!hasChanges) return;

    const saveToCloud = async () => {
      setSaveStatus('saving');
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const payload: any = {
          routine,
          habits,
          bills,
          notes,
          checklists,
          calendarTicks,
          updatedAt: new Date().toISOString()
        };
        if (accessToken) {
          payload.googleAccessToken = accessToken;
        }
        await setDoc(userDocRef, payload, { merge: true });
        cloudRoutineRef.current = routine;
        cloudHabitsRef.current = habits;
        cloudBillsRef.current = bills;
        cloudNotesRef.current = notes;
        cloudChecklistsRef.current = checklists;
        cloudCalendarTicksRef.current = calendarTicks;
        setSaveStatus('saved');
      } catch (error) {
        console.error('Erro ao salvar dados no Firestore:', error);
        setSaveStatus('error');
      }
    };

    const timer = setTimeout(() => {
      saveToCloud();
    }, 500);

    return () => clearTimeout(timer);
  }, [routine, habits, bills, notes, checklists, calendarTicks, user, firestoreLoaded, accessToken]);

  // Active tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routine' | 'calendar' | 'notes' | 'bills' | 'habits' | 'checklists'>('dashboard');

  const [quickNoteText, setQuickNoteText] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 4000);
  };

  // Load active google calendar events for dashboard reference
  const [dashEvents, setDashEvents] = useState<GoogleCalendarEvent[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  // Auth initializing & guest mode states
  const [authInitializing, setAuthInitializing] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const unsub = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthInitializing(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthInitializing(false);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        addToast('Sincronização ativada com sucesso! ☁️', 'success');
      }
    } catch (err: any) {
      console.error(err);
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        alert('Erro de Domínio Não Autorizado (auth/unauthorized-domain):\n\nComo você está acessando pelo GitHub Pages, o Firebase bloqueia o login porque este domínio não é pré-autorizado no console do AI Studio.\n\n👉 Solução Simples: Faça o login com o Google uma única vez pelo link compartilhado do AI Studio (Shared App) para salvar sua chave do Google com segurança na nuvem, e depois volte aqui no GitHub Pages! Sua sincronização e agenda funcionarão automaticamente sem precisar de pop-ups.');
      } else if (isIframe) {
        addToast('O login foi bloqueado dentro do iframe. Use o botão "Abrir em Nova Aba" ao lado para conectar com sucesso.', 'error');
      } else {
        addToast('Erro ao conectar com a conta do Google. Verifique os pop-ups.', 'error');
      }
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setGuestMode(false);
      addToast('Sessão encerrada com sucesso.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Erro ao desconectar conta.', 'error');
    }
  };

  // Fetch Google Calendar events specifically for the dashboard if token exists
  useEffect(() => {
    const fetchDashEvents = async () => {
      if (!accessToken) return;
      setDashLoading(true);
      try {
        const rangeMin = new Date();
        rangeMin.setDate(rangeMin.getDate() - 14);
        rangeMin.setHours(0, 0, 0, 0);

        const rangeMax = new Date();
        rangeMax.setDate(rangeMax.getDate() + 21);
        rangeMax.setHours(23, 59, 59, 999);

        const params = new URLSearchParams({
          timeMin: rangeMin.toISOString(),
          timeMax: rangeMax.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        });

        const listRes = await fetch(
          `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (listRes.status === 401) {
          clearGoogleTokenOn401();
          setAccessToken(null);
          return;
        }

        let calendars = [{ id: 'primary', summary: 'Principal' }];
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.items && listData.items.length > 0) {
            const activeCalendars = listData.items.filter((c: any) => c.selected || c.primary);
            if (activeCalendars.length > 0) {
              calendars = activeCalendars.map((c: any) => ({
                id: c.id,
                summary: c.summaryOverride || c.summary,
              }));
            } else {
              calendars = listData.items.map((c: any) => ({
                id: c.id,
                summary: c.summaryOverride || c.summary,
              }));
            }
          }
        }

        const eventPromises = calendars.map(async (cal) => {
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            if (res.ok) {
              const data = await res.json();
              return (data.items || []).map((evt: any) => ({
                ...evt,
                calendarName: cal.summary,
              }));
            }
          } catch (e) {
            console.error(e);
          }
          return [];
        });

        const results = await Promise.all(eventPromises);
        const allEvents = results.flat();

        allEvents.sort((a, b) => {
          const startA = a.start.dateTime || a.start.date || '';
          const startB = b.start.dateTime || b.start.date || '';
          return startA.localeCompare(startB);
        });

        setDashEvents(allEvents);
      } catch (err) {
        console.error('Erro ao buscar eventos do painel:', err);
      } finally {
        setDashLoading(false);
      }
    };

    fetchDashEvents();
  }, [accessToken]);

  // General greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Calculate stats for Dashboard
  const todayDayOfWeek = new Date().getDay();
  const todayRoutine = routine.filter(item => item.dayOfWeek === todayDayOfWeek);
  const todayRoutineCompleted = todayRoutine.filter(i => i.done).length;

  const totalUnpaidBills = bills.filter(b => !b.paid).reduce((acc, b) => acc + b.amount, 0);

  // Format habit completion state for today
  const isHabitDoneToday = (habit: Habit) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return habit.history[todayStr] || false;
  };

  const handleToggleHabitToday = (habitId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          const done = h.history[todayStr] || false;
          addToast(done ? `Hábito "${h.title}" desmarcado` : `Hábito "${h.title}" concluído! 🔥`, done ? 'info' : 'success');
          return {
            ...h,
            history: { ...h.history, [todayStr]: !done },
          };
        }
        return h;
      })
    );
  };

  const handleAddQuickNote = () => {
    if (!quickNoteText.trim()) return;
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Nota Rápida',
      content: quickNoteText.trim(),
      media: [],
      createdAt: new Date().toISOString(),
      tags: ['captura-rapida'],
    };
    setNotes(prev => [newNote, ...prev]);
    setQuickNoteText('');
    addToast('Nota rápida capturada!', 'success');
  };

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] flex flex-col justify-center items-center font-sans text-slate-700 p-4">
        <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600 animate-pulse mb-3 flex items-center justify-center">
          <Brain size={36} />
        </div>
        <p className="text-sm font-bold text-slate-800">Iniciando Meu Segundo Cérebro...</p>
        <p className="text-xs text-slate-400 mt-1">Carregando dados com segurança</p>
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <LoginScreen
        onLoginSuccess={(u, token) => {
          setUser(u);
          setAccessToken(token);
        }}
        onContinueOffline={() => setGuestMode(true)}
        addToast={addToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F6] text-slate-800 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Premium Header */}
      <header className="py-4 md:py-6 px-4 md:px-12 max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 underline decoration-indigo-500 decoration-4 underline-offset-4 flex items-center gap-2">
              <Brain size={24} className="text-indigo-600 shrink-0" />
              Meu Segundo Cérebro
            </h1>
            <p className="text-slate-500 text-sm capitalize mt-1">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2 max-w-full">
              <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                !user 
                  ? 'bg-amber-500' 
                  : syncingCloud 
                  ? 'bg-blue-500' 
                  : saveStatus === 'saving' 
                  ? 'bg-indigo-500' 
                  : saveStatus === 'error' 
                  ? 'bg-red-500' 
                  : 'bg-green-500'
              }`} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">
                {!user ? (
                  <>
                    <span className="hidden sm:inline">Modo Offline - Salvo Local</span>
                    <span className="inline sm:hidden">Offline (Local)</span>
                  </>
                ) : syncingCloud ? (
                  <>
                    <span className="hidden sm:inline">Sincronizando Nuvem...</span>
                    <span className="inline sm:hidden">Sincronizando...</span>
                  </>
                ) : saveStatus === 'saving' ? (
                  <>
                    <span className="hidden sm:inline">Salvando alterações...</span>
                    <span className="inline sm:hidden">Salvando...</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <span className="hidden sm:inline">Erro na sincronização cloud</span>
                    <span className="inline sm:hidden">Erro Sync</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Sincronizado com Nuvem</span>
                    <span className="inline sm:hidden">Sincronizado</span>
                  </>
                )}
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-2 shrink-0 bg-white border border-slate-200 rounded-full py-1 pl-1 pr-3 shadow-xs">
                <img
                  src={user.photoURL || undefined}
                  alt={user.displayName || 'Google Account'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    {user.displayName?.split(' ')[0]}
                  </span>
                  <button
                    onClick={handleGoogleLogout}
                    className="text-[9px] font-semibold text-slate-400 hover:text-red-500 text-left leading-none transition cursor-pointer"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm transition cursor-pointer shrink-0"
                title="Sincronizar com Conta Google"
              >
                <span>Sincronizar Google ☁️</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Navigation (Tabs) */}
      <nav className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-sm max-w-7xl mx-4 md:mx-auto mb-6 flex gap-1.5 overflow-x-auto scrollbar-none sticky top-4 z-30">
        <div className="flex gap-1.5">
          {([
            { id: 'dashboard', label: 'Painel Geral', shortLabel: 'Painel', icon: Sparkles },
            { id: 'routine', label: 'Rotina Semanal', shortLabel: 'Rotina', icon: Clock },
            { id: 'calendar', label: 'Google Agenda', shortLabel: 'Agenda', icon: CalendarIcon },
            { id: 'notes', label: 'Notas & Anexos', shortLabel: 'Notas', icon: FileText },
            { id: 'bills', label: 'Contas a Pagar', shortLabel: 'Contas', icon: CreditCard },
            { id: 'habits', label: 'Hábitos & Devocionais', shortLabel: 'Hábitos', icon: Flame },
            { id: 'checklists', label: 'Checklists', shortLabel: 'Checklists', icon: ListTodo },
          ] as const).map(tab => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 relative cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-indigo-200' : 'text-slate-400'} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Application Content Panels */}
      <main className="flex-1 p-4 md:p-12 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Cloud Sync Welcome Banner / Control Card */}
                <div className={`p-6 rounded-3xl border transition-all shadow-xs ${
                  user 
                    ? 'bg-white border-slate-200' 
                    : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${
                        user ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <Brain size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-bold text-slate-900 text-sm">
                            Sincronização Multi-Dispositivo
                          </h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            user ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800 animate-pulse'
                          }`}>
                            {user ? '☁️ Sincronizado com Nuvem' : '⚠️ Apenas Local (Offline)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                          {user ? (
                            <>
                              Conectado como <strong className="text-slate-800">{user.displayName}</strong> ({user.email}).
                            </>
                          ) : (
                            <>
                              Seus dados estão salvos <strong>apenas localmente</strong> neste navegador. Para que tudo sincronize e apareça no seu celular, tablet ou em outro computador em tempo real, conecte sua conta do Google abaixo.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
                      {user ? (
                        <>
                          <button
                            onClick={async () => {
                              setSaveStatus('saving');
                              try {
                                const userDocRef = doc(db, 'users', user.uid);
                                await setDoc(userDocRef, {
                                  routine,
                                  habits,
                                  bills,
                                  notes,
                                  checklists,
                                  calendarTicks,
                                  updatedAt: new Date().toISOString()
                                });
                                setSaveStatus('saved');
                                addToast('Nuvem atualizada com sucesso! ☁️', 'success');
                              } catch (e) {
                                console.error(e);
                                setSaveStatus('error');
                                addToast('Erro ao sincronizar manualmente.', 'error');
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Forçar Envio Manual 🔄</span>
                          </button>
                          <button
                            onClick={handleGoogleLogout}
                            className="border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            Desconectar Conta
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {typeof window !== 'undefined' && window.self !== window.top && (
                            <button
                              onClick={() => window.open(window.location.href, '_blank')}
                              className="border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 bg-white"
                            >
                              Abrir em Nova Aba ↗
                            </button>
                          )}
                          <button
                            onClick={handleGoogleSignIn}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-2 justify-center"
                          >
                            Conectar Conta Google ☁️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visão Semanal Combinada */}
                <WeeklyOverview
                  events={dashEvents}
                  dashLoading={dashLoading}
                  routine={routine}
                  setRoutine={setRoutine}
                  bills={bills}
                  setBills={setBills}
                  habits={habits}
                  setHabits={setHabits}
                  calendarTicks={calendarTicks}
                  setCalendarTicks={setCalendarTicks}
                  addToast={addToast}
                  accessToken={accessToken}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-stretch">
                  
                  {/* Card 1: Google Agenda Events */}
                  <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[350px]">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-indigo-955 text-base">
                          <CalendarIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                          Eventos do Dia
                        </h3>
                        <span className="text-[10px] bg-indigo-50 px-2.5 py-1 rounded-full text-indigo-600 font-bold uppercase tracking-wider">
                          Agenda
                        </span>
                      </div>

                      <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                        {!accessToken ? (
                          <div className="text-center py-10 text-xs text-slate-400 font-medium">
                            Conecte sua conta Google Agenda para sincronizar seus compromissos.
                            <button
                              onClick={() => setActiveTab('calendar')}
                              className="block mx-auto mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-3 py-1.5 rounded-xl transition text-[10px]"
                            >
                              Conectar Agora
                            </button>
                          </div>
                        ) : dashLoading ? (
                          <div className="text-center py-12 text-xs text-slate-400 font-mono animate-pulse">
                            Carregando eventos...
                          </div>
                        ) : dashEvents.length === 0 ? (
                          <div className="text-center py-12 text-xs text-slate-400 italic">
                            Nenhum evento agendado para hoje.
                          </div>
                        ) : (
                          dashEvents.map(event => {
                            const dateStr = event.start.date || (event.start.dateTime ? (() => {
                              const d = new Date(event.start.dateTime);
                              const year = d.getFullYear();
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(d.getDate()).padStart(2, '0');
                              return `${year}-${month}-${day}`;
                            })() : '');
                            const isChecked = calendarTicks.some(t => t.eventId === event.id && t.dateStr === dateStr && t.done);

                            return (
                              <div
                                key={event.id}
                                className={`flex items-center gap-3 p-3 transition rounded-xl border ${
                                  isChecked
                                    ? 'bg-slate-50 opacity-60 border-l-4 border-indigo-500 border-y-slate-200 border-r-slate-200'
                                    : 'bg-white border-slate-100 hover:bg-slate-50/50 shadow-xs'
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    setCalendarTicks(prev => {
                                      const existingIdx = prev.findIndex(t => t.eventId === event.id && t.dateStr === dateStr);
                                      if (existingIdx > -1) {
                                        const copy = [...prev];
                                        const done = !copy[existingIdx].done;
                                        addToast(done ? `Evento "${event.summary}" concluído! ✓` : `Evento "${event.summary}" desmarcado`, done ? 'success' : 'info');
                                        copy[existingIdx] = { ...copy[existingIdx], done };
                                        return copy;
                                      } else {
                                        addToast(`Evento "${event.summary}" concluído! ✓`, 'success');
                                        return [...prev, { eventId: event.id, dateStr, done: true }];
                                      }
                                    });
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                >
                                  {isChecked ? (
                                    <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                                  ) : (
                                    <Circle size={16} />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-semibold ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {event.summary}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    {event.start.dateTime && (
                                      <span className="font-mono text-[9px] text-indigo-500 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded-xs">
                                        {new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                    {event.calendarName && (
                                      <span className="font-sans text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                                        {event.calendarName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition self-start"
                    >
                      Acessar Agenda Completa <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Card 2: Captura Rápida (Quick Notes) */}
                  <div className="col-span-12 md:col-span-5 bg-indigo-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-indigo-200 text-base">
                          <FileText className="w-5 h-5 text-indigo-300 shrink-0" />
                          Captura Rápida
                        </h3>
                        <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-indigo-200 font-bold uppercase tracking-wider">
                          Segundo Cérebro
                        </span>
                      </div>

                      {/* Display most recent notes */}
                      <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1 mb-4">
                        {notes.filter(n => n.tags?.includes('captura-rapida')).slice(0, 2).map(note => (
                          <div key={note.id} className="bg-white/10 p-3 rounded-xl border border-white/10">
                            <p className="text-xs font-semibold text-indigo-200">{note.title}</p>
                            <p className="text-xs italic text-indigo-100 mt-0.5 line-clamp-2">"{note.content}"</p>
                          </div>
                        ))}
                        {notes.filter(n => n.tags?.includes('captura-rapida')).length === 0 && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                            <p className="text-xs text-indigo-200/80 italic">Nenhum pensamento capturado hoje.</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Media References */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="bg-white/15 px-2.5 py-1 rounded-full text-[10px] border border-white/10 text-indigo-100">📎 links.txt</span>
                        <span className="bg-white/15 px-2.5 py-1 rounded-full text-[10px] border border-white/10 text-indigo-100">🎥 ref_video.mp4</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Escreva uma ideia ou link..."
                          value={quickNoteText}
                          onChange={e => setQuickNoteText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddQuickNote(); }}
                          className="w-full bg-white/10 text-white placeholder-indigo-300 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                          onClick={handleAddQuickNote}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 rounded-xl text-xs transition cursor-pointer shrink-0"
                        >
                          Capturar
                        </button>
                      </div>
                      <button
                        onClick={() => setActiveTab('notes')}
                        className="text-xs text-indigo-200 hover:text-white font-semibold flex items-center gap-1 transition"
                      >
                        Navegar para Notas <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Hábitos & Rotina */}
                  <div className="col-span-12 md:col-span-3 bg-emerald-50 rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col justify-between min-h-[350px]">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-1.5 text-emerald-950 text-sm">
                          <Flame className="w-5 h-5 text-emerald-600 shrink-0" />
                          Hábitos & Rotina
                        </h3>
                        <button
                          onClick={() => setActiveTab('habits')}
                          className="text-[10px] text-emerald-700 hover:underline font-bold"
                        >
                          Gerenciar
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Daily Habits tracker block */}
                        <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-700 mb-2 uppercase tracking-wide">Hoje</p>
                          <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                            {habits.slice(0, 3).map(habit => {
                              const done = isHabitDoneToday(habit);
                              return (
                                <div key={habit.id} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-700 truncate max-w-[130px] font-medium">{habit.title}</span>
                                  <button
                                    onClick={() => handleToggleHabitToday(habit.id)}
                                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition cursor-pointer ${
                                      done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                                    }`}
                                  >
                                    {done && <Check size={10} className="stroke-[3]" />}
                                  </button>
                                </div>
                              );
                            })}
                            {habits.length === 0 && (
                              <p className="text-[11px] text-slate-400 italic">Nenhum hábito diário.</p>
                            )}
                          </div>
                        </div>

                        {/* Novena progress */}
                        {(() => {
                          const novenaHabit = habits.find(h => h.frequency === 'novena');
                          if (novenaHabit) {
                            const startDay = novenaHabit.novenaStartDay || 9;
                            const repeatMonthly = novenaHabit.novenaRepeatMonthly ?? true;
                            
                            const completedDays = Array.from({ length: 9 }, (_, i) => i + 1).filter(day => {
                              if (repeatMonthly) {
                                const now = new Date();
                                const dayNum = startDay + (day - 1);
                                const year = now.getFullYear();
                                const month = String(now.getMonth() + 1).padStart(2, '0');
                                const dayStr = String(dayNum).padStart(2, '0');
                                const dateKey = `${year}-${month}-${dayStr}`;
                                return novenaHabit.history[dateKey];
                              } else {
                                const startDate = new Date((novenaHabit.novenaStart || novenaHabit.createdAt.split('T')[0]) + 'T00:00:00');
                                startDate.setDate(startDate.getDate() + (day - 1));
                                const dateKey = startDate.toISOString().split('T')[0];
                                return novenaHabit.history[dateKey];
                              }
                            }).length;

                            return (
                              <div className="p-3 bg-white rounded-2xl shadow-xs border border-emerald-100">
                                <p className="text-[10px] font-bold text-indigo-600 mb-1 uppercase tracking-wide">
                                  {repeatMonthly ? 'Novena Mensal' : 'Novena Ativa'}
                                </p>
                                <p className="text-[11px] font-bold text-slate-700 truncate">{novenaHabit.title}</p>
                                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500 font-mono">
                                  <span>Dia {completedDays}/9</span>
                                  <span>{Math.round((completedDays / 9) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${(completedDays / 9) * 100}%` }}></div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Agenda Semanal</p>
                      <ul className="text-xs space-y-1 text-slate-600">
                        {todayRoutine.slice(0, 2).map(item => (
                          <li key={item.id} className="flex items-center gap-1.5 truncate text-[11px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.done ? 'bg-slate-300' : 'bg-indigo-600'}`} />
                            <span className={`truncate ${item.done ? 'line-through text-slate-400' : 'font-semibold text-indigo-700'}`}>
                              {item.time}{item.endTime ? `-${item.endTime}` : ''} - {item.title}
                            </span>
                          </li>
                        ))}
                        {todayRoutine.length === 0 && (
                          <li className="text-[11px] text-slate-400 italic">Sem tarefas agendadas hoje.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Card 4: Contas a Pagar (Finances) */}
                  <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold flex items-center gap-2 text-rose-950 text-base">
                          <CreditCard className="w-5 h-5 text-rose-600 shrink-0" />
                          Contas a Pagar
                        </h3>
                        <button
                          onClick={() => setActiveTab('bills')}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5"
                        >
                          Finanças <ChevronRight size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = today.toISOString().split('T')[0];
                          
                          const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                          const unpaid = unpaidBills[0];
                          const paid = bills.filter(b => b.paid)[0];

                          let isOverdue = false;
                          let isYesterday = false;
                          let dateLabel = '';

                          if (unpaid) {
                            isOverdue = unpaid.dueDate < todayStr;
                            
                            const yesterday = new Date(today);
                            yesterday.setDate(today.getDate() - 1);
                            const yesterdayStr = yesterday.toISOString().split('T')[0];
                            isYesterday = unpaid.dueDate === yesterdayStr;

                            const dueDateObj = new Date(unpaid.dueDate + 'T00:00:00');
                            dateLabel = isYesterday 
                              ? 'Venceu ontem!' 
                              : isOverdue 
                              ? `Venceu em ${dueDateObj.toLocaleDateString('pt-BR')}`
                              : `Vence ${dueDateObj.toLocaleDateString('pt-BR')}`;
                          }

                          return (
                            <>
                              {unpaid ? (
                                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                                  isOverdue 
                                    ? 'bg-red-50 border-red-200 text-red-900 animate-pulse' 
                                    : 'bg-rose-50 border-rose-100 text-slate-800'
                                }`}>
                                  <div>
                                    <p className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                      isOverdue ? 'text-red-600' : 'text-rose-500'
                                    }`}>
                                      {isOverdue ? '⚠️ Atrasada!' : 'Vence em breve'}
                                    </p>
                                    <p className="text-xs font-bold truncate mt-1">{unpaid.title}</p>
                                  </div>
                                  <p className={`text-xs font-bold mt-2 ${
                                    isOverdue ? 'text-red-600' : 'text-rose-600'
                                  }`}>
                                    {dateLabel}
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tudo em dia</p>
                                  <p className="text-xs text-emerald-600 font-bold mt-1">Sem contas pendentes! 🎉</p>
                                </div>
                              )}

                              {paid ? (
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grayscale flex flex-col justify-between opacity-75">
                                  <div>
                                    <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Pago recente</p>
                                    <p className="text-xs font-semibold text-slate-600 truncate mt-1">{paid.title}</p>
                                  </div>
                                  <p className="text-xs font-bold text-emerald-600 mt-2">
                                    Pago! ✓
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 grayscale flex flex-col justify-center items-center text-center opacity-70">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sem histórico</p>
                                  <p className="text-xs text-slate-400 mt-1">Nenhum pagamento registrado</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-semibold">
                      <span>Contas pendentes</span>
                      <span className="font-mono text-rose-600 font-bold">
                        {bills.filter(b => !b.paid).length} pendente(s)
                      </span>
                    </div>
                  </div>

                  {/* Card 5: Checklists */}
                  {(() => {
                    const activeList = checklists[0];
                    if (!activeList) {
                      return (
                        <div className="col-span-12 md:col-span-4 bg-slate-800 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-center items-center text-center min-h-[220px]">
                          <p className="text-sm font-semibold text-slate-400">Nenhum checklist disponível</p>
                          <button
                            onClick={() => setActiveTab('checklists')}
                            className="text-xs text-indigo-400 hover:underline mt-2 font-bold"
                          >
                            Criar Novo Checklist
                          </button>
                        </div>
                      );
                    }

                    const linkedEventItem = activeList.items.find(item => item.linkedTo);

                    return (
                      <div className="col-span-12 md:col-span-4 bg-slate-800 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between min-h-[220px]">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold flex items-center gap-2 truncate text-base text-white">
                              <ListTodo className="w-5 h-5 text-indigo-400 shrink-0" />
                              Checklist: {activeList.title}
                            </h3>
                            <button
                              onClick={() => setActiveTab('checklists')}
                              className="text-xs text-indigo-400 hover:underline shrink-0 font-bold"
                            >
                              Ver todos
                            </button>
                          </div>
                          
                          <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                            {activeList.items.slice(0, 3).map(item => (
                              <div key={item.id} className="flex items-center gap-2.5 text-xs">
                                <span className={`w-4 h-4 rounded border border-white/30 flex items-center justify-center text-[9px] font-bold ${item.done ? 'bg-indigo-500 border-indigo-500' : ''}`}>
                                  {item.done ? '✓' : ''}
                                </span>
                                <span className={item.done ? 'line-through opacity-60' : ''}>{item.text}</span>
                              </div>
                            ))}
                            {activeList.items.length === 0 && (
                              <p className="text-xs text-slate-400 italic">Este checklist não possui itens.</p>
                            )}
                          </div>
                        </div>

                        {linkedEventItem?.linkedTo && (
                          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-indigo-300 bg-white/5 p-1.5 px-2.5 rounded-lg w-fit truncate max-w-full">
                            <CalendarIcon size={11} className="text-indigo-400 shrink-0" />
                            <span className="truncate">Vinculado a: {linkedEventItem.linkedTo.title}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Card 6: Lembretes Diários */}
                  <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold flex items-center gap-2 text-indigo-950 text-sm">
                          <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                          Lembretes Diários
                        </h3>
                        <span className={`text-[9.5px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          remindersEnabled && notificationPermission === 'granted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {remindersEnabled && notificationPermission === 'granted' ? 'Ativos 🔔' : 'Inativos 🔕'}
                        </span>
                      </div>

                      <div className="space-y-3 mt-2">
                        {notificationPermission !== 'granted' ? (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 leading-normal">
                              Ative as notificações do navegador para receber os lembretes diários.
                            </p>
                            <button
                              onClick={requestNotificationPermission}
                              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-xl transition cursor-pointer"
                            >
                              Autorizar Navegador 🔔
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">Ativar Lembretes</span>
                              <button
                                onClick={() => {
                                  setRemindersEnabled(prev => {
                                    const next = !prev;
                                    addToast(next ? 'Lembretes agendados ativos! 🔔' : 'Lembretes desativados.', next ? 'success' : 'info');
                                    return next;
                                  });
                                }}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                  remindersEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                }`}
                              >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                  remindersEnabled ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>

                            {remindersEnabled && (
                              <div className="space-y-2 pt-1 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      id="morning-enabled"
                                      checked={reminderMorningEnabled}
                                      onChange={(e) => setReminderMorningEnabled(e.target.checked)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                                    />
                                    <label htmlFor="morning-enabled" className="text-[10px] font-medium text-slate-600 truncate cursor-pointer">
                                      Planejar Dia (Manhã)
                                    </label>
                                  </div>
                                  <input
                                    type="time"
                                    value={reminderMorningTime}
                                    onChange={(e) => setReminderMorningTime(e.target.value)}
                                    className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono w-16 bg-slate-50 cursor-pointer"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      id="evening-enabled"
                                      checked={reminderEveningEnabled}
                                      onChange={(e) => setReminderEveningEnabled(e.target.checked)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                                    />
                                    <label htmlFor="evening-enabled" className="text-[10px] font-medium text-slate-600 truncate cursor-pointer">
                                      Revisar Dia (Noite)
                                    </label>
                                  </div>
                                  <input
                                    type="time"
                                    value={reminderEveningTime}
                                    onChange={(e) => setReminderEveningTime(e.target.value)}
                                    className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono w-16 bg-slate-50 cursor-pointer"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[9px] text-slate-400">
                      <div className="flex justify-between font-semibold">
                        <span>Lembrete automático</span>
                        <span>Web Push API</span>
                      </div>
                      <p className="text-[8px] leading-tight text-slate-400/80">
                        * Mantenha o app aberto para disparar o alarme na hora exata.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'routine' && (
              <RoutineSection routine={routine} setRoutine={setRoutine} addToast={addToast} />
            )}

            {activeTab === 'calendar' && (
              <CalendarSection
                user={user}
                setUser={setUser}
                accessToken={accessToken}
                setAccessToken={setAccessToken}
                calendarTicks={calendarTicks}
                setCalendarTicks={setCalendarTicks}
                addToast={addToast}
              />
            )}

            {activeTab === 'notes' && (
              <NotesSection
                notes={notes}
                setNotes={setNotes}
                routine={routine}
                calendarEvents={dashEvents}
                addToast={addToast}
              />
            )}

            {activeTab === 'bills' && (
              <BillsSection bills={bills} setBills={setBills} addToast={addToast} />
            )}

            {activeTab === 'habits' && (
              <HabitsSection habits={habits} setHabits={setHabits} addToast={addToast} />
            )}

            {activeTab === 'checklists' && (
              <ChecklistsSection
                checklists={checklists}
                setChecklists={setChecklists}
                routine={routine}
                calendarEvents={dashEvents}
                addToast={addToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Aesthetic Footer */}
      <footer className="py-8 bg-neutral-50 border-t border-neutral-200/60 text-center text-xs text-neutral-400 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-medium">Segundo Cérebro © {new Date().getFullYear()} — Feito para maximizar sua clareza mental</p>
          <p className="font-mono text-[10px]">Criação e Persistência de Dados Offline • Integração Google</p>
        </div>
      </footer>

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92, transition: { duration: 0.15 } }}
              className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 bg-white/95 backdrop-blur-md pointer-events-auto ${
                toast.type === 'success' ? 'border-emerald-100 shadow-emerald-100/30' :
                toast.type === 'error' ? 'border-rose-100 shadow-rose-100/30' : 'border-indigo-100 shadow-indigo-100/30'
              }`}
            >
              <span className={`p-2 rounded-xl shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {toast.type === 'success' && <Check size={14} className="stroke-[3]" />}
                {toast.type === 'error' && <AlertTriangle size={14} />}
                {toast.type === 'info' && <Sparkles size={14} />}
              </span>
              <p className="text-xs font-semibold text-slate-800 flex-1 leading-snug">{toast.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
