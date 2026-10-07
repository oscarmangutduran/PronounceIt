import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Image,
  Linking,
  Platform,
} from 'react-native';
import {
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Volume2,
} from 'lucide-react-native';
import { firebaseService, WelcomeEmailNotice } from '../../lib/firebaseClient';
import { appStorage } from '../../lib/storage';
import { THEME } from '../../theme';

interface LoginViewProps {
  onSuccess: () => void;
}

type AuthMode = 'signup' | 'signin' | 'forgot_password' | 'change_password';

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [rememberMe, setRememberMe] = useState(() => {
    return appStorage.getItem('pronounceit_remember_me') === 'true';
  });
  const [email, setEmail] = useState(() => {
    const saved = appStorage.getItem('pronounceit_saved_email');
    if (saved === 'alexgorbatow@yandex.ru' || saved === 'usuario@pronounceit.com') {
      appStorage.removeItem('pronounceit_saved_email');
      return '';
    }
    return saved !== null ? saved : '';
  });
  const [username, setUsername] = useState(() => {
    const saved = appStorage.getItem('pronounceit_saved_username');
    if (saved === 'alexgorbatow' || saved === 'Usuario PronounceIt') {
      appStorage.removeItem('pronounceit_saved_username');
      return '';
    }
    return saved !== null ? saved : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [welcomeNotice, setWelcomeNotice] = useState<WelcomeEmailNotice | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // 1. FORGOT PASSWORD
    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setError('Por favor, ingresa tu correo electrónico.');
        return;
      }
      setLoading(true);
      const res = await firebaseService.resetPassword(email.trim());
      setLoading(false);
      if (res.success) {
        setSuccess(res.message || 'Instrucciones enviadas con éxito.');
      } else {
        setError(res.message || 'Error al procesar la solicitud.');
      }
      return;
    }

    // 2. CHANGE PASSWORD
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
      const res = await firebaseService.updateInitialPassword(email.trim(), newPassword);
      setLoading(false);

      if (res.success) {
        if (rememberMe) {
          appStorage.setItem('pronounceit_remember_me', 'true');
          appStorage.setItem('pronounceit_saved_email', email.trim());
          if (username) appStorage.setItem('pronounceit_saved_username', username.trim());
        }
        setSuccess('¡Contraseña actualizada con éxito! Entrando a la aplicación...');
        setTimeout(() => onSuccess(), 400);
      } else {
        setError(res.message || 'Error al actualizar la contraseña.');
      }
      return;
    }

    // 3. SIGNUP
    if (mode === 'signup') {
      if (!email.trim() || !username.trim()) {
        setError('Por favor completa todos los campos requeridos.');
        return;
      }

      setLoading(true);
      const res = await firebaseService.signUpWithStandardPassword(email.trim(), username.trim());
      setLoading(false);

      if (res.success) {
        if (rememberMe) {
          appStorage.setItem('pronounceit_remember_me', 'true');
          appStorage.setItem('pronounceit_saved_email', email.trim());
          appStorage.setItem('pronounceit_saved_username', username.trim());
        }
        if (res.welcomeEmailNotice) {
          setWelcomeNotice(res.welcomeEmailNotice);
        }
        setSuccess('¡Cuenta creada con éxito! Entrando a PronounceIt...');
        setTimeout(() => onSuccess(), 500);
      } else {
        setError(res.message || 'Error al registrar la cuenta.');
      }
      return;
    }

    // 4. SIGNIN
    if (mode === 'signin') {
      if (!email.trim() || !password) {
        setError('Por favor ingresa tu correo/usuario y contraseña.');
        return;
      }

      setLoading(true);
      const res = await firebaseService.signIn(email.trim(), password);
      setLoading(false);

      if (res.success) {
        if (res.user?.must_change_password) {
          setMode('change_password');
          return;
        }

        if (rememberMe) {
          appStorage.setItem('pronounceit_remember_me', 'true');
          appStorage.setItem('pronounceit_saved_email', email.trim());
          if (username) appStorage.setItem('pronounceit_saved_username', username.trim());
        } else {
          appStorage.removeItem('pronounceit_remember_me');
          appStorage.removeItem('pronounceit_saved_email');
          appStorage.removeItem('pronounceit_saved_username');
        }

        setSuccess('¡Bienvenido de vuelta!');
        setTimeout(() => onSuccess(), 300);
      } else {
        setError(res.message || 'Credenciales incorrectas.');
      }
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    await firebaseService.signInAsGuest();
    setLoading(false);
    onSuccess();
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/login_hero.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <BookOpen size={28} color={THEME.colors.crimsonLight} />
              <View style={styles.sparkleDot}>
                <Sparkles size={12} color="#ffffff" />
              </View>
            </View>
            <Text style={styles.brandTitle}>PronounceIt</Text>
            <Text style={styles.brandSubtitle}>
              Perfecciona tu pronunciación y vocabulario en inglés
            </Text>
          </View>

          {/* Auth Card */}
          <View style={styles.card}>
            {/* Mode Switcher */}
            {mode !== 'forgot_password' && mode !== 'change_password' && (
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
                  onPress={() => {
                    setMode('signin');
                    setError(null);
                    setSuccess(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                    Iniciar Sesión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
                  onPress={() => {
                    setMode('signup');
                    setError(null);
                    setSuccess(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                    Crear Cuenta
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back button for forgot/change password */}
            {(mode === 'forgot_password' || mode === 'change_password') && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                }}
              >
                <ArrowLeft size={16} color={THEME.colors.textMuted} />
                <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            )}

            {/* Title for change/forgot */}
            {mode === 'forgot_password' && (
              <Text style={styles.cardHeaderTitle}>Recuperar Contraseña</Text>
            )}
            {mode === 'change_password' && (
              <Text style={styles.cardHeaderTitle}>Actualizar Contraseña Inicial</Text>
            )}

            {/* Feedback Banners */}
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#f87171" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={18} color="#34d399" />
                <Text style={styles.successBannerText}>{success}</Text>
              </View>
            )}

            {/* Form Fields */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre o Usuario</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color={THEME.colors.textSubtle} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Alex Brown"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {mode !== 'change_password' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {mode === 'signin' ? 'Correo o Nombre de Usuario' : 'Correo Electrónico'}
                </Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={THEME.colors.textSubtle} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="tu@correo.com"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {mode === 'signin' && (
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <TouchableOpacity onPress={() => setMode('forgot_password')}>
                    <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={THEME.colors.textSubtle} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tu contraseña secreta"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={THEME.colors.textSubtle} />
                    ) : (
                      <Eye size={18} color={THEME.colors.textSubtle} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {mode === 'change_password' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={THEME.colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={THEME.colors.textSubtle}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeIcon}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} color={THEME.colors.textSubtle} />
                      ) : (
                        <Eye size={18} color={THEME.colors.textSubtle} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={THEME.colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Repite tu nueva contraseña"
                      placeholderTextColor={THEME.colors.textSubtle}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showNewPassword}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Remember me toggle */}
            {(mode === 'signin' || mode === 'signup') && (
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.rememberText}>Recordar mi sesión en este dispositivo</Text>
              </TouchableOpacity>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'signin' && 'Iniciar Sesión'}
                  {mode === 'signup' && 'Crear Cuenta'}
                  {mode === 'forgot_password' && 'Enviar Instrucciones'}
                  {mode === 'change_password' && 'Guardar Nueva Contraseña'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Guest mode */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O BIEN</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Volume2 size={16} color={THEME.colors.crimsonLight} style={{ marginRight: 8 }} />
              <Text style={styles.guestButtonText}>Continuar como Invitado (Modo Práctica)</Text>
            </TouchableOpacity>
          </View>

          {/* Recommended Resources Footer */}
          <View style={styles.partnerFooter}>
            <Text style={styles.partnerFooterTitle}>APLICACIONES RECOMENDADAS</Text>
            <View style={styles.partnerRow}>
              <TouchableOpacity
                style={styles.partnerBadge}
                onPress={() => Linking.openURL('https://www.duolingo.com/')}
              >
                <Image
                  source={require('../../assets/duolingo.png')}
                  style={styles.partnerIcon}
                  resizeMode="contain"
                />
                <Text style={styles.partnerText}>Duolingo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.partnerBadge}
                onPress={() => Linking.openURL('https://beespeaker.com/')}
              >
                <Image
                  source={require('../../assets/beespeaker.png')}
                  style={styles.partnerIcon}
                  resizeMode="contain"
                />
                <Text style={styles.partnerText}>BeeSpeaker</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.partnerBadge}
                onPress={() => Linking.openURL('https://wlingua.com/')}
              >
                <Image
                  source={require('../../assets/wlingua.png')}
                  style={styles.partnerIcon}
                  resizeMode="contain"
                />
                <Text style={styles.partnerText}>Wlingua</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 12, 24, 0.92)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  sparkleDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.crimson,
    borderRadius: 10,
    padding: 3,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 290,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.md,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.crimson,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backButtonText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  successBannerText: {
    color: '#6ee7b7',
    fontSize: 12,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 11,
    color: THEME.colors.crimsonLight,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.colors.textSubtle,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: THEME.colors.crimson,
    backgroundColor: THEME.colors.crimson,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  rememberText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: THEME.colors.crimson,
    borderRadius: THEME.radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    paddingHorizontal: 12,
    letterSpacing: 1,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 46,
  },
  guestButtonText: {
    color: THEME.colors.textWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  partnerFooter: {
    marginTop: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  partnerFooterTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.sm,
    gap: 6,
  },
  partnerIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  partnerText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
