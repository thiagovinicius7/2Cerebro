import React, { useState } from 'react';
import { googleSignIn } from '../firebase';
import { Brain, Calendar, CheckCircle2, Clock, CreditCard, FileText, Flame, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: User, accessToken: string) => void;
  onContinueOffline: () => void;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function LoginScreen({ onLoginSuccess, onContinueOffline, addToast }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
        if (addToast) {
          addToast('Login realizado com sucesso! Sincronização ativada. ☁️', 'success');
        }
      }
    } catch (err: any) {
      console.error('Erro no login com o Google:', err);
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        setError(
          'Domínio Não Autorizado no Firebase. Abra o aplicativo através do link compartilhado (Shared App) ou abra em uma nova aba para autorizar o acesso à sua conta.'
        );
      } else if (isIframe) {
        setError(
          'O login dentro do iframe do visualizador foi bloqueado pelo seu navegador. Por favor, clique no botão "Abrir em Nova Aba" abaixo para conectar com o Google.'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setError('O pop-up do Google foi bloqueado pelo seu navegador. Permita pop-ups para este site.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado. Tente novamente quando desejar conectar.');
      } else {
        setError(`Falha ao conectar com o Google: ${err?.message || 'Tente novamente.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex flex-col justify-center items-center p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200 mb-2">
            <Brain size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Meu Segundo Cérebro
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Sua plataforma inteligente de produtividade. Sincronize seus compromissos do{' '}
            <strong className="text-slate-700">Google Agenda</strong>, acompanhe hábitos, contas e notas na nuvem em tempo real.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Google Agenda</p>
              <p className="text-[10px] text-slate-500">Eventos sincronizados</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
              <Flame size={14} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Hábitos & Rotina</p>
              <p className="text-[10px] text-slate-500">Metas e novenas</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
              <CreditCard size={14} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Finanças</p>
              <p className="text-[10px] text-slate-500">Contas a pagar</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
              <FileText size={14} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Notas & Anexos</p>
              <p className="text-[10px] text-slate-500">Segundo cérebro</p>
            </div>
          </div>
        </div>

        {/* Error message box if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs space-y-2 text-left">
            <p className="font-bold flex items-center gap-1 text-red-900">
              ⚠️ Atenção
            </p>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Iframe Notice */}
        {isIframe && (
          <div className="bg-indigo-50/80 border border-indigo-100 text-indigo-900 rounded-2xl p-4 text-xs space-y-2 text-center">
            <p className="font-bold text-indigo-950 flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Ambiente de Pré-visualização Detectado
            </p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              O navegador pode impedir o pop-up de login do Google dentro do iframe. Para conectar com sucesso em 1 clique:
            </p>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="mt-1 bg-white hover:bg-slate-50 text-indigo-700 font-bold px-4 py-2 rounded-xl border border-indigo-200 transition shadow-xs inline-flex items-center gap-1.5 text-xs cursor-pointer"
            >
              Abrir em Nova Aba <ExternalLink size={12} />
            </button>
          </div>
        )}

        {/* Main CTA Google Button */}
        <div className="space-y-4 pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 text-sm group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Conectando com o Google...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Entrar com a Conta Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            Conexão direta e segura com a API do Google & Firebase
          </p>

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              onClick={onContinueOffline}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer underline underline-offset-4"
            >
              Continuar em Modo Visitante (Local)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
