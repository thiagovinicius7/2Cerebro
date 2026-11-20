import React, { useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import { NoteAttachment } from '../lib/types';
import { useBrain } from '../lib/brain';
import { useMedia } from '../lib/media';

export function NoteImage({ att, className = '', zoomable = true }: { att: NoteAttachment; className?: string; zoomable?: boolean }) {
  const { uid } = useBrain();
  const stored = useMedia(uid, att.mediaId);
  const src = att.mediaId ? stored : att.url;
  const [zoom, setZoom] = useState(false);
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
        {broken ? <ImageOff size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-transparent animate-spin" />}
      </div>
    );
  }
  return (
    <>
      <img
        src={src}
        alt={att.name}
        loading="lazy"
        onError={() => setBroken(true)}
        onClick={e => {
          if (!zoomable) return;
          e.stopPropagation();
          setZoom(true);
        }}
        className={`object-cover ${zoomable ? 'cursor-zoom-in' : ''} ${className}`}
      />
      {zoom && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={e => {
            e.stopPropagation();
            setZoom(false);
          }}
        >
          <button className="absolute top-4 right-4 text-white p-2" aria-label="Fechar">
            <X size={26} />
          </button>
          <img src={src} alt={att.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
