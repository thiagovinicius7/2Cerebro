import { useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MediaDoc } from './types';
import { newId, nowIso } from './dates';

// Fotos tiradas no celular são reduzidas (até 1600 px, JPEG) e guardadas no Firestore,
// cada uma no seu documento (limite de 1 MB por documento).
const MAX_BYTES = 900_000;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui abrir a imagem.'));
    };
    img.src = url;
  });

export const compressImage = async (file: File) => {
  const img = await loadImage(file);
  let maxSide = 1600;
  let quality = 0.78;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.length < MAX_BYTES) return { data, width: w, height: h };
    if (quality > 0.55) quality -= 0.1;
    else maxSide = Math.round(maxSide * 0.8);
  }
  throw new Error('A imagem é grande demais.');
};

export const uploadImage = async (uid: string, file: File) => {
  const { data, width, height } = await compressImage(file);
  const id = newId();
  const media: MediaDoc = { data, width, height, createdAt: nowIso() };
  // Sem await no servidor: fica no cache e sobe quando houver conexão
  setDoc(doc(db, 'users', uid, 'media', id), media).catch(console.error);
  cache.set(id, data);
  return id;
};

export const deleteMedia = (uid: string, id: string) => {
  cache.delete(id);
  deleteDoc(doc(db, 'users', uid, 'media', id)).catch(console.error);
};

const cache = new Map<string, string>();

export function useMedia(uid: string | null, mediaId?: string) {
  const [src, setSrc] = useState<string | null>(mediaId ? cache.get(mediaId) || null : null);
  useEffect(() => {
    if (!uid || !mediaId) return;
    if (cache.has(mediaId)) {
      setSrc(cache.get(mediaId)!);
      return;
    }
    let alive = true;
    getDoc(doc(db, 'users', uid, 'media', mediaId))
      .then(snap => {
        const data = (snap.data() as MediaDoc | undefined)?.data;
        if (data) cache.set(mediaId, data);
        if (alive) setSrc(data || null);
      })
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [uid, mediaId]);
  return src;
}
