import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { emailSignIn, emailSignUp, googleSignIn } from '../firebase';
import { inputCls } from './ui';

const errorText = (e: any) => {
  const code = e?.code || '';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'E-mail ou senha incorretos.';
  if (code.includes('email-already-in-use')) return 'Esse e-mail já tem conta. Use "Entrar".';
  if (code.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code.includes('popup-blocked')) return 'O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.';
  if (code.includes('unauthorized-domain'))
    return 'Domínio não autorizado: no Firebase, em Authentication → Configurações → Domínios autorizados, adicione thiagovinicius7.github.io';
  if (code.includes('operation-not-allowed'))
    return 'Esse tipo de login não está ativado: no Firebase, em Authentication → Método de login, ative Google e E-mail/senha.';
  if (code.includes('configuration-not-found'))
    return 'O Authentication ainda não foi iniciado no Firebase: abra Authentication e clique em Começar.';
  if (code.includes('network-request-failed')) return 'Sem conexão com o Google. Verifique a internet.';
  if (code.includes('operation-not-supported') || code.includes('web-storage-unsupported'))
    return 'Este navegador bloqueou o login. Tente pelo Chrome.';
  return `Não foi possível entrar (${code || e?.message || 'erro desconhecido'}).`;
};

export default function LoginScreen() {
  const [mode, setMode] = useState<'google' | 'login' | 'signup'>('google');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 hero-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-white text-mata-700 flex items-center justify-center mb-4 shadow-lg">
            <Brain size={34} />
          </div>
          <h1 className="text-2xl font-bold text-white">Segundo Cérebro</h1>
          <p className="text-white/80 mt-1">Seu dia, suas tarefas, notas e rotina num lugar só.</p>
        </div>

        {mode === 'google' ? (
          <>
            <button
              disabled={busy}
              onClick={() => run(googleSignIn)}
              className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl py-3.5 font-semibold text-tinta shadow-lg hover:shadow disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Entrar com Google
            </button>
            <button onClick={() => setMode('login')} className="w-full text-sm text-white/80 mt-4">
              Entrar com e-mail e senha
            </button>
          </>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              run(() => (mode === 'login' ? emailSignIn(email, pass) : emailSignUp(email, pass, name)));
            }}
            className="space-y-3"
          >
            {mode === 'signup' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className={inputCls} />}
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className={inputCls} autoComplete="email" />
            <input
              type="password"
              required
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Senha"
              className={inputCls}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button disabled={busy} className="w-full bg-sol-400 text-tinta rounded-2xl py-3.5 font-semibold disabled:opacity-60">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
            <div className="flex justify-between text-sm text-white/80">
              <button type="button" onClick={() => setMode('google')}>
                ← Google
              </button>
              <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
              </button>
            </div>
          </form>
        )}
        {err && <div className="mt-4 text-sm text-center bg-white/95 text-rose-700 rounded-xl px-3 py-2">{err}</div>}
      </div>
    </div>
  );
}
