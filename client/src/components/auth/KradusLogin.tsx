import React, { useState } from 'react';
import { Mail, User, Lock, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabaseService } from '../../lib/supabaseClient';

interface KradusLoginProps {
  onSuccess: () => void;
}

export const KradusLogin: React.FC<KradusLoginProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(true); // Default to Sign up matching screenshot
  const [email, setEmail] = useState('alexgorbatow@yandex.ru');
  const [username, setUsername] = useState('alexgorbatow');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !agreeTerms) {
      setError('Please agree to the Terms of service.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const res = await supabaseService.signUp(email, password, username || email.split('@')[0]);
      setLoading(false);
      if (res.success) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => onSuccess(), 350);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } else {
      const res = await supabaseService.signIn(email, password);
      setLoading(false);
      if (res.success) {
        setSuccess('Welcome back! Entering app...');
        setTimeout(() => onSuccess(), 300);
      } else {
        setError(res.message || 'Invalid credentials.');
      }
    }
  }

  async function handleQuickDemo() {
    setError(null);
    setLoading(true);
    setEmail('alexgorbatow@yandex.ru');
    setUsername('alexgorbatow');
    setPassword('password123');

    const res = await supabaseService.signIn('alexgorbatow@yandex.ru', 'password123');
    setLoading(false);
    if (res.success) {
      setSuccess('Demo access granted.');
      setTimeout(() => onSuccess(), 250);
    }
  }

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
        {/* LEFT PANEL: Hero Banner with Flare Silhouette */}
        <div className="relative flex flex-col justify-between p-8 sm:p-10 min-h-[340px] md:min-h-full overflow-hidden bg-slate-900">
          {/* Background Photo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('/assets/login_hero.jpg')` }}
          />

          {/* Moody cinematic color overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
          <div className="absolute inset-0 bg-[#25102a]/30 mix-blend-color" />

          {/* Top Branding: Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-white/90 drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 3 22 21 2 21" />
            </svg>
            <span className="text-sm font-bold tracking-[0.22em] text-white uppercase drop-shadow-md">
              KRADUS
            </span>
          </div>

          {/* Bottom Content Area */}
          <div className="relative z-10 mt-auto pt-16">
            <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-white drop-shadow-md leading-tight">
              {isSignUp ? "Don't have an account?" : 'Already have an account?'}
            </h2>
            <p className="mt-3 text-xs sm:text-[13px] text-slate-200/80 max-w-[340px] font-normal leading-relaxed drop-shadow">
              Register to access all the features of our service. Manage your business in one place. It&apos;s free!
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

        {/* RIGHT PANEL: Minimalist Twilight Form Section */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:p-14 bg-gradient-to-b from-[#1b152b] to-[#141021] text-white">
          <div>
            {/* Title matching screenshot */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-white">
                {isSignUp ? 'Sign up' : 'Sign in'}
              </h1>

              {/* Quick 1-click Demo Fill */}
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[11px] font-medium text-pink-400/90 hover:text-pink-300 flex items-center gap-1 transition-colors cursor-pointer bg-white/5 px-2.5 py-1 rounded-full border border-pink-500/20"
                title="Auto-fill demo credentials"
              >
                <Sparkles size={12} className="text-pink-400" />
                <span>Demo 1-Click</span>
              </button>
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

            {/* Form with Minimalist Underline Inputs (matching screenshot) */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* E-mail Input */}
              <div className="relative group">
                <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                  E-mail
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
              {isSignUp && (
                <div className="relative group">
                  <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                    Login
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

              {/* Password Input */}
              <div className="relative group">
                <label className="block text-[11px] font-normal text-slate-400 tracking-wide mb-1">
                  Password
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
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Lock size={14} />}
                  </button>
                </div>
              </div>

              {/* Terms of service checkbox */}
              {isSignUp && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-xs border border-white/30 bg-transparent text-[#e62e4c] focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="terms-checkbox"
                    className="text-[11px] text-slate-400 cursor-pointer select-none"
                  >
                    I agree to the all statements in{' '}
                    <span className="text-slate-200 underline hover:text-white transition-colors">
                      Terms of service
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="pt-4 flex items-center justify-between gap-4">
                {/* Vibrant Coral/Crimson Primary Button: Sign up > */}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-lg bg-[#e62e4c] hover:bg-[#ff3b59] active:scale-[0.98] text-white text-xs sm:text-sm font-normal tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,46,76,0.45)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? 'Sign up' : 'Sign in'}</span>
                      <span className="text-sm font-bold ml-1">&gt;</span>
                    </>
                  )}
                </button>

                {/* Secondary toggle text button: Have an account? */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer underline-offset-4 hover:underline"
                >
                  {isSignUp ? 'Have an account?' : "Don't have an account?"}
                </button>
              </div>
            </form>
          </div>

          {/* Bottom subtle note */}
          <div className="pt-8 text-[11px] text-slate-500 flex items-center justify-between border-t border-white/5 mt-8">
            <span>PronounceIt Security</span>
            <span className="text-slate-400">PostgreSQL &bull; Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
