import React, { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  Sliders,
  User,
  Shield,
  Database,
  LogOut,
  RotateCcw,
  Check,
} from 'lucide-react';
import { UserProfile, SupabaseConfig } from '../../types';
import { vocabService, AudioSettings } from '../../lib/vocabularyStore';
import { supabaseService } from '../../lib/supabaseClient';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenSupabaseModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLogout,
  onOpenSupabaseModal,
}) => {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(vocabService.getAudioSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedMsg, setSavedMsg] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(supabaseService.getConfig());

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

  const handleResetVocab = () => {
    if (window.confirm('¿Deseas restaurar el vocabulario predeterminado? Se reestablecerán las palabras de prueba.')) {
      vocabService.resetToDefault();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 select-none animate-fadeIn">
      {/* Audio Pronunciation Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Motor de Pronunciación y Audio</h3>
              <p className="text-xs text-slate-500">Configura la voz, velocidad y síntesis fonética</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSpeech}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 size={14} />
            <span>Probar audio</span>
          </button>
        </div>

        {/* Speed Slider */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-700">Velocidad de reproducción</span>
            <span className="text-indigo-600 font-bold">{audioSettings.rate}x</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.3"
            step="0.05"
            value={audioSettings.rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0.6x (Lenta para fonética)</span>
            <span>0.95x (Estándar natural)</span>
            <span>1.3x (Rápida nativa)</span>
          </div>
        </div>

        {/* Voice Selection */}
        {availableVoices.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">
              Voz de síntesis del sistema (Inglés)
            </label>
            <select
              value={audioSettings.voiceName}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Automática recomendada (Inglés estándar)</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Account Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Perfil del Estudiante</h3>
            <p className="text-xs text-slate-500">Información de la cuenta y sesión actual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 block text-[11px] font-medium">Nombre completo / Usuario</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {currentUser?.full_name || currentUser?.username || 'Usuario PronounceIt'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 block text-[11px] font-medium">Correo Electrónico</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {currentUser?.email || 'estudiante@pronounceit.com'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span>Sesión iniciada con éxito.</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Database / Supabase Sync & Storage Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Almacenamiento y Sincronización</h3>
              <p className="text-xs text-slate-500">
                {supabaseConfig.isCustom ? 'Conectado a tu proyecto de Supabase' : 'Almacenamiento local optimizado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSupabaseModal}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Configurar Supabase
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Restaurar biblioteca con términos de demostración:</span>
          <button
            type="button"
            onClick={handleResetVocab}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>{savedMsg ? '¡Restaurado!' : 'Restablecer términos demo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
