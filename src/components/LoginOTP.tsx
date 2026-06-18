import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, Sparkles, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function LoginOTP() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'token'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Registra automaticamente novos ATs ou pais
        }
      });

      if (otpError) {
        throw otpError;
      }

      setStep('token');
      setSuccessMsg('Código de acesso enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar o código de verificação.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        throw verifyError;
      }

      // Sessão estabelecida, o ouvinte no App.tsx reage automaticamente
    } catch (err: any) {
      setError(err.message || 'Código inválido ou expirado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow decorative element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Title / Brand Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-4 border border-indigo-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Clinic ABA & Atria</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Prontuário e Co-Piloto de IA</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0 animate-ping" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Step 1: Input Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                E-mail de Cadastro
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="exemplo@clinica.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Enviaremos um código de verificação temporário de 6 dígitos para o seu e-mail. Sem senhas necessárias.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-650 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/10 active:scale-98 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando código...</span>
                </>
              ) : (
                <span>Enviar Código de Acesso</span>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Input Verification Token */}
        {step === 'token' && (
          <form onSubmit={handleVerifyOTP} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <label htmlFor="token" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Código de Verificação (6 dígitos)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="token"
                  type="text"
                  placeholder="Digite seu código"
                  maxLength={128}
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none tracking-widest text-center font-bold transition-all"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                <span>E-mail: {email}</span>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <ArrowLeft className="w-3 h-3" /> Alterar e-mail
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-650 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/10 active:scale-98 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Confirmar Código</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
