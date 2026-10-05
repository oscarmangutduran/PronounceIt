import React, { useState } from 'react';
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import { supabaseService, WelcomeEmailNotice } from '../../lib/supabaseClient';

interface LoginViewProps {
  onSuccess: () => void;
}

type AuthMode = 'signup' | 'signin' | 'forgot_password' | 'change_password';

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin'); // Default to Iniciar sesión
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('pronounceit_remember_me') === 'true';
  });
  const [email, setEmail] = useState(() => {
    const saved = localStorage.getItem('pronounceit_saved_email');
    return saved !== null ? saved : 'alexgorbatow@yandex.ru';
  });
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('pronounceit_saved_username');
    return saved !== null ? saved : 'alexgorbatow';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [welcomeEmailNotice, setWelcomeEmailNotice] = useState<WelcomeEmailNotice | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 1. FORGOT PASSWORD FLOW
    if (mode === 'forgot_password') {
      if (!email) {
        setError('Por favor, ingresa tu correo electrónico.');
        return;
      }
      setLoading(true);
      const res = await supabaseService.resetPassword(email);
      setLoading(false);
      if (res.success) {
        setSuccess(res.message || 'Instrucciones enviadas con éxito.');
      } else {
        setError(res.message || 'Error al procesar la solicitud.');
      }
      return;
    }

    // 2. CHANGE MANDATORY STANDARD PASSWORD FLOW (from 12345 to new password)
    if (mode === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword === '12345') {
        setError('La nueva contraseña no puede ser la contraseña estándar 12345.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      setLoading(true);
      const res = await supabaseService.updateInitialPassword(email, newPassword);
      setLoading(false);

      if (res.success) {
        if (rememberMe) {
          localStorage.setItem('pronounceit_remember_me', 'true');
          localStorage.setItem('pronounceit_saved_email', email);
          if (username) localStorage.setItem('pronounceit_saved_username', username);
        }
        setSuccess('¡Contraseña actualizada con éxito! Entrando a la aplicación...');
        setTimeout(() => onSuccess(), 350);
      } else {
        setError(res.message || 'Error al actualizar la contraseña.');
      }
      return;
    }

    // 3. SIGN UP FLOW (Automatic standard password 12345 + welcome email)
    if (mode === 'signup') {
      if (!email || !username) {
        setError('Por favor, completa el correo y tu nombre de usuario.');
        return;
      }

      if (!agreeTerms) {
        setError('Debes aceptar los Términos del servicio para continuar.');
        return;
      }

      setLoading(true);
      const res = await supabaseService.signUpWithStandardPassword(email, username);
      setLoading(false);

      if (res.success && res.emailNotice) {
        // Show interactive welcome email notice with credentials
        setWelcomeEmailNotice(res.emailNotice);
      } else {
        setError(res.message || 'Error al crear la cuenta.');
      }
      return;
    }

    // 4. SIGN IN FLOW
    if (!email || !password) {
      setError('Por favor, ingresa tu usuario/correo y contraseña.');
      return;
    }

    // Persist or clear remembered credentials
    if (rememberMe) {
      localStorage.setItem('pronounceit_remember_me', 'true');
      localStorage.setItem('pronounceit_saved_email', email);
      if (username) localStorage.setItem('pronounceit_saved_username', username);
    } else {
      localStorage.removeItem('pronounceit_remember_me');
      localStorage.removeItem('pronounceit_saved_email');
      localStorage.removeItem('pronounceit_saved_username');
    }

    setLoading(true);
    const res = await supabaseService.signIn(email, password);
    setLoading(false);

    if (res.success) {
      // If user signed in with standard password (12345) or flag is true, force password change!
      if (res.mustChangePassword || password === '12345') {
        setMode('change_password');
        setSuccess('Has iniciado con la contraseña estándar (12345). Por tu seguridad, debes cambiarla por una nueva antes de continuar.');
        return;
      }

      setSuccess('¡Bienvenido de nuevo! Entrando a la aplicación...');
      setTimeout(() => onSuccess(), 300);
    } else {
      setError(res.message || 'Credenciales no válidas.');
    }
  }

  function handleSwitchMode(newMode: AuthMode) {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (newMode === 'signup' && !rememberMe) {
      setEmail('');
      setUsername('');
    }
  }

  // Dynamic Left Hero text based on current mode
  const heroHeading =
    mode === 'change_password'
      ? 'Seguridad de tu cuenta'
      : mode === 'forgot_password'
      ? '¿Olvidaste tu contraseña?'
      : mode === 'signup'
      ? '¿No tienes una cuenta?'
      : '¿Ya tienes una cuenta?';

  const heroDescription =
    mode === 'change_password'
      ? 'Estás a solo un paso de acceder. Crea tu contraseña personalizada para proteger tu cuenta y tu progreso de pronunciación.'
      : mode === 'forgot_password'
      ? 'No te preocupes. Escribe tu correo electrónico para recibir las instrucciones de restablecimiento y volver a tu cuenta sin perder tu progreso.'
      : mode === 'signup'
      ? 'Crea tu cuenta introduciendo tu correo y usuario. Recibirás un correo con tus datos y la contraseña estándar 12345 para tu primer acceso.'
      : 'Inicia sesión para continuar tu práctica de pronunciación, métricas y tus tareas sincronizadas.';

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#0f0c18] overflow-hidden select-none">
      {/* Blurred atmospheric background glow */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-3xl scale-110 pointer-events-none"
        style={{ backgroundImage: `url('/assets/login_hero.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0712] via-[#0f0c18]/80 to-[#120e20]/90 pointer-events-none" />

      {/* Main Split-Screen Container Card */}
      <div className="relative z-10 w-full max-w-[960px] min-h-[580px] rounded-2xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/10 grid grid-cols-1 md:grid-cols-2 bg-[#171224]">
        {/* LEFT PANEL: Hero Banner with Warm Study Desk */}
        <div className="relative flex flex-col justify-between p-8 sm:p-10 min-h-[340px] md:min-h-full overflow-hidden bg-slate-900">
          {/* Background Photo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('/assets/login_hero.jpg')` }}
          />

          {/* Subtle contrast gradient for white text legibility while preserving warm tones */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/85" />

          {/* Bottom Content Area */}
          <div className="relative z-10 mt-auto pt-16">
            <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-white drop-shadow-md leading-tight">
              {heroHeading}
            </h2>
            <p className="mt-3 text-xs sm:text-[13px] text-slate-200/80 max-w-[340px] font-normal leading-relaxed drop-shadow">
              {heroDescription}
            </p>

            {/* Social Icons matching screenshot: VK, Facebook, Instagram, Twitter, Google */}
            <div className="mt-8 flex items-center gap-4 text-white/70">
              {/* VKontakte */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
                title="VK"
                onClick={() => {}}
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.716-1.033-1.006-1.493-1.135-1.748-1.135-.357 0-.46.102-.46.592v1.65c0 .422-.135.609-1.25.609-1.848 0-3.899-1.123-5.344-3.208-2.176-3.08-2.772-5.397-2.772-5.867 0-.256.102-.493.593-.493h1.744c.444 0 .61.205.78.683 1.134 3.284 3.033 6.166 3.82 6.166.29 0 .423-.134.423-.87v-3.39c-.085-1.547-.905-1.677-.905-2.227 0-.238.188-.475.493-.475h2.738c.374 0 .51.196.51.643v4.577c0 .493.22.662.357.662.272 0 .493-.17.986-.662 1.528-1.724 2.623-4.373 2.623-4.373.136-.288.357-.474.798-.474h1.744c.526 0 .644.272.526.643-.22 1.018-2.358 4.02-2.46 4.19-.204.34-.289.493 0 .884.204.288.883.864 1.339 1.39 1.033 1.187 1.83 2.186 2.05 2.88.22.645-.119.985-.764.985z"/>
                </svg>
              </button>

              {/* Facebook */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
                title="Facebook"
                onClick={() => {}}
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* Instagram */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
                title="Instagram"
                onClick={() => {}}
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </button>

              {/* Twitter / X */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
                title="Twitter"
                onClick={() => {}}
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/>
                </svg>
              </button>

              {/* Google+ */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
                title="Google"
                onClick={() => {}}
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.067 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Form Section */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:p-14 bg-gradient-to-b from-[#1b152b] to-[#141021] text-white">
          <div>
            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-white">
                {mode === 'change_password'
                  ? 'Cambiar contraseña'
                  : mode === 'forgot_password'
                  ? 'Recuperar contraseña'
                  : mode === 'signup'
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
              </h1>
              {mode === 'forgot_password' && (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-[340px]">
                  Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              )}
              {mode === 'change_password' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 text-amber-400 mt-0.5" />
                  <span>Has iniciado con la contraseña estándar (12345). Debes crear una nueva contraseña personalizada para acceder.</span>
                </div>
              )}
              {mode === 'signup' && (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-[340px]">
                  Al registrarte recibirás un correo con tu usuario y la contraseña estándar <strong className="text-amber-400">12345</strong> que deberás cambiar al entrar.
                </p>
              )}
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="mt-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* CHANGE PASSWORD MODE: New Password & Confirm Password */}
              {mode === 'change_password' ? (
                <>
                  <div className="relative group">
                    <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                      Nueva contraseña (mínimo 6 caracteres)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pb-2 pt-0.5 bg-transparent border-b border-white/20 text-xs sm:text-sm text-white placeholder-slate-500/60 focus:outline-none focus:border-white transition-colors pr-7 tracking-wider"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-0 bottom-2 text-slate-400/60 hover:text-white transition-colors cursor-pointer"
                        title={showNewPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Lock size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pb-2 pt-0.5 bg-transparent border-b border-white/20 text-xs sm:text-sm text-white placeholder-slate-500/60 focus:outline-none focus:border-white transition-colors pr-7 tracking-wider"
                        required
                      />
                      <KeyRound
                        size={14}
                        className="absolute right-0 bottom-2 text-slate-400/60 group-focus-within:text-white transition-colors pointer-events-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* E-mail Input (Present on signin, signup, forgot_password) */}
                  <div className="relative group">
                    <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                      Correo electrónico
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alexgorbatow@yandex.ru"
                        className="w-full pb-2 pt-0.5 bg-transparent border-b border-white/20 text-xs sm:text-sm text-white placeholder-slate-500/60 focus:outline-none focus:border-white transition-colors pr-7"
                        required
                      />
                      <Mail
                        size={14}
                        className="absolute right-0 bottom-2 text-slate-400/60 group-focus-within:text-white transition-colors pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Login / Username (Sign up only) */}
                  {mode === 'signup' && (
                    <div className="relative group">
                      <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                        Nombre de usuario
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="alexgorbatow"
                          className="w-full pb-2 pt-0.5 bg-transparent border-b border-white/20 text-xs sm:text-sm text-white placeholder-slate-500/60 focus:outline-none focus:border-white transition-colors pr-7"
                          required
                        />
                        <User
                          size={14}
                          className="absolute right-0 bottom-2 text-slate-400/60 group-focus-within:text-white transition-colors pointer-events-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Input (Sign in only) */}
                  {mode === 'signin' && (
                    <div className="relative group">
                      <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                        Contraseña
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pb-2 pt-0.5 bg-transparent border-b border-white/20 text-xs sm:text-sm text-white placeholder-slate-500/60 focus:outline-none focus:border-white transition-colors pr-7 tracking-wider"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 bottom-2 text-slate-400/60 hover:text-white transition-colors cursor-pointer"
                          title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Lock size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Checkboxes & Recovery Link Area */}
                  {mode !== 'forgot_password' && (
                    <div className="space-y-2.5 pt-2">
                      {/* Remember me checkbox and Forgot password link (Sign in mode) */}
                      {mode === 'signin' && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              id="remember-me-checkbox"
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="w-3.5 h-3.5 rounded-xs border border-white/30 bg-transparent text-[#e62e4c] focus:ring-0 cursor-pointer accent-[#e62e4c]"
                            />
                            <label
                              htmlFor="remember-me-checkbox"
                              className="text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
                            >
                              Recordar mis datos
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSwitchMode('forgot_password')}
                            className="text-[11px] text-slate-400 hover:text-pink-300 transition-colors underline-offset-4 hover:underline cursor-pointer"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                      )}

                      {/* Terms of service checkbox (Sign up mode) */}
                      {mode === 'signup' && (
                        <div className="flex items-center gap-2">
                          <input
                            id="terms-checkbox"
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="w-3.5 h-3.5 rounded-xs border border-white/30 bg-transparent text-[#e62e4c] focus:ring-0 cursor-pointer accent-[#e62e4c]"
                          />
                          <label
                            htmlFor="terms-checkbox"
                            className="text-[11px] text-slate-400 cursor-pointer select-none"
                          >
                            Acepto todas las condiciones en los{' '}
                            <span className="text-slate-200 underline hover:text-white transition-colors">
                              Términos del servicio
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons Row */}
              <div className="pt-4 flex items-center justify-between gap-4">
                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-lg bg-[#e62e4c] hover:bg-[#ff3b59] active:scale-[0.98] text-white text-xs sm:text-sm font-normal tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,46,76,0.45)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === 'change_password'
                          ? 'Guardar y entrar a la app'
                          : mode === 'forgot_password'
                          ? 'Enviar instrucciones'
                          : mode === 'signup'
                          ? 'Crear cuenta'
                          : 'Iniciar sesión'}
                      </span>
                      <span className="text-sm font-bold ml-1">&gt;</span>
                    </>
                  )}
                </button>

                {/* Secondary navigation link */}
                {mode === 'forgot_password' || mode === 'change_password' ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signin')}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 underline-offset-4 hover:underline"
                  >
                    <ArrowLeft size={13} />
                    <span>Volver a Iniciar sesión</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer underline-offset-4 hover:underline"
                  >
                    {mode === 'signup' ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Interactive Welcome Email simulation with Username & Standard Password 12345 */}
      {welcomeEmailNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1c162e] border border-emerald-500/40 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¡Correo de bienvenida enviado!</h3>
                <p className="text-xs text-slate-400">Revisa los datos de acceso para tu cuenta</p>
              </div>
            </div>

            {/* Email Card Simulation */}
            <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Destinatario:</span>
                <span className="font-semibold text-emerald-300">{welcomeEmailNotice.to}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Tu usuario:</span>
                <span className="font-bold text-white">{welcomeEmailNotice.username}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-slate-400">Contraseña estándar:</span>
                <span className="font-mono font-bold text-sm text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  {welcomeEmailNotice.standardPassword}
                </span>
              </div>
              <div className="pt-1 flex items-start gap-2 text-[11px] text-amber-200/90 leading-relaxed">
                <ShieldAlert size={14} className="shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Por motivos de seguridad, deberás cambiar la contraseña estándar (<strong>12345</strong>) por una nueva al iniciar sesión por primera vez.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const notice = welcomeEmailNotice;
                setWelcomeEmailNotice(null);
                setMode('signin');
                setEmail(notice.to);
                setUsername(notice.username);
                setPassword(notice.standardPassword);
                setSuccess('Se han copiado tus credenciales. Pulsa "Iniciar sesión" con 12345 para actualizarla.');
              }}
              className="w-full mt-5 py-3 rounded-xl bg-[#e62e4c] hover:bg-[#ff3b59] text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-[#e62e4c]/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continuar e Iniciar sesión con 12345</span>
              <span>&gt;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
