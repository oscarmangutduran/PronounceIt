import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { supabaseService } from '../../lib/supabaseClient';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProfileUpdated?: (user: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs with currentUser when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.full_name || '');
      setUsername(currentUser.username || '');
      setEmail(currentUser.email || '');
      setAvatarUrl(currentUser.avatar_url);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const initial = (fullName || username || 'U').charAt(0).toUpperCase();

  // Resize and compress image using HTML5 Canvas to max 256x256
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado pesada (máximo 5 MB).');
      return;
    }

    try {
      setError(null);
      const compressedDataUrl = await processImageFile(file);
      setAvatarUrl(compressedDataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error procesando la imagen: ${msg}`);
    } finally {
      // Reset input value so the same file can be selected again if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() && !username.trim()) {
      setError('Por favor indica un nombre completo o nombre de usuario.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor introduce una dirección de correo válida.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (newPassword === '12345') {
        setError('No puedes usar la contraseña estándar 12345.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await supabaseService.updateUserProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        newPassword: newPassword ? newPassword : undefined,
      });

      if (res.success && res.user) {
        setSuccess('¡Perfil actualizado con éxito!');
        if (onProfileUpdated) {
          onProfileUpdated(res.user);
        }
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setError(res.message || 'Error al actualizar el perfil.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#181226] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 via-transparent to-pink-900/20">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Editar Perfil</span>
              <Sparkles size={16} className="text-[#ff4d6d]" />
            </h2>
            <p className="text-xs text-slate-400">Personaliza tu foto, datos de usuario y contraseña</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Check size={15} className="shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Profile Photo Uploader Section */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#e62e4c] via-[#ff3b59] to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-xl ring-2 ring-white/15">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              {/* Quick camera overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer backdrop-blur-xs"
                title="Cambiar foto de perfil"
              >
                <Camera size={18} className="mb-0.5" />
                <span>Cambiar</span>
              </button>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
              <div>
                <p className="text-xs font-bold text-white">Foto de Perfil</p>
                <p className="text-[11px] text-slate-400">
                  Sube tu foto favorita (JPG, PNG o WebP, máx 5MB).
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:border-[#ff4d6d]/50"
                >
                  <Upload size={13} className="text-[#ff4d6d]" />
                  <span>{avatarUrl ? 'Cambiar foto' : 'Subir foto'}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(undefined)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Eliminar foto de perfil"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span>Nombre Completo</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Oscar Mangut"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] text-white text-xs placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">@</span>
              <span>Nombre de Usuario</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. oscarmangut"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] text-white text-xs placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400" />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] text-white text-xs placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Password Section */}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock size={13} className="text-slate-400" />
                <span>Cambiar Contraseña</span>
              </span>
              <span className="text-[11px] text-slate-400">(Opcional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] text-white text-xs placeholder-slate-500 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-[#e62e4c] focus:ring-1 focus:ring-[#e62e4c] text-white text-xs placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>
            {newPassword && (
              <p className="text-[11px] text-slate-400">
                La contraseña debe tener un mínimo de 6 caracteres.
              </p>
            )}
          </div>



          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e62e4c] to-[#ff4d6d] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-[#e62e4c]/25 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
