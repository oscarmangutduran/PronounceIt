import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const config = supabaseService.getConfig();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!email || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    if (isRegister) {
      if (!fullName.trim()) {
        setErrorMessage('Por favor ingresa tu nombre completo.');
        setLoading(false);
        return;
      }
      const res = await supabaseService.signUp(email, password, fullName);
      setLoading(false);
      if (res.success) {
        setSuccessNotice('Cuenta registrada con éxito.');
        setTimeout(() => onSuccess(), 400);
      } else {
        setErrorMessage(res.message || 'Error al registrarse.');
      }
    } else {
      const res = await supabaseService.signIn(email, password);
      setLoading(false);
      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.message || 'Credenciales inválidas.');
      }
    }
  }

  function handleQuickDemo() {
    setEmail('alex.dev@ejemplo.com');
    setPassword('supabase123');
    setFullName('Alex Rivera');
    setErrorMessage(null);
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Zap size={16} />
            </div>
            <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              SUPABASE AUTH
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            {config.isCustom ? '🟢 Supabase Conectado' : '🟡 Modo Local'}
          </button>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isRegister
            ? 'Regístrate para guardar y sincronizar tus tareas en PostgreSQL'
            : 'Accede a tu cuenta móvil para ver tus tareas sincronizadas'}
        </p>

        {/* Tab switch */}
        <div className="flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl mt-5">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        {successNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="alex.dev@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Conectando con Supabase...</span>
            ) : (
              <>
                <span>{isRegister ? 'Registrar Usuario' : 'Entrar a la App'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick demo autofill */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={handleQuickDemo}
          className="w-full py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
        >
          <Zap size={13} />
          <span>Rellenar con usuario de prueba rápido</span>
        </button>
      </div>
    </div>
  );
};
