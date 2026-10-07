import React, { useState, useEffect } from 'react';
import {
  Volume2,
  User,
  LogOut,
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { vocabService, AudioSettings } from '../../lib/vocabularyStore';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiConnection,
  isGeminiConfigured,
} from '../../lib/dictionaryService';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLogout,
}) => {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(vocabService.getAudioSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
        setAvailableVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleRateChange = (rate: number) => {
    const updated = { ...audioSettings, rate };
    setAudioSettings(updated);
    vocabService.updateAudioSettings(updated);
  };

  const handleVoiceChange = (voiceName: string) => {
    const updated = { ...audioSettings, voiceName };
    setAudioSettings(updated);
    vocabService.updateAudioSettings(updated);
  };

  const handleTestSpeech = () => {
    vocabService.speak('Welcome to PronounceIt. Master English pronunciation with precision.');
  };

  // Gemini AI Key State
  const [geminiKey, setGeminiKey] = useState<string>(getGeminiApiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{
    state: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({
    state: isGeminiConfigured() ? 'success' : 'idle',
    message: isGeminiConfigured() ? 'Clave de Gemini configurada y lista.' : '',
  });

  const handleSaveAndTestGemini = async () => {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      setGeminiApiKey('');
      setTestStatus({
        state: 'idle',
        message: 'Clave eliminada. Se usará el diccionario base estándar.',
      });
      return;
    }

    setTestStatus({ state: 'testing', message: 'Conectando con Google AI (Gemini 2.0 / 1.5 Flash)...' });
    const res = await testGeminiConnection(trimmed);
    if (res.success) {
      setGeminiApiKey(trimmed);
      setTestStatus({
        state: 'success',
        message: `¡Excelente! ${res.message} Las traducciones y frases ahora serán variadas y generadas por IA.`,
      });
    } else {
      setTestStatus({
        state: 'error',
        message: `Error al verificar la clave: ${res.message}. Comprueba que la clave sea correcta.`,
      });
    }
  };

  const handleClearGeminiKey = () => {
    setGeminiKey('');
    setGeminiApiKey('');
    setTestStatus({
      state: 'idle',
      message: 'Clave eliminada. Modo estándar activo.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 select-none animate-fadeIn text-white">
      {/* Google Gemini Free AI Configuration Card */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6 flex flex-col gap-5">
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-[#e62e4c] text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">IA Gemini de Google (Gratuita)</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  100% Gratis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Genera traducciones contextuales y frases de ejemplo variadas y naturales para cada palabra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGeminiConfigured() ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={13} />
                <span>IA Activa</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-semibold flex items-center gap-1.5">
                <span>Modo Estándar</span>
              </span>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-300 space-y-2">
          <p className="leading-relaxed">
            Con la API gratuita de Gemini, cada palabra que añadas recibirá una <span className="text-pink-300 font-semibold">frase de ejemplo única, auténtica y realista</span>, adaptada a su significado exacto y sin frases repetitivas.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-pink-300 font-medium pt-1 border-t border-purple-500/15">
            <Key size={13} className="shrink-0" />
            <span>¿No tienes una clave aún?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#ff4d6d] hover:text-white underline font-semibold transition-colors"
            >
              Obtén tu API Key gratis en Google AI Studio (1500 peticiones/día)
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <label className="text-xs font-semibold text-slate-300 block">
            Google Gemini API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Pega aquí tu clave: AIzaSy..."
                className="w-full h-11 sm:h-10 pl-3.5 pr-10 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e62e4c] font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAndTestGemini}
                disabled={testStatus.state === 'testing'}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#e62e4c] to-purple-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-500/20 shrink-0"
              >
                {testStatus.state === 'testing' ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Guardar y Probar</span>
                  </>
                )}
              </button>

              {geminiKey && (
                <button
                  type="button"
                  onClick={handleClearGeminiKey}
                  className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs transition-colors cursor-pointer"
                  title="Eliminar clave"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {testStatus.message && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.state === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : testStatus.state === 'error'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  : 'bg-black/30 border border-white/10 text-slate-300'
              }`}
            >
              {testStatus.state === 'success' && <CheckCircle2 size={14} className="shrink-0" />}
              {testStatus.state === 'error' && <AlertCircle size={14} className="shrink-0" />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Pronunciation Settings */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e62e4c]/20 text-[#ff4d6d] border border-[#e62e4c]/30 flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Motor de Pronunciación y Audio</h3>
              <p className="text-xs text-slate-400">Configura la voz, velocidad y síntesis fonética</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSpeech}
            className="px-3.5 py-1.5 rounded-xl bg-[#e62e4c]/15 hover:bg-[#e62e4c]/25 border border-[#e62e4c]/40 text-pink-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Volume2 size={14} />
            <span>Probar audio</span>
          </button>
        </div>

        {/* Speed Slider */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">Velocidad de reproducción</span>
            <span className="text-[#ff4d6d] font-bold">{audioSettings.rate}x</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.3"
            step="0.05"
            value={audioSettings.rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="w-full accent-[#e62e4c] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0.6x (Lenta para fonética)</span>
            <span>0.95x (Estándar natural)</span>
            <span>1.3x (Rápida nativa)</span>
          </div>
        </div>

        {/* Voice Selection */}
        {availableVoices.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-slate-300 block">
              Voz de síntesis del sistema (Inglés)
            </label>
            <select
              value={audioSettings.voiceName}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#e62e4c] cursor-pointer"
            >
              <option value="" className="bg-[#1c162e]">Automática recomendada (Inglés estándar)</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name} className="bg-[#1c162e]">
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Account Profile Card */}
      <div className="bg-[#181226]/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('pronounceit:open-edit-profile'))}
              className="relative group w-11 h-11 rounded-xl bg-gradient-to-tr from-[#e62e4c] via-[#ff3b59] to-purple-600 text-white font-bold text-sm border border-white/15 flex items-center justify-center overflow-hidden shrink-0 shadow cursor-pointer transition-transform hover:scale-105"
              title="Haz clic para cambiar foto o editar perfil"
            >
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-white" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-pink-200 font-bold">
                Cambiar
              </div>
            </button>
            <div>
              <h3 className="text-base font-bold text-white">Perfil del Estudiante</h3>
              <p className="text-xs text-slate-400">Información de la cuenta y sesión actual</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('pronounceit:open-edit-profile'))}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span>Editar perfil y foto</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-slate-400 block text-[11px] font-medium">Nombre completo / Usuario</span>
            <span className="font-bold text-white text-sm mt-0.5 block">
              {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-slate-400 block text-[11px] font-medium">Correo Electrónico</span>
            <span className="font-bold text-white text-sm mt-0.5 block">
              {currentUser?.email || 'estudiante@pronounceit.com'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-emerald-400 font-medium">
            <span>● Sesión iniciada con éxito.</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
