import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  Settings,
  User,
  Volume2,
  Key,
  LogOut,
  Sparkles,
  Check,
  Edit2,
  FileSpreadsheet,
  UserX,
  Sun,
  Moon,
  Smartphone,
  Download,
  Trash2,
  Languages,
  AlertCircle,
} from 'lucide-react-native';
import { UserProfile } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiConnection,
} from '../../lib/dictionaryService';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';
import { useResponsive } from '../../lib/useResponsive';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onOpenEditProfile?: () => void;
  onOpenExportModal?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLogout,
  onDeleteAccount,
  onOpenEditProfile,
  onOpenExportModal,
  isDark = true,
  onToggleTheme,
}) => {
  const { isPhone } = useResponsive();
  const [audioSettings, setAudioSettings] = useState(() => vocabService.getAudioSettings());
  const [apiKey, setApiKey] = useState(() => getGeminiApiKey());
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: '',
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleUpdateRate = (rate: number) => {
    const updated = { ...audioSettings, rate };
    setAudioSettings(updated);
    vocabService.updateAudioSettings(updated);
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey);
    setIsSavedKey(true);
    setTimeout(() => setIsSavedKey(false), 2000);
  };

  const handleTestGemini = async () => {
    setGeminiTestStatus({ testing: true, message: '' });
    try {
      const res = await testGeminiConnection(apiKey);
      setGeminiTestStatus({
        testing: false,
        message: res.message,
        success: res.success,
      });
    } catch {
      setGeminiTestStatus({
        testing: false,
        message: 'Error al verificar la clave de Gemini.',
        success: false,
      });
    }
  };

  const testVoice = () => {
    vocabService.speak('PronounceIt provides instant native pronunciation for all your words.');
  };

  return (
    <ScrollView
      style={[styles.container, !isDark && styles.containerLight]}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.contentWrapper, isPhone && styles.contentWrapperMobile]}>
        {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Settings size={24} color={THEME.colors.crimsonLight} />
        </View>
        <View>
          <Text style={[styles.title, !isDark && styles.titleLight]}>Configuración</Text>
          <Text style={[styles.subtitle, !isDark && styles.subtitleLight]}>Preferencias de audio, cuenta e IA</Text>
        </View>
      </View>

      {/* User profile card */}
      <View style={[styles.card, !isDark && styles.cardLight]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, !isDark && styles.titleLight]}>Cuenta de Usuario</Text>
          {onOpenEditProfile && (
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={onOpenEditProfile}
              activeOpacity={0.8}
            >
              <Edit2 size={13} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {currentUser?.avatar_url ? (
              <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>
                {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, !isDark && styles.titleLight]}>
              {currentUser?.full_name || currentUser?.username || 'Usuario Invitado'}
            </Text>
            <Text style={[styles.profileEmail, !isDark && styles.subtitleLight]}>
              {currentUser?.email || 'Sin correo asociado'}
            </Text>
            {currentUser?.username && (
              <Text style={styles.profileUsername}>@{currentUser.username}</Text>
            )}
          </View>
        </View>

        {/* Acciones de Cuenta en la sección de perfil */}
        <View style={[styles.profileCardActions, !isDark && styles.profileCardActionsLight]}>
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.85}
          >
            <UserX size={15} color="#f87171" style={{ marginRight: 8 }} />
            <Text style={styles.deleteAccountBtnText}>Darme de baja</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.85}
          >
            <LogOut size={15} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Apariencia y Tema Visual */}
      {onToggleTheme && (
        <View style={[styles.card, !isDark && styles.cardLight]}>
          <Text style={[styles.sectionTitle, !isDark && styles.titleLight]}>Apariencia y Tema</Text>
          <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight]}>
            Personaliza el contraste de la interfaz entre modo oscuro y claro.
          </Text>

          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                !isDark && styles.themeOptionBtnLight,
                isDark && styles.themeOptionBtnActive,
              ]}
              onPress={() => {
                if (!isDark) onToggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Sun size={17} color={isDark ? "#fbbf24" : THEME.colors.textMuted} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.themeOptionBtnText,
                  !isDark && styles.themeOptionBtnTextLight,
                  isDark && styles.themeOptionBtnTextActive,
                ]}
              >
                Modo Oscuro (Noche)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                !isDark && styles.themeOptionBtnLight,
                !isDark && styles.themeOptionBtnActive,
              ]}
              onPress={() => {
                if (isDark) onToggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Moon size={17} color={!isDark ? "#6366f1" : THEME.colors.textMuted} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.themeOptionBtnText,
                  !isDark && styles.themeOptionBtnTextLight,
                  !isDark && styles.themeOptionBtnTextActive,
                ]}
              >
                Modo Claro (Día)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Speech Audio Voice Settings */}
      <View style={[styles.card, !isDark && styles.cardLight]}>
        <Text style={[styles.sectionTitle, !isDark && styles.titleLight]}>Voz & Síntesis de Pronunciación</Text>
        <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight]}>
          Ajusta la velocidad de reproducción para practicar a tu propio ritmo.
        </Text>

        <View style={styles.rateOptions}>
          {[0.75, 0.85, 0.95, 1.05].map((rate) => (
            <TouchableOpacity
              key={rate}
              style={[
                styles.rateBtn,
                !isDark && styles.rateBtnLight,
                audioSettings.rate === rate && styles.rateBtnActive,
              ]}
              onPress={() => handleUpdateRate(rate)}
            >
              <Text
                style={[
                  styles.rateBtnText,
                  !isDark && styles.rateBtnTextLight,
                  audioSettings.rate === rate && styles.rateBtnTextActive,
                ]}
              >
                {rate}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.testVoiceBtn, !isDark && styles.testVoiceBtnLight]}
          onPress={testVoice}
          activeOpacity={0.8}
        >
          <Volume2 size={16} color={!isDark ? '#e62e4c' : '#ffffff'} style={{ marginRight: 6 }} />
          <Text style={[styles.testVoiceBtnText, !isDark && styles.testVoiceBtnTextLight]}>Probar Voz en Inglés</Text>
        </TouchableOpacity>
      </View>

      {/* Inteligencia Artificial (Google Gemini) */}
      <View style={[styles.card, !isDark && styles.cardLight]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Sparkles size={18} color={THEME.colors.crimsonLight} />
          <Text style={[styles.sectionTitle, !isDark && styles.titleLight, { marginBottom: 0 }]}>
            Inteligencia Artificial (Google Gemini)
          </Text>
        </View>
        <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight, { marginBottom: 14 }]}>
          Configura tu clave de Google Gemini para traducir palabras, generar oraciones y enriquecer vocabulario con IA.
        </Text>

        {/* Configuración Google Gemini API */}
        <View style={[styles.subApiBox, !isDark && styles.subApiBoxLight]}>
          <Text style={[styles.apiBoxTitle, !isDark && styles.titleLight]}>
            Clave API de Google Gemini (Opcional)
          </Text>
          <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight, { marginBottom: 10 }]}>
            Permite enriquecer palabras con definiciones, oraciones y fonética usando los modelos Gemini Flash de Google.
          </Text>

          <View style={styles.keyInputRow}>
            <TextInput
              style={[styles.keyInput, !isDark && styles.keyInputLight]}
              placeholder="AIzaSy..."
              placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.saveKeyBtn}
              onPress={handleSaveApiKey}
              activeOpacity={0.8}
            >
              {isSavedKey ? <Check size={18} color="#ffffff" /> : <Text style={styles.saveKeyText}>Guardar</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.testConnectionBtn, !isDark && styles.testConnectionBtnLight]}
              onPress={handleTestGemini}
              disabled={geminiTestStatus.testing}
              activeOpacity={0.8}
            >
              {geminiTestStatus.testing ? (
                <ActivityIndicator size="small" color="#e62e4c" style={{ marginRight: 6 }} />
              ) : (
                <Sparkles size={14} color="#e62e4c" style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.testConnectionBtnText, { color: '#e62e4c' }]}>
                {geminiTestStatus.testing ? 'Verificando con Gemini...' : 'Probar conexión con Gemini'}
              </Text>
            </TouchableOpacity>
          </View>

          {geminiTestStatus.message ? (
            <View style={[styles.statusMsgBox, geminiTestStatus.success ? styles.statusSuccessBox : styles.statusErrorBox]}>
              <Text style={[styles.statusMsgText, geminiTestStatus.success ? styles.statusSuccessText : styles.statusErrorText]}>
                {geminiTestStatus.message}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Consigue la versión móvil (Descargar APK) */}
      <View style={[styles.card, !isDark && styles.cardLight]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(230, 46, 76, 0.15)' }]}>
              <Smartphone size={22} color={THEME.colors.crimsonLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, !isDark && styles.titleLight, { marginBottom: 2 }]}>
                Consigue la versión móvil
              </Text>
              <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight, { marginBottom: 0 }]}>
                Descarga e instala la app oficial en tu Android (v1.5.0 APK)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.downloadApkBtn}
            onPress={() => Linking.openURL('https://github.com/oscarmangutduran/PronounceIt/releases/download/v1.5.0/PronounceIt-v1.5.0.apk')}
            activeOpacity={0.85}
          >
            <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.downloadApkBtnText}>Descargar APK</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Backup / CSV Import-Export */}
      {onOpenExportModal && (
        <View style={[styles.card, !isDark && styles.cardLight]}>
          <Text style={[styles.sectionTitle, !isDark && styles.titleLight]}>Copia de Seguridad y Datos</Text>
          <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight]}>
            Exporta tus palabras a un archivo .CSV compatible con Excel o importa nuevo vocabulario a tu cuenta.
          </Text>
          <TouchableOpacity
            style={styles.exportDataBtn}
            onPress={onOpenExportModal}
            activeOpacity={0.85}
          >
            <FileSpreadsheet size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.exportDataBtnText}>Exportar / Importar Vocabulario (.CSV)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearDataBtn, !isDark && styles.clearDataBtnLight]}
            onPress={() => setShowClearModal(true)}
            activeOpacity={0.85}
          >
            <Trash2 size={16} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.clearDataBtnText}>Vaciar Palabras y Categorías</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete account button (Darme de baja) */}
      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={() => setShowDeleteModal(true)}
        activeOpacity={0.85}
      >
        <UserX size={16} color="#f87171" style={{ marginRight: 8 }} />
        <Text style={styles.deleteAccountBtnText}>Darme de baja</Text>
      </TouchableOpacity>

      {/* Logout button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => setShowLogoutModal(true)}
        activeOpacity={0.85}
      >
        <LogOut size={16} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Version Information */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
        <Text style={{ fontSize: 13, color: THEME.colors.textSubtle, fontWeight: '700' }}>
          PronounceIt v1.5.0
        </Text>
        <Text style={{ fontSize: 11, color: THEME.colors.textSubtle, opacity: 0.75, marginTop: 4 }}>
          Versión 1.5.0 Oficial · Todos los derechos reservados
        </Text>
      </View>
      </View>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir de tu cuenta de PronounceIt?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
        isDark={isDark}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Darme de baja"
        message="¿Estás seguro de que deseas darte de baja? Esta acción eliminará permanentemente tu cuenta, todas tus palabras y tu progreso de aprendizaje. Esta acción no se puede deshacer."
        confirmText="Sí, darme de baja"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setShowDeleteModal(false);
          onDeleteAccount?.();
        }}
        onCancel={() => setShowDeleteModal(false)}
        isDark={isDark}
      />

      <ConfirmModal
        isOpen={showClearModal}
        title="Eliminar Palabras y Categorías"
        message="¿Estás seguro de que deseas eliminar todas las palabras, categorías y subcategorías? Esta acción vaciará completamente tu lista de vocabulario en todos tus dispositivos y no se puede deshacer."
        confirmText={isClearing ? "Vaciando..." : "Sí, vaciar todo"}
        cancelText="Cancelar"
        variant="danger"
        onConfirm={async () => {
          setIsClearing(true);
          try {
            await vocabService.clearAllWords();
          } finally {
            setIsClearing(false);
            setShowClearModal(false);
          }
        }}
        onCancel={() => setShowClearModal(false)}
        isDark={isDark}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: THEME.colors.bgDark,
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  contentWrapper: {
    width: '80%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  contentWrapperMobile: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: 18,
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 14,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  themeOptionBtnActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderColor: 'rgba(230, 46, 76, 0.45)',
  },
  themeOptionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  themeOptionBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 12,
    color: THEME.colors.textSubtle,
    marginTop: 2,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 46, 76, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.4)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editProfileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  profileUsername: {
    fontSize: 11,
    color: '#ff4d6d',
    fontWeight: '600',
    marginTop: 2,
  },
  rateOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rateBtnActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  rateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  rateBtnTextActive: {
    color: '#ffffff',
  },
  testVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
  },
  testVoiceBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  keyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
  },
  saveKeyBtn: {
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldSublabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  fieldSublabelLight: {
    color: '#0f172a',
  },
  engineToggleRow: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  engineOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    padding: 12,
  },
  engineOptionBtnLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  engineOptionBtnActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.1)',
    borderColor: THEME.colors.crimson,
  },
  engineOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  engineOptionTitleLight: {
    color: '#0f172a',
  },
  engineOptionTitleActive: {
    color: '#ff758c',
  },
  engineOptionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  engineOptionDescLight: {
    color: '#64748b',
  },
  subApiBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    padding: 14,
  },
  subApiBoxLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  apiBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  apiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  apiBadgeFree: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  apiBadgePro: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.4)',
  },
  apiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  testConnectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  testConnectionBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  testConnectionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusMsgBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusMsgText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusSuccessText: {
    color: '#34d399',
  },
  statusErrorText: {
    color: '#f87171',
  },
  exportDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    marginTop: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  exportDataBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  clearDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    marginTop: 10,
  },
  clearDataBtnLight: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearDataBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadApkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadApkBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 13,
    borderRadius: THEME.radius.md,
    marginBottom: 10,
  },
  deleteAccountBtnText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  profileCardActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  containerLight: {
    backgroundColor: '#f8fafc',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  titleLight: {
    color: '#0f172a',
  },
  subtitleLight: {
    color: '#475569',
  },
  profileCardActionsLight: {
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  themeOptionBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  themeOptionBtnTextLight: {
    color: '#475569',
  },
  rateBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  rateBtnTextLight: {
    color: '#475569',
  },
  testVoiceBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  testVoiceBtnTextLight: {
    color: '#1e293b',
  },
  keyInputLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
});

