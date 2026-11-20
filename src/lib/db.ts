import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { nowIso } from './dates';

export type CollectionName = 'tasks' | 'notes' | 'routines';

type Listener = (msg: string) => void;
let errorListener: Listener | null = null;
export const onDbError = (fn: Listener) => {
  errorListener = fn;
};
const report = (e: unknown) => {
  console.error(e);
  errorListener?.('Não foi possível salvar. Verifique a conexão.');
};

export function useCollection<T extends { id: string }>(uid: string | null, name: CollectionName) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fromCache, setFromCache] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoaded(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'users', uid, name),
      { includeMetadataChanges: true },
      snap => {
        setItems(snap.docs.map(d => ({ ...(d.data() as T), id: d.id })));
        setFromCache(snap.metadata.fromCache);
        setLoaded(true);
      },
      err => {
        console.error(err);
        setLoaded(true);
        errorListener?.('Sem permissão para ler os dados. Veja as regras do Firestore.');
      },
    );
    return unsub;
  }, [uid, name]);

  return { items, loaded, fromCache };
}

/** Grava o item inteiro. Não espera o servidor: com o cache offline a escrita já vale na hora. */
export const saveItem = <T extends { id: string }>(uid: string, name: CollectionName, item: T) => {
  const data = { ...item, updatedAt: nowIso() } as any;
  delete data.id;
  setDoc(doc(db, 'users', uid, name, item.id), data).catch(report);
};

export const removeItem = (uid: string, name: CollectionName, id: string) => {
  deleteDoc(doc(db, 'users', uid, name, id)).catch(report);
};
