import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
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
  WifiOff,
  Smartphone,
  Download,
} from 'lucide-react-native';
import { firebaseService, WelcomeEmailNotice } from '../../lib/firebaseClient';
import { vocabService } from '../../lib/vocabularyStore';
import { testHistoryService } from '../../lib/testHistoryStore';
import { appStorage } from '../../lib/storage';
import { networkService } from '../../lib/networkService';
import { THEME } from '../../theme';
import { PronounceItLogo } from '../common/PronounceItLogo';

interface LoginViewProps {
  onSuccess: () => void;
  initialMode?: AuthMode;
  initialEmail?: string;
  initialUsername?: string;
}

type AuthMode = 'signup' | 'signin' | 'forgot_password' | 'change_password';

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  initialMode,
  initialEmail,
  initialUsername,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || 'signin');
  const [rememberMe, setRememberMe] = useState(() => {
    return appStorage.getItem('pronounceit_remember_me') === 'true';
  });
  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail;
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
  const [password, setPassword] = useState(() => {
    const isRemembered = appStorage.getItem('pronounceit_remember_me') === 'true';
    if (!isRemembered) return '';
    const saved = appStorage.getItem('pronounceit_saved_password');
    return saved !== null ? saved : '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [welcomeNotice, setWelcomeNotice] = useState<WelcomeEmailNotice | null>(null);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());

  useEffect(() => {
    return networkService.subscribe(setIsOnline);
  }, []);

  useEffect(() => {
    if (initialMode === 'change_password') {
      setMode('change_password');
    } else if (initialMode && mode !== 'change_password') {
      setMode(initialMode);
    }
    if (initialEmail) setEmail(initialEmail);
    if (initialUsername) setUsername(initialUsername);
  }, [initialMode, initialEmail, initialUsername]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'pronounceit-login-autofill-fix';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        input, textarea, select {
          outline: none !important;
          box-shadow: none !important;
          background-color: transparent !important;
          color: #ffffff !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active,
        input:autofill {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #1a142b inset !important;
          box-shadow: 0 0 0px 1000px #1a142b inset !important;
          transition: background-color 5000000s ease-in-out 0s !important;
        }
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #21142b inset !important;
          box-shadow: 0 0 0px 1000px #21142b inset !important;
        }
      `;
    }
  }, []);

  const handleToggleRemember = () => {
    const nextVal = !rememberMe;
    setRememberMe(nextVal);
    if (!nextVal) {
      appStorage.removeItem('pronounceit_remember_me');
      appStorage.removeItem('pronounceit_saved_email');
      appStorage.removeItem('pronounceit_saved_password');
      appStorage.removeItem('pronounceit_saved_username');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // 1. FORGOT PASSWORD
    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setError('Por favor, ingresa tu correo electrónico o nombre de usuario.');
        return;
      }

      if (newPassword && newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres.');
          return;
        }
        if (newPassword.trim() === '12345') {
          setError('La nueva contraseña no puede ser la contraseña estándar 12345.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
        }
      }

      setLoading(true);
      const res = await firebaseService.resetPassword(email.trim(), newPassword ? newPassword.trim() : undefined);
      setLoading(false);

      if (res.success) {
        setSuccess(res.message || 'Contraseña restablecida con éxito.');
        if (res.tempPassword) {
          setPassword(res.tempPassword);
        } else if (newPassword) {
          setPassword(newPassword.trim());
        }
        setTimeout(() => {
          setMode('signin');
          setNewPassword('');
          setConfirmPassword('');
        }, 1800);
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
      const targetIdentifier = (email || '').trim() || (initialEmail || '').trim() || (firebaseService.getCurrentUser()?.email) || (firebaseService.getCurrentUser()?.username) || '';
      const res = await firebaseService.updateInitialPassword(targetIdentifier, newPassword);
      setLoading(false);

      if (res.success) {
        if (rememberMe) {
          appStorage.setItem('pronounceit_remember_me', 'true');
          appStorage.setItem('pronounceit_saved_email', targetIdentifier);
          appStorage.setItem('pronounceit_saved_password', newPassword);
          if (username) appStorage.setItem('pronounceit_saved_username', username.trim());
        }
        vocabService.syncWithCloud().catch(() => {});
        testHistoryService.syncWithCloud().catch(() => {});
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
        const notice = (res as any).welcomeEmailNotice || (res as any).emailNotice;
        if (notice) {
          setWelcomeNotice(notice);
        }
        vocabService.syncWithCloud().catch(() => {});
        setSuccess('¡Cuenta creada con éxito! Por seguridad, debes cambiar tu contraseña provisional (12345) ahora.');
        setMode('change_password');
        setNewPassword('');
        setConfirmPassword('');
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

      const cleanPass = password.trim();
      setLoading(true);
      const res = await firebaseService.signIn(email.trim(), cleanPass);
      setLoading(false);

      if (res.success) {
        vocabService.syncWithCloud().catch(() => {});
        testHistoryService.syncWithCloud().catch(() => {});

        if (res.mustChangePassword || res.user?.must_change_password || cleanPass === '12345') {
          setMode('change_password');
          setError(null);
          setSuccess('Por seguridad, debes cambiar tu contraseña provisional (12345) antes de continuar.');
          return;
        }

        if (rememberMe) {
          appStorage.setItem('pronounceit_remember_me', 'true');
          appStorage.setItem('pronounceit_saved_email', email.trim());
          appStorage.setItem('pronounceit_saved_password', password);
          if (username) appStorage.setItem('pronounceit_saved_username', username.trim());
        } else {
          appStorage.removeItem('pronounceit_remember_me');
          appStorage.removeItem('pronounceit_saved_email');
          appStorage.removeItem('pronounceit_saved_password');
          appStorage.removeItem('pronounceit_saved_username');
        }

        setSuccess('¡Bienvenido de vuelta!');
        setTimeout(() => onSuccess(), 300);
      } else {
        setError(res.message || 'Credenciales incorrectas.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/login_hero.jpg')}
        style={styles.bgImage}
        imageStyle={styles.bgImageInner}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <PronounceItLogo size={64} />
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
                  if (mode === 'change_password') {
                    firebaseService.signOut().catch(() => {});
                  }
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                  setPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <ArrowLeft size={16} color={THEME.colors.textMuted} />
                <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            )}

            {/* Title for change/forgot */}
            {mode === 'forgot_password' && (
              <>
                <Text style={styles.cardHeaderTitle}>Recuperar Contraseña</Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Introduce tu correo o usuario. Puedes definir una nueva contraseña directamente o dejarla en blanco para restablecerla a la clave temporal (12345).
                </Text>
              </>
            )}
            {mode === 'change_password' && (
              <>
                <Text style={styles.cardHeaderTitle}>Cambiar Contraseña Obligatorio</Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Has iniciado sesión con la contraseña provisional (12345). Por seguridad, debes definir una contraseña nueva para proteger tu cuenta ({email || initialEmail || initialUsername || 'de usuario'}) antes de acceder.
                </Text>
              </>
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

            {!isOnline && (
              <View style={styles.offlineBanner}>
                <WifiOff size={15} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={styles.offlineBannerText}>
                  Sin conexión a internet detectada · Puedes usar la app en Modo Offline
                </Text>
              </View>
            )}

            {/* Form Fields */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre o Usuario</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'username' && styles.inputWrapperFocused,
                  ]}
                >
                  <User
                    size={18}
                    color={focusedField === 'username' ? THEME.colors.crimson : THEME.colors.textSubtle}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Alex Brown"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    spellCheck={false}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>
            )}

            {mode !== 'change_password' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {mode === 'signin' || mode === 'forgot_password' ? 'Correo o Nombre de Usuario' : 'Correo Electrónico'}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <Mail
                    size={18}
                    color={focusedField === 'email' ? THEME.colors.crimson : THEME.colors.textSubtle}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="tu@correo.com o tu_usuario"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    underlineColorAndroid="transparent"
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
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock
                    size={18}
                    color={focusedField === 'password' ? THEME.colors.crimson : THEME.colors.textSubtle}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tu contraseña secreta"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="password"
                    autoComplete="current-password"
                    underlineColorAndroid="transparent"
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

            {(mode === 'change_password' || mode === 'forgot_password') && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {mode === 'forgot_password' ? 'Nueva Contraseña (Opcional)' : 'Nueva Contraseña'}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'newPassword' && styles.inputWrapperFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === 'newPassword' ? THEME.colors.crimson : THEME.colors.textSubtle}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder={mode === 'forgot_password' ? 'Dejar en blanco para usar la estándar (12345)' : 'Mínimo 6 caracteres'}
                      placeholderTextColor={THEME.colors.textSubtle}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      textContentType="newPassword"
                      underlineColorAndroid="transparent"
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
                  <Text style={styles.inputLabel}>
                    {mode === 'forgot_password' ? 'Confirmar Nueva Contraseña (Opcional)' : 'Confirmar Contraseña'}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === 'confirmPassword' ? THEME.colors.crimson : THEME.colors.textSubtle}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder={mode === 'forgot_password' ? 'Repite tu nueva clave si la has introducido' : 'Repite tu nueva contraseña'}
                      placeholderTextColor={THEME.colors.textSubtle}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      textContentType="newPassword"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Remember me toggle */}
            {(mode === 'signin' || mode === 'signup') && (
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={handleToggleRemember}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.rememberText}>Recordar mis datos (correo y contraseña)</Text>
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
                  {mode === 'forgot_password' && (newPassword.trim() ? 'Restablecer y Guardar Contraseña' : 'Restablecer a Contraseña Estándar (12345)')}
                  {mode === 'change_password' && 'Guardar Nueva Contraseña'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Offline Mode Button */}
            {mode !== 'change_password' && (
              <TouchableOpacity
                style={styles.offlineButton}
                onPress={() => {
                  firebaseService.continueOffline();
                  onSuccess();
                }}
                activeOpacity={0.8}
              >
                <WifiOff size={15} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.offlineButtonText}>Continuar sin conexión (Modo Offline)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Consigue la versión móvil */}
          <View style={styles.mobileDownloadFooter}>
            <TouchableOpacity
              style={styles.mobileDownloadBtn}
              onPress={() => Linking.openURL('https://github.com/oscarmangutduran/PronounceIt/releases/download/v1.0.0/PronounceIt-v1.0.0.apk')}
              activeOpacity={0.85}
            >
              <View style={styles.mobileDownloadIconBox}>
                <Smartphone size={16} color="#ffffff" />
              </View>
              <Text style={styles.mobileDownloadTitle}>Consigue la versión móvil (v1.0.0)</Text>
              <Download size={15} color={THEME.colors.crimsonLight} />
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: THEME.colors.textSubtle, marginTop: 12, fontWeight: '500' }}>
              PronounceIt v1.0.0
            </Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
    backgroundColor: THEME.colors.bgDark,
  },
  bgImageInner: {
    opacity: 0.28,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 15, 0.78)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 36 : 28,
    paddingBottom: 56,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    marginBottom: 14,
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
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
    marginBottom: 8,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSubtle,
    marginBottom: 16,
    lineHeight: 18,
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
  inputWrapperFocused: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: THEME.colors.crimson,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }
      : {}),
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          backgroundColor: 'transparent',
        } as any)
      : {}),
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
  mobileDownloadFooter: {
    marginTop: 26,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  mobileDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
    gap: 10,
  },
  mobileDownloadIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDownloadTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  offlineButtonText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
