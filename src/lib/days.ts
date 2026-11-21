import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ItemStatus } from './types';

// Marcações dos eventos do Google Agenda, um documento por dia: users/{uid}/days/{YYYY-MM-DD}

export const eventKey = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300);

export function useDayMarks(uid: string, date: string) {
  const [marks, setMarks] = useState<Record<string, ItemStatus>>({});
  useEffect(() => {
    setMarks({});
    return onSnapshot(
      doc(db, 'users', uid, 'days', date),
      snap => setMarks((snap.data()?.events as Record<string, ItemStatus>) || {}),
      err => console.error(err),
    );
  }, [uid, date]);
  return marks;
}

export const setEventMark = (uid: string, date: string, eventId: string, status: ItemStatus | null) => {
  setDoc(
    doc(db, 'users', uid, 'days', date),
    { events: { [eventKey(eventId)]: status ?? deleteField() } },
    { merge: true },
  ).catch(console.error);
};
