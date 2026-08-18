import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { initAuth, db, googleSignIn, logout, clearGoogleTokenOn401, setCachedAccessToken } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { RoutineItem, Note, Bill, Habit, Checklist, CalendarTickState, GoogleCalendarEvent, StickyNote } from './types';
import {
  SAMPLE_ROUTINE,
  SAMPLE_HABITS,
  SAMPLE_BILLS,
  SAMPLE_NOTES,
  SAMPLE_CHECKLISTS,
  SAMPLE_STICKY_NOTES,
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
  LayoutDashboard,
  BookOpen,
  StickyNote as StickyNoteIcon,
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
import StickyNotesBoard from './components/StickyNotesBoard';
import TodaySummaryAndNotifications from './components/TodaySummaryAndNotifications';
import NotesAndListsSection from './components/NotesAndListsSection';

// Helper functions to merge local and cloud states on login/first load
const mergeStickyNotes = (local: StickyNote[], cloud: StickyNote[]): StickyNote[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const exists = merged.some(cloudItem => cloudItem && cloudItem.id === localItem.id);
    if (!exists) {
      merged.push(localItem);
    }
  });
  return merged;
};
const mergeRoutines = (local: RoutineItem[], cloud: RoutineItem[]): RoutineItem[] => {
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  const safeLocal = Array.isArray(local) ? local : [];
  const merged = [...safeCloud];
  safeLocal.forEach(localItem => {
    if (!localItem) return;
    const cloudIndex = merged.findIndex(cloudItem => 
      cloudItem && (cloudItem.id === localItem.id || 
      (cloudItem.dayOfWeek === localItem.dayOfWeek && cloudItem.title === localItem.title && cloudItem.time === localItem.time))
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
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() =>
    getLocalStorageData('brain_sticky_notes', SAMPLE_STICKY_NOTES)
  );
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
  const [customEvents, setCustomEvents] = useState<GoogleCalendarEvent[]>(() =>
    getLocalStorageData('brain_custom_events', [])
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
    setLocalStorageData('brain_sticky_notes', stickyNotes);
  }, [stickyNotes]);

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

  useEffect(() => {
    setLocalStorageData('brain_custom_events', customEvents);
  }, [customEvents]);

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
  const stickyNotesRef = useRef(stickyNotes);
  const routineRef = useRef(routine);
  const habitsRef = useRef(habits);
  const billsRef = useRef(bills);
  const notesRef = useRef(notes);
  const checklistsRef = useRef(checklists);
  const calendarTicksRef = useRef(calendarTicks);
  const hasInitialLoadRef = useRef(false);

  // Firestore comparison refs to prevent write-back loops and race conditions
  const cloudStickyNotesRef = useRef<StickyNote[] | null>(null);
  const cloudRoutineRef = useRef<RoutineItem[] | null>(null);
  const cloudHabitsRef = useRef<Habit[] | null>(null);
  const cloudBillsRef = useRef<Bill[] | null>(null);
  const cloudNotesRef = useRef<Note[] | null>(null);
  const cloudChecklistsRef = useRef<Checklist[] | null>(null);
  const cloudCalendarTicksRef = useRef<CalendarTickState[] | null>(null);

  // Update refs on state changes
  useEffect(() => { stickyNotesRef.current = stickyNotes; }, [stickyNotes]);
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
      cloudStickyNotesRef.current = null;
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
              const mergedStickyNotes = mergeStickyNotes(stickyNotesRef.current, data.stickyNotes || []);
              const mergedRoutine = mergeRoutines(routineRef.current, data.routine || []);
              const mergedHabits = mergeHabits(habitsRef.current, data.habits || []);
              const mergedBills = mergeBills(billsRef.current, data.bills || []);
              const mergedNotes = mergeNotes(notesRef.current, data.notes || []);
              const mergedChecklists = mergeChecklists(checklistsRef.current, data.checklists || []);
              const mergedCalendarTicks = mergeCalendarTicks(calendarTicksRef.current, data.calendarTicks || []);

              // Set the cloud references so we know what is already in the database
              cloudStickyNotesRef.current = data.stickyNotes || [];
              cloudRoutineRef.current = data.routine || [];
              cloudHabitsRef.current = data.habits || [];
              cloudBillsRef.current = data.bills || [];
              cloudNotesRef.current = data.notes || [];
              cloudChecklistsRef.current = data.checklists || [];
              cloudCalendarTicksRef.current = data.calendarTicks || [];

              // Update state with the merged result
              setStickyNotes(mergedStickyNotes);
              setRoutine(mergedRoutine);
              setHabits(mergedHabits);
              setBills(mergedBills);
              setNotes(mergedNotes);
              setChecklists(mergedChecklists);
              setCalendarTicks(mergedCalendarTicks);

              // Detect if local storage had any new/un-synced changes
              const hadLocalAdditions = 
                JSON.stringify(mergedStickyNotes) !== JSON.stringify(data.stickyNotes) ||
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
              cloudStickyNotesRef.current = data.stickyNotes || [];
              cloudRoutineRef.current = data.routine || [];
              cloudHabitsRef.current = data.habits || [];
              cloudBillsRef.current = data.bills || [];
              cloudNotesRef.current = data.notes || [];
              cloudChecklistsRef.current = data.checklists || [];
              cloudCalendarTicksRef.current = data.calendarTicks || [];

              const stickyDiff = JSON.stringify(data.stickyNotes) !== JSON.stringify(stickyNotesRef.current);
              const routineDiff = JSON.stringify(data.routine) !== JSON.stringify(routineRef.current);
              const habitsDiff = JSON.stringify(data.habits) !== JSON.stringify(habitsRef.current);
              const billsDiff = JSON.stringify(data.bills) !== JSON.stringify(billsRef.current);
              const notesDiff = JSON.stringify(data.notes) !== JSON.stringify(notesRef.current);
              const checklistsDiff = JSON.stringify(data.checklists) !== JSON.stringify(checklistsRef.current);
              const calendarTicksDiff = JSON.stringify(data.calendarTicks) !== JSON.stringify(calendarTicksRef.current);

              if (stickyDiff || routineDiff || habitsDiff || billsDiff || notesDiff || checklistsDiff || calendarTicksDiff) {
                if (stickyDiff && data.stickyNotes) setStickyNotes(data.stickyNotes);
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
              stickyNotes: stickyNotesRef.current,
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
            cloudStickyNotesRef.current = stickyNotesRef.current;
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
      (cloudStickyNotesRef.current === null || JSON.stringify(stickyNotes) !== JSON.stringify(cloudStickyNotesRef.current)) ||
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
          stickyNotes,
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
        cloudStickyNotesRef.current = stickyNotes;
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
  }, [stickyNotes, routine, habits, bills, notes, checklists, calendarTicks, user, firestoreLoaded, accessToken]);

  // Active tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'unified' | 'routine' | 'habits' | 'bills' | 'notes_lists' | 'calendar'>('dashboard');

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
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRoutine = routine.filter(item => item.dayOfWeek === todayDayOfWeek);
  const todayRoutineCompleted = todayRoutine.filter(i => i.history?.[todayDateStr] ?? false).length;

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

      {/* Main Workspace Navigation (Top Desktop/Tablet Bar) */}
      <nav className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-xs max-w-7xl mx-3 md:mx-auto mb-4 md:mb-6 flex gap-1.5 overflow-x-auto scrollbar-none sticky top-2 sm:top-4 z-30">
        <div className="flex gap-1.5 min-w-full sm:min-w-0">
          {([
            { id: 'dashboard', label: 'Início & Post-its', shortLabel: 'Início', icon: Sparkles },
            { id: 'unified', label: 'Visão Unificada', shortLabel: 'Unificada', icon: LayoutDashboard },
            { id: 'routine', label: 'Rotina Semanal', shortLabel: 'Rotina', icon: Clock },
            { id: 'habits', label: 'Hábitos & Desafios', shortLabel: 'Hábitos', icon: Flame },
            { id: 'bills', label: 'Contas a Pagar', shortLabel: 'Contas', icon: CreditCard },
            { id: 'notes_lists', label: 'Notas & Listas', shortLabel: 'Notas/Listas', icon: BookOpen },
            { id: 'calendar', label: 'Google Agenda', shortLabel: 'Agenda', icon: CalendarIcon },
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

      {/* Fixed Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-1 py-1.5 shadow-lg flex justify-around items-center">
        {([
          { id: 'dashboard', label: 'Início', icon: Sparkles },
          { id: 'unified', label: 'Unificada', icon: LayoutDashboard },
          { id: 'notes_lists', label: 'Notas/Listas', icon: BookOpen },
          { id: 'routine', label: 'Rotina', icon: Clock },
          { id: 'habits', label: 'Hábitos', icon: Flame },
          { id: 'bills', label: 'Contas', icon: CreditCard },
          { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
        ] as const).map(tab => {
          const isSelected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer min-w-[45px] ${
                isSelected
                  ? 'text-indigo-600 font-bold bg-indigo-50/80'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon size={18} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
              <span className="text-[9.5px] leading-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Application Content Panels */}
      <main className="flex-1 px-3 sm:px-6 md:px-12 py-3 sm:py-6 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
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

                {/* Quadro de Post-its Rápidos (Anotações Rápidas e Simples) */}
                <StickyNotesBoard
                  stickyNotes={stickyNotes}
                  setStickyNotes={setStickyNotes}
                  addToast={addToast}
                />

                {/* Resumo do Dia & Notificações de Eventos */}
                <TodaySummaryAndNotifications
                  dashEvents={dashEvents}
                  customEvents={customEvents}
                  dashLoading={dashLoading}
                  routine={routine}
                  setRoutine={setRoutine}
                  habits={habits}
                  setHabits={setHabits}
                  bills={bills}
                  calendarTicks={calendarTicks}
                  setCalendarTicks={setCalendarTicks}
                  accessToken={accessToken}
                  remindersEnabled={remindersEnabled}
                  setRemindersEnabled={setRemindersEnabled}
                  notificationPermission={notificationPermission as any}
                  requestNotificationPermission={requestNotificationPermission}
                  reminderMorningEnabled={reminderMorningEnabled}
                  setReminderMorningEnabled={setReminderMorningEnabled}
                  reminderMorningTime={reminderMorningTime}
                  setReminderMorningTime={setReminderMorningTime}
                  reminderEveningEnabled={reminderEveningEnabled}
                  setReminderEveningEnabled={setReminderEveningEnabled}
                  reminderEveningTime={reminderEveningTime}
                  setReminderEveningTime={setReminderEveningTime}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  addToast={addToast}
                />
              </div>
            )}

            {activeTab === 'unified' && (
              <WeeklyOverview
                events={dashEvents}
                customEvents={customEvents}
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
            )}

            {activeTab === 'routine' && (
              <RoutineSection routine={routine} setRoutine={setRoutine} addToast={addToast} />
            )}

            {activeTab === 'habits' && (
              <HabitsSection habits={habits} setHabits={setHabits} addToast={addToast} />
            )}

            {activeTab === 'bills' && (
              <BillsSection bills={bills} setBills={setBills} addToast={addToast} />
            )}

            {activeTab === 'notes_lists' && (
              <NotesAndListsSection
                notes={notes}
                setNotes={setNotes}
                checklists={checklists}
                setChecklists={setChecklists}
                routine={routine}
                calendarEvents={dashEvents}
                addToast={addToast}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarSection
                user={user}
                setUser={setUser}
                accessToken={accessToken}
                setAccessToken={setAccessToken}
                calendarTicks={calendarTicks}
                setCalendarTicks={setCalendarTicks}
                customEvents={customEvents}
                setCustomEvents={setCustomEvents}
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
      <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
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
