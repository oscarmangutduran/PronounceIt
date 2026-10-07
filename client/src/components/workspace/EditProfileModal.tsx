import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  User,
  Check,
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Upload,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { UserProfile } from '../../types';
import { firebaseService } from '../../lib/firebaseClient';
import { backendApi } from '../../lib/apiClient';
import { THEME } from '../../theme';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProfileUpdated: (user: UserProfile) => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.full_name || '');
      setUsername(currentUser.username || '');
      setAvatarUrl(currentUser.avatar_url);
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError(null);
      setSuccessMsg(null);
      setIsSaving(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handlePickImage = () => {
    setError(null);
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`La imagen supera el límite de 5 MB (tamaño seleccionado: ${sizeMb} MB).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('El archivo seleccionado no es una imagen válida.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo de imagen.');
    };
    reader.readAsDataURL(file);

    // Reset input so selecting the same file again works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(undefined);
    setError(null);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setError(null);

    const cleanUsername = username.trim();
    const cleanFullName = fullName.trim();

    if (!cleanUsername) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setError('La nueva contraseña debe tener al menos 4 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Update in firebaseService (handles IndexedDB, localStorage accounts & Firebase Auth/Firestore)
      const res = await firebaseService.updateUserProfile({
        username: cleanUsername,
        fullName: cleanFullName,
        avatarUrl: avatarUrl || '',
        newPassword: newPassword || undefined,
      });

      if (!res.success && res.message) {
        setError(res.message);
        setIsSaving(false);
        return;
      }

      // 2. Synchronize directly with backend Express API
      await backendApi
        .updateProfile(currentUser.id, {
          username: cleanUsername,
          avatar_url: avatarUrl || '',
          password: newPassword || undefined,
          email: currentUser.email,
        })
        .catch((e) => console.warn('Direct backend updateProfile warning:', e));

      const updatedUser: UserProfile = {
        ...currentUser,
        username: cleanUsername,
        full_name: cleanFullName || currentUser.full_name,
        avatar_url: avatarUrl,
      };

      setSuccessMsg('Perfil actualizado correctamente.');
      onProfileUpdated(updatedUser);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los cambios del perfil.');
      setIsSaving(false);
    }
  };

  const initial = (fullName || username || currentUser?.email || 'U')[0].toUpperCase();

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <User size={18} color="#ff4d6d" />
              </View>
              <View>
                <Text style={styles.title}>Editar Perfil</Text>
                <Text style={styles.headerSubtitle}>
                  Foto, nombre de usuario y credenciales
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSaving}>
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* AVATAR SECTION */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  disabled={isSaving}
                  accessibilityLabel="Cambiar foto de perfil"
                >
                  <Camera size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.avatarActions}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  <Upload size={13} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadBtnText}>
                    {avatarUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                  </Text>
                </TouchableOpacity>

                {avatarUrl ? (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={handleRemoveAvatar}
                    activeOpacity={0.8}
                    disabled={isSaving}
                  >
                    <Trash2 size={13} color="#f87171" style={{ marginRight: 4 }} />
                    <Text style={styles.removeBtnText}>Quitar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.avatarNotice}>
                Formatos soportados: JPG, PNG, WEBP, GIF (Máximo 5 MB)
              </Text>

              {/* Hidden file input for web */}
              {Platform.OS === 'web' && (
                <input
                  ref={fileInputRef as any}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              )}
            </View>

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color="#ef4444" style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success Banner */}
            {successMsg && (
              <View style={styles.successBox}>
                <Check size={15} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* USERNAME & FULL NAME INPUTS */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nombre de Usuario <Text style={{ color: '#ff4d6d' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <User size={15} color={THEME.colors.textSubtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (error) setError(null);
                  }}
                  placeholder="ej. oscarmd91"
                  placeholderTextColor={THEME.colors.textSubtle}
                  autoCapitalize="none"
                  editable={!isSaving}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <View style={styles.inputWrapper}>
                <Sparkles size={15} color={THEME.colors.textSubtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Tu nombre y apellido"
                  placeholderTextColor={THEME.colors.textSubtle}
                  editable={!isSaving}
                />
              </View>
            </View>

            {/* PASSWORD SECTION */}
            <View style={styles.passwordDivider}>
              <Text style={styles.passwordSectionTitle}>CAMBIAR CONTRASEÑA</Text>
              <Text style={styles.passwordSectionHint}>
                (Opcional. Deja estos campos en blanco si deseas conservar tu contraseña actual)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nueva Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Lock size={15} color={THEME.colors.textSubtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (error) setError(null);
                  }}
                  placeholder="Nueva contraseña (mínimo 4 caracteres)"
                  placeholderTextColor={THEME.colors.textSubtle}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isSaving}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={THEME.colors.textMuted} />
                  ) : (
                    <Eye size={16} color={THEME.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Lock size={15} color={THEME.colors.textSubtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (error) setError(null);
                  }}
                  placeholder="Repite la nueva contraseña"
                  placeholderTextColor={THEME.colors.textSubtle}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isSaving}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 4 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} color={THEME.colors.textMuted} />
                  ) : (
                    <Eye size={16} color={THEME.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.saveBtnText}>Guardando...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#161026',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollArea: {
    maxHeight: 460,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#ff4d6d',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#261b40',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#e62e4c',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#161026',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.4)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  removeBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarNotice: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    height: '100%',
  },
  passwordDivider: {
    marginTop: 10,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  passwordSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#ff4d6d',
    marginBottom: 2,
  },
  passwordSectionHint: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e62e4c',
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
