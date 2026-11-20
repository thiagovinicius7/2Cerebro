import React, { useRef, useState } from 'react';
import { CalendarDays, CloudCheck, CloudOff, Download, LogOut, Upload } from 'lucide-react';
import { User } from 'firebase/auth';
import { logout, reconnectCalendar } from '../firebase';
import { getCalendarToken } from '../lib/calendar';
import { exportBackup, importBackup } from '../lib/backup';
import { useBrain } from '../lib/brain';
import { Sheet, useToast } from './ui';

export default function SettingsSheet({ user, onClose }: { user: User; onClose: () => void }) {
  const { uid, synced, tasks, notes, routines } = useBrain();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [tok, setTok] = useState(getCalendarToken());
  const fileRef = useRef<HTMLInputElement>(null);

  const row = 'w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50';

  return (
    <Sheet open onClose={onClose} title="Conta">
      <div className="flex items-center gap-3 py-2">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate">{user.displayName || 'Você'}</div>
          <div className="text-sm text-stone-500 truncate">{user.email}</div>
        </div>
      </div>

      <div className="text-sm text-stone-500 flex items-center gap-2 mt-2">
        {synced ? <CloudCheck size={16} className="text-emerald-600" /> : <CloudOff size={16} className="text-amber-600" />}
        {synced ? 'Tudo sincronizado' : 'Sem conexão — as mudanças sobem quando a internet voltar'}
      </div>
      <div className="text-xs text-stone-400 mt-1">
        {tasks.length} tarefas · {notes.length} notas · {routines.length} itens de rotina
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
        <button
          className={row}
          onClick={async () => {
            try {
              await reconnectCalendar();
              setTok(getCalendarToken());
              toast('Agenda conectada');
            } catch {
              toast('Não foi possível conectar à agenda.');
            }
          }}
        >
          <CalendarDays size={19} className="text-sky-600" />
          <div className="flex-1">
            <div className="text-[15px]">Google Agenda</div>
            <div className="text-xs text-stone-500">
              {tok
                ? `Conectada até ${new Date(tok.exp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — toque para renovar`
                : 'Desconectada — toque para conectar'}
            </div>
          </div>
        </button>
        <button
          className={row}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await exportBackup(uid);
            } catch (e: any) {
              toast(e?.message || 'Não foi possível gerar o backup agora.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={19} className="text-stone-600" />
          <div className="flex-1">
            <div className="text-[15px]">{busy ? 'Gerando…' : 'Baixar backup'}</div>
            <div className="text-xs text-stone-500">Arquivo com tudo, inclusive os dados da versão antiga</div>
          </div>
        </button>
        <button className={row} disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={19} className="text-stone-600" />
          <div className="flex-1">
            <div className="text-[15px]">{busy ? 'Importando…' : 'Importar backup'}</div>
            <div className="text-xs text-stone-500">Traz um arquivo de backup para esta conta (não duplica)</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async e => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setBusy(true);
              try {
                const r = await importBackup(uid, f);
                toast(`Importado: ${r.tasks} tarefas, ${r.notes} notas, ${r.routines} itens de rotina.`);
              } catch (err: any) {
                toast(err?.message || 'Não consegui importar esse arquivo.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </button>
        <button className={`${row} text-rose-600`} onClick={() => logout()}>
          <LogOut size={19} />
          <div className="text-[15px]">Sair</div>
        </button>
      </div>
    </Sheet>
  );
}
