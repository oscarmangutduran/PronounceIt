import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { supabaseService } from '../../../lib/supabaseClient';

interface AuthViewProps {
  onSuccess: () => void;
  onOpenSettings: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onOpenSettings }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const config = supabaseService.getConfig();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!email || !password) {
      setErrorMessage('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setLoading(true);

    if (isRegister) {
      if (!fullName.trim()) {
        setErrorMessage('Por favor, ingresa tu nombre completo.');
        setLoading(false);
        return;
      }
      const res = await supabaseService.signUp(email, password, fullName);
      setLoading(false);
      if (res.success) {
        setSuccessNotice('¡Cuenta registrada con éxito! Iniciando sesión...');
        setTimeout(() => onSuccess(), 400);
      } else {
        setErrorMessage(res.message || 'Error al registrar la cuenta.');
      }
    } else {
      const res = await supabaseService.signIn(email, password);
      setLoading(false);
      if (res.success) {
        setSuccessNotice('¡Acceso correcto! Cargando tu espacio...');
        setTimeout(() => onSuccess(), 300);
      } else {
        setErrorMessage(res.message || 'Credenciales incorrectas.');
      }
    }
  }

  async function handleQuickDemo() {
    setErrorMessage(null);
    setLoading(true);
    setEmail('alex.dev@ejemplo.com');
    setPassword('supabase123');
    setFullName('Alex Rivera');

    const res = await supabaseService.signIn('alex.dev@ejemplo.com', 'supabase123');
    setLoading(false);
    if (res.success) {
      setSuccessNotice('Acceso rápido exitoso como Alex Rivera.');
      setTimeout(() => onSuccess(), 300);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto no-scrollbar bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Header */}
      <div>
        {/* Status Pill & Service Indicator */}
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PronounceIt Auth</span>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-medium px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-200/50 dark:bg-slate-800/60"
          >
            {config.isCustom ? '🟢 Supabase Cloud' : '🟡 Modo Local'}
          </button>
        </div>

        {/* Brand Icon & Welcome */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 ring-4 ring-emerald-500/10">
            <Volume2 size={26} strokeWidth={2.2} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isRegister ? 'Crear Cuenta' : 'Bienvenido de nuevo'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
            {isRegister
              ? 'Regístrate para guardar tus avances de pronunciación y tareas sincronizadas.'
              : 'Inicia sesión para continuar tu práctica y acceder a todas las funciones.'}
          </p>
        </div>

        {/* Auth Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 shadow-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shadow-xs">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="alex.dev@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => alert('Para el simulador demo, puedes usar cualquier contraseña de 6+ caracteres o hacer clic en "Acceso Rápido Demo".')}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  ¿Olvidaste tu clave?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Mantener sesión iniciada</span>
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Procesando...</span>
              </div>
            ) : (
              <>
                <span>{isRegister ? 'Registrar y Continuar' : 'Entrar a la Aplicación'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Demo Access & RLS Badge */}
      <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-all shadow-2xs group cursor-pointer"
        >
          <Sparkles size={14} className="text-emerald-500 group-hover:rotate-12 transition-transform" />
          <span>Acceso Rápido con 1 Clic (Alex Rivera Demo)</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Autenticación segura y datos sincronizados</span>
        </div>
      </div>
    </div>
  );
};
