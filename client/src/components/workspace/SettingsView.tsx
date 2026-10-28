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
  Platform,
  Share,
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
  Apple,
  Share2,
  Copy,
  ExternalLink,
  Info,
  MessageCircle,
  Mail,
  Send,
  Instagram,
  Plus,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { UserProfile, SUPPORTED_LANGUAGES } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiConnection,
} from '../../lib/dictionaryService';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';
import { AppleInstallModal } from '../common/AppleInstallModal';
import { CountryFlag } from '../common/CountryFlag';
import { LanguagePickerModal } from '../common/LanguagePickerModal';
import { useResponsive } from '../../lib/useResponsive';

const DiscordIcon = ({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </Svg>
);

const LinkedinIcon = ({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.75a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
  </Svg>
);

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onOpenEditProfile?: () => void;
  onOpenExportModal?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  learningLanguages?: string[];
  activeLanguage?: string;
  onDeleteLanguage?: (langCode: string) => Promise<void> | void;
  onSelectLanguage?: (langCode: string) => void;
  onAddLanguage?: (langCode: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLogout,
  onDeleteAccount,
  onOpenEditProfile,
  onOpenExportModal,
  isDark = true,
  onToggleTheme,
  learningLanguages,
  activeLanguage,
  onDeleteLanguage,
  onSelectLanguage,
  onAddLanguage,
}) => {
  const { isPhone } = useResponsive();
  const [langToDelete, setLangToDelete] = useState<string | null>(null);
  const [showConfirmDeleteLangModal, setShowConfirmDeleteLangModal] = useState(false);
  const [showAddLangModal, setShowAddLangModal] = useState(false);

  const languagesList = (learningLanguages && learningLanguages.length > 0)
    ? Array.from(new Set(learningLanguages))
    : (currentUser?.learning_languages && currentUser.learning_languages.length > 0)
      ? Array.from(new Set(currentUser.learning_languages))
      : [activeLanguage || currentUser?.target_language || 'en'];

  const getLangName = (code: string) => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
    return found ? found.name : code.toUpperCase();
  };

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
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const DISCORD_INVITE_URL = 'https://discord.gg/Zsv27yYBF';

  const handleCopyDiscord = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(DISCORD_INVITE_URL);
      } else {
        await Share.share({
          title: 'Únete a las salas de voz de PronounceIt en Discord',
          message: `Únete a las salas de charla para practicar conversación en inglés con otros compañeros: ${DISCORD_INVITE_URL}`,
          url: DISCORD_INVITE_URL,
        });
      }
    } catch {}
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2500);
  };

  const handleOpenDiscord = () => {
    Linking.openURL(DISCORD_INVITE_URL).catch(() => {});
  };

  const [copiedLinkedin, setCopiedLinkedin] = useState(false);
  const LINKEDIN_GROUP_URL = 'https://www.linkedin.com/groups/42835427/';

  const handleCopyLinkedin = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(LINKEDIN_GROUP_URL);
      } else {
        await Share.share({
          title: 'Únete a la comunidad de PronounceIt en LinkedIn',
          message: `Únete a nuestro grupo en LinkedIn para conectar con otros estudiantes y profesionales: ${LINKEDIN_GROUP_URL}`,
          url: LINKEDIN_GROUP_URL,
        });
      }
    } catch {}
    setCopiedLinkedin(true);
    setTimeout(() => setCopiedLinkedin(false), 2500);
  };

  const handleOpenLinkedin = () => {
    Linking.openURL(LINKEDIN_GROUP_URL).catch(() => {});
  };

  const [copiedEmail, setCopiedEmail] = useState(false);
  const SUPPORT_EMAIL = 'hola@oscarmangutdev.es';

  const handleCopyEmail = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
      } else {
        await Share.share({
          title: 'Correo de soporte de PronounceIt',
          message: SUPPORT_EMAIL,
        });
      }
    } catch {}
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleOpenEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

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
                {((currentUser?.full_name?.trim() || currentUser?.username?.trim() || currentUser?.email?.trim() || 'U').charAt(0) || 'U').toUpperCase()}
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

      {/* Idiomas de Aprendizaje & Tableros */}
      <View style={[styles.card, !isDark && styles.cardLight]}>
        <View style={styles.langHeaderRow}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Languages size={18} color={THEME.colors.crimsonLight} />
              <Text style={[styles.sectionTitle, !isDark && styles.titleLight, { marginBottom: 0 }]}>
                Idiomas de Aprendizaje
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, !isDark && styles.subtitleLight, { marginBottom: 0 }]}>
              Gestiona los tableros de cada idioma que estás aprendiendo. Puedes cambiar de tablero, añadir idiomas o eliminar los que ya no uses.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addLangHeaderBtn}
            onPress={() => setShowAddLangModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.addLangHeaderBtnText}>Agregar Idioma</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.langListContainer}>
          {languagesList.map((langCode) => {
            const isActive = langCode.toLowerCase() === (activeLanguage || 'en').toLowerCase();
            const langName = getLangName(langCode);
            const wordCount = vocabService.getWords(langCode).length;
            const canDelete = languagesList.length > 1;

            return (
              <View
                key={langCode}
                style={[
                  styles.langCardItem,
                  !isDark && styles.langCardItemLight,
                  isActive && styles.langCardItemActive,
                  isActive && !isDark && styles.langCardItemActiveLight,
                ]}
              >
                <View style={styles.langCardLeft}>
                  <CountryFlag code={langCode} size={28} />
                  <View style={{ marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.langCardName, !isDark && styles.titleLight]}>
                        {langName}
                      </Text>
                      {isActive && (
                        <View style={styles.activeLangBadge}>
                          <Text style={styles.activeLangBadgeText}>Tablero Activo</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.langCardCount, !isDark && styles.subtitleLight]}>
                      {wordCount} {wordCount === 1 ? 'palabra guardada' : 'palabras guardadas'}
                    </Text>
                  </View>
                </View>

                <View style={styles.langCardActions}>
                  {!isActive && onSelectLanguage && (
                    <TouchableOpacity
                      style={[styles.switchLangBtn, !isDark && styles.switchLangBtnLight]}
                      onPress={() => onSelectLanguage(langCode)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.switchLangBtnText, !isDark && styles.switchLangBtnTextLight]}>
                        Activar Tablero
                      </Text>
                    </TouchableOpacity>
                  )}

                  {canDelete ? (
                    <TouchableOpacity
                      style={styles.deleteLangBtn}
                      onPress={() => {
                        setLangToDelete(langCode);
                        setShowConfirmDeleteLangModal(true);
                      }}
                      activeOpacity={0.8}
                      accessibilityLabel={`Eliminar idioma ${langName}`}
                    >
                      <Trash2 size={16} color="#f87171" />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={styles.disabledDeleteLangBtn}
                      accessibilityLabel="No puedes eliminar tu único idioma"
                    >
                      <Trash2 size={16} color={!isDark ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {languagesList.length <= 1 && (
          <View style={[styles.singleLangNoteBox, !isDark && styles.singleLangNoteBoxLight]}>
            <Info size={15} color={!isDark ? '#0284c7' : '#38bdf8'} style={{ marginRight: 8, marginTop: 1, flexShrink: 0 }} />
            <Text style={[styles.singleLangNote, !isDark && styles.singleLangNoteLight]}>
              Para poder eliminar este idioma, primero debes agregar al menos otro idioma de aprendizaje.
            </Text>
          </View>
        )}
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

      {/* Conéctate con otros alumnos (Discord) */}
      <View style={[styles.discordCard, !isDark && styles.discordCardLight]}>
        {/* Encabezado: Icono Discord + Título + Badge + Subtítulo */}
        <View style={styles.discordHeaderRow}>
          <View style={styles.discordIconBadge}>
            <DiscordIcon size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.discordTitleRow}>
              <Text style={[styles.discordTitle, !isDark && styles.titleLight]}>
                Conéctate con otros alumnos
              </Text>
              <View style={[styles.discordPillBadge, !isDark && styles.discordPillBadgeLight]}>
                <View style={styles.discordPillDot} />
                <Text style={styles.discordPillText}>Salas de voz 24/7</Text>
              </View>
            </View>
            <Text style={[styles.discordDescription, !isDark && styles.discordDescriptionLight]}>
              Únete a las salas de charla para practicar conversación en inglés con otros compañeros. Comparte este enlace de invitación con otros alumnos para que se unan a las salas.
            </Text>
          </View>
        </View>

        {/* Fila del enlace para compartir */}
        <View style={styles.discordShareBlock}>
          <View style={styles.discordShareLabelRow}>
            <Share2 size={16} color={!isDark ? '#4f46e5' : '#818cf8'} style={{ marginRight: 8 }} />
            <Text style={[styles.discordShareLabel, !isDark && styles.discordShareLabelLight]}>
              Enlace para compartir e invitar a otros alumnos:
            </Text>
          </View>
          <Text
            style={[styles.discordShareLink, !isDark && styles.discordShareLinkLight]}
            selectable
          >
            {DISCORD_INVITE_URL}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.discordActionsRow}>
          <TouchableOpacity
            style={[styles.discordCopyBtn, !isDark && styles.discordCopyBtnLight]}
            onPress={handleCopyDiscord}
            activeOpacity={0.8}
          >
            {copiedDiscord ? (
              <Check size={16} color="#10b981" style={{ marginRight: 8 }} />
            ) : (
              <Copy size={16} color={!isDark ? '#334155' : '#ffffff'} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.discordCopyBtnText, !isDark && styles.discordCopyBtnTextLight, copiedDiscord && { color: '#10b981' }]}>
              {copiedDiscord ? '¡Enlace copiado!' : 'Copiar enlace'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.discordJoinBtn}
            onPress={handleOpenDiscord}
            activeOpacity={0.85}
          >
            <DiscordIcon size={18} color="#ffffff" />
            <Text style={styles.discordJoinBtnText}>Entrar a las Salas</Text>
            <ExternalLink size={15} color="#ffffff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Mensaje de Salas automáticas */}
        <View style={[styles.discordInfoBox, !isDark && styles.discordInfoBoxLight]}>
          <Info size={18} color={!isDark ? '#4f46e5' : '#818cf8'} style={{ marginTop: 1, marginRight: 10, flexShrink: 0 }} />
          <Text style={[styles.discordInfoText, !isDark && styles.discordInfoTextLight]}>
            <Text style={[styles.discordInfoBold, !isDark && styles.discordInfoBoldLight]}>Salas automáticas: </Text>
            Al entrar al canal de voz maestro en Discord, se creará automáticamente vuestra propia sala privada o grupal para charlar en inglés. Comparte el enlace con tus amigos para empezar a practicar juntos.
          </Text>
        </View>
      </View>

      {/* Comunidad y Grupo Oficial en LinkedIn */}
      <View style={[styles.linkedinCard, !isDark && styles.linkedinCardLight]}>
        {/* Encabezado: Icono LinkedIn + Título + Badge + Subtítulo */}
        <View style={styles.discordHeaderRow}>
          <View style={styles.linkedinIconBadge}>
            <LinkedinIcon size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.discordTitleRow}>
              <Text style={[styles.discordTitle, !isDark && styles.titleLight]}>
                Comunidad en LinkedIn
              </Text>
              <View style={[styles.linkedinPillBadge, !isDark && styles.linkedinPillBadgeLight]}>
                <View style={styles.discordPillDot} />
                <Text style={styles.linkedinPillText}>Networking & Empleo</Text>
              </View>
            </View>
            <Text style={[styles.discordDescription, !isDark && styles.discordDescriptionLight]}>
              Únete a nuestro grupo oficial en LinkedIn. Comparte tus avances, debates lingüísticos, consejos de entrevistas en inglés y conecta con otros profesionales y estudiantes.
            </Text>
          </View>
        </View>

        {/* Fila del enlace para compartir */}
        <View style={styles.discordShareBlock}>
          <View style={styles.discordShareLabelRow}>
            <Share2 size={16} color={!isDark ? '#0284c7' : '#38bdf8'} style={{ marginRight: 8 }} />
            <Text style={[styles.discordShareLabel, !isDark && styles.discordShareLabelLight]}>
              Enlace para compartir el grupo de LinkedIn:
            </Text>
          </View>
          <Text
            style={[styles.linkedinShareLink, !isDark && styles.linkedinShareLinkLight]}
            selectable
          >
            {LINKEDIN_GROUP_URL}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.discordActionsRow}>
          <TouchableOpacity
            style={[styles.discordCopyBtn, !isDark && styles.discordCopyBtnLight]}
            onPress={handleCopyLinkedin}
            activeOpacity={0.8}
          >
            {copiedLinkedin ? (
              <Check size={16} color="#10b981" style={{ marginRight: 8 }} />
            ) : (
              <Copy size={16} color={!isDark ? '#334155' : '#ffffff'} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.discordCopyBtnText, !isDark && styles.discordCopyBtnTextLight, copiedLinkedin && { color: '#10b981' }]}>
              {copiedLinkedin ? '¡Enlace copiado!' : 'Copiar enlace'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkedinJoinBtn}
            onPress={handleOpenLinkedin}
            activeOpacity={0.85}
          >
            <LinkedinIcon size={18} color="#ffffff" />
            <Text style={styles.discordJoinBtnText}>Unirme al Grupo</Text>
            <ExternalLink size={15} color="#ffffff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Mensaje informativo de networking */}
        <View style={[styles.linkedinInfoBox, !isDark && styles.linkedinInfoBoxLight]}>
          <Info size={18} color={!isDark ? '#0284c7' : '#38bdf8'} style={{ marginTop: 1, marginRight: 10, flexShrink: 0 }} />
          <Text style={[styles.discordInfoText, !isDark && styles.discordInfoTextLight]}>
            <Text style={[styles.discordInfoBold, !isDark && styles.discordInfoBoldLight]}>Networking profesional: </Text>
            Conecta con otros miembros de PronounceIt, amplía tu red de contactos y comparte oportunidades para practicar inglés en entornos laborales y entrevistas.
          </Text>
        </View>
      </View>

      {/* Atención y Soporte por Correo Electrónico */}
      <View style={[styles.emailCard, !isDark && styles.emailCardLight]}>
        {/* Encabezado: Icono Correo + Título + Badge + Subtítulo */}
        <View style={styles.discordHeaderRow}>
          <View style={styles.emailIconBadge}>
            <Mail size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.discordTitleRow}>
              <Text style={[styles.discordTitle, !isDark && styles.titleLight]}>
                Atención y Soporte por Correo
              </Text>
              <View style={[styles.emailPillBadge, !isDark && styles.emailPillBadgeLight]}>
                <View style={styles.discordPillDot} />
                <Text style={styles.emailPillText}>Soporte Directo</Text>
              </View>
            </View>
            <Text style={[styles.discordDescription, !isDark && styles.discordDescriptionLight]}>
              ¿Tienes dudas técnicas, sugerencias de nuevas palabras o consultas pedagógicas? Escríbenos directamente y te atenderemos de forma personalizada.
            </Text>
          </View>
        </View>

        {/* Fila del correo electrónico */}
        <View style={styles.discordShareBlock}>
          <View style={styles.discordShareLabelRow}>
            <Mail size={16} color={!isDark ? '#e62e4c' : '#f87171'} style={{ marginRight: 8 }} />
            <Text style={[styles.discordShareLabel, !isDark && styles.discordShareLabelLight]}>
              Dirección oficial de atención y soporte:
            </Text>
          </View>
          <Text
            style={[styles.emailShareLink, !isDark && styles.emailShareLinkLight]}
            selectable
          >
            {SUPPORT_EMAIL}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.discordActionsRow}>
          <TouchableOpacity
            style={[styles.discordCopyBtn, !isDark && styles.discordCopyBtnLight]}
            onPress={handleCopyEmail}
            activeOpacity={0.8}
          >
            {copiedEmail ? (
              <Check size={16} color="#10b981" style={{ marginRight: 8 }} />
            ) : (
              <Copy size={16} color={!isDark ? '#334155' : '#ffffff'} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.discordCopyBtnText, !isDark && styles.discordCopyBtnTextLight, copiedEmail && { color: '#10b981' }]}>
              {copiedEmail ? '¡Correo copiado!' : 'Copiar correo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emailJoinBtn}
            onPress={handleOpenEmail}
            activeOpacity={0.85}
          >
            <Send size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.discordJoinBtnText}>Escribir Correo</Text>
            <ExternalLink size={15} color="#ffffff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Mensaje informativo */}
        <View style={[styles.emailInfoBox, !isDark && styles.emailInfoBoxLight]}>
          <Info size={18} color={!isDark ? '#e62e4c' : '#f87171'} style={{ marginTop: 1, marginRight: 10, flexShrink: 0 }} />
          <Text style={[styles.discordInfoText, !isDark && styles.discordInfoTextLight]}>
            <Text style={[styles.discordInfoBold, !isDark && styles.discordInfoBoldLight]}>Atención personalizada: </Text>
            Revisamos y respondemos personalmente todas las solicitudes. Si tu consulta se refiere a tu cuenta o historial de tests, incluye tu usuario para darte una solución más rápida.
          </Text>
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
                {Platform.OS === 'web'
                  ? 'Instala la app oficial en tu Android (APK) o dispositivo Apple (iOS)'
                  : 'Descarga e instala la última versión oficial en tu Android (v1.6.9 APK)'}
              </Text>
            </View>
          </View>
          <View style={styles.downloadButtonsRow}>
            <TouchableOpacity
              style={styles.downloadApkBtn}
              onPress={() => Linking.openURL('https://github.com/oscarmangutduran/PronounceIt/releases/download/v1.6.9/PronounceIt-v1.6.9.apk')}
              activeOpacity={0.85}
            >
              <Download size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadApkBtnText}>
                {Platform.OS === 'web' ? 'Android (APK)' : 'Descargar APK'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[styles.downloadAppleBtn, !isDark && styles.downloadAppleBtnLight]}
                onPress={() => setShowAppleModal(true)}
                activeOpacity={0.85}
              >
                <Apple size={15} color={!isDark ? '#000000' : '#ffffff'} style={{ marginRight: 6 }} />
                <Text style={[styles.downloadAppleBtnText, !isDark && styles.downloadAppleBtnTextLight]}>Apple (iOS)</Text>
              </TouchableOpacity>
            )}
          </View>
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
          PronounceIt v1.6.8
        </Text>
        <Text style={{ fontSize: 11, color: THEME.colors.textSubtle, opacity: 0.75, marginTop: 4 }}>
          Versión 1.6.8 Oficial · Todos los derechos reservados
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

      <AppleInstallModal
        isOpen={showAppleModal}
        onClose={() => setShowAppleModal(false)}
        isDark={isDark}
      />

      {/* Modal de confirmación para eliminar idioma de aprendizaje */}
      <ConfirmModal
        isOpen={showConfirmDeleteLangModal}
        title="Eliminar idioma de aprendizaje"
        message={`¿Estás seguro de que deseas eliminar "${langToDelete ? getLangName(langToDelete) : 'este idioma'}" de tus idiomas de aprendizaje? Se eliminarán permanentemente todas las palabras, categorías y progreso de aprendizaje asociados a este tablero. Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar idioma"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={async () => {
          if (langToDelete) {
            const toDelete = langToDelete;
            setShowConfirmDeleteLangModal(false);
            setLangToDelete(null);
            await onDeleteLanguage?.(toDelete);
          }
        }}
        onCancel={() => {
          setShowConfirmDeleteLangModal(false);
          setLangToDelete(null);
        }}
        isDark={isDark}
      />

      {/* Modal para agregar idioma desde configuración */}
      <LanguagePickerModal
        isOpen={showAddLangModal}
        onClose={() => setShowAddLangModal(false)}
        selectedCode={activeLanguage}
        onSelect={(code) => {
          setShowAddLangModal(false);
          onAddLanguage?.(code);
        }}
        title="Agregar idioma para aprender"
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
  downloadButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
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
  downloadAppleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
  },
  downloadAppleBtnLight: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  downloadAppleBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadAppleBtnTextLight: {
    color: '#ffffff',
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
  // Discord Community Card
  discordCard: {
    backgroundColor: '#121626',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.28)',
    borderRadius: THEME.radius.lg,
    padding: 20,
    marginBottom: 16,
    width: '100%',
  },
  discordCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(88, 101, 242, 0.25)',
    shadowColor: '#5865F2',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  discordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  discordIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5865F2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5865F2',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  discordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  discordTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  discordPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.35)',
  },
  discordPillBadgeLight: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderColor: 'rgba(88, 101, 242, 0.25)',
  },
  discordPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  discordPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  discordDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#94a3b8',
  },
  discordDescriptionLight: {
    color: '#475569',
  },
  discordShareBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  discordShareBlockLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  discordShareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  discordShareLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  discordShareLabelLight: {
    color: '#0f172a',
  },
  discordShareLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    marginLeft: 24,
  },
  discordShareLinkLight: {
    color: '#4f46e5',
  },
  discordActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  discordCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  discordCopyBtnLight: {
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  discordCopyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  discordCopyBtnTextLight: {
    color: '#1e293b',
  },
  discordJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#5865F2',
    gap: 8,
    shadowColor: '#5865F2',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  discordJoinBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  discordInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(88, 101, 242, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.22)',
    borderRadius: 10,
    padding: 12,
  },
  discordInfoBoxLight: {
    backgroundColor: 'rgba(88, 101, 242, 0.06)',
    borderColor: 'rgba(88, 101, 242, 0.2)',
  },
  discordInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#94a3b8',
  },
  discordInfoTextLight: {
    color: '#475569',
  },
  discordInfoBold: {
    fontWeight: '800',
    color: '#ffffff',
  },
  discordInfoBoldLight: {
    color: '#0f172a',
  },
  // LinkedIn Community Card
  linkedinCard: {
    backgroundColor: '#0c1322',
    borderWidth: 1,
    borderColor: 'rgba(10, 102, 194, 0.35)',
    borderRadius: THEME.radius.lg,
    padding: 20,
    marginBottom: 16,
    width: '100%',
  },
  linkedinCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(10, 102, 194, 0.25)',
    shadowColor: '#0A66C2',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  linkedinIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0A66C2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A66C2',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  linkedinPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 102, 194, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10, 102, 194, 0.35)',
  },
  linkedinPillBadgeLight: {
    backgroundColor: 'rgba(10, 102, 194, 0.1)',
    borderColor: 'rgba(10, 102, 194, 0.25)',
  },
  linkedinPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  linkedinShareLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    marginLeft: 24,
  },
  linkedinShareLinkLight: {
    color: '#0284c7',
  },
  linkedinJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0A66C2',
    gap: 8,
    shadowColor: '#0A66C2',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  linkedinInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(10, 102, 194, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(10, 102, 194, 0.25)',
    borderRadius: 10,
    padding: 12,
  },
  linkedinInfoBoxLight: {
    backgroundColor: 'rgba(10, 102, 194, 0.06)',
    borderColor: 'rgba(10, 102, 194, 0.2)',
  },
  // Email Community/Support Card
  emailCard: {
    backgroundColor: '#161014',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    borderRadius: THEME.radius.lg,
    padding: 20,
    marginBottom: 16,
    width: '100%',
  },
  emailCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(230, 46, 76, 0.25)',
    shadowColor: '#e62e4c',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  emailIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e62e4c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e62e4c',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  emailPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
  },
  emailPillBadgeLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.1)',
    borderColor: 'rgba(230, 46, 76, 0.25)',
  },
  emailPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  emailShareLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f87171',
    marginLeft: 24,
  },
  emailShareLinkLight: {
    color: '#e62e4c',
  },
  emailJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#e62e4c',
    gap: 8,
    shadowColor: '#e62e4c',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  emailInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    borderRadius: 10,
    padding: 12,
  },
  emailInfoBoxLight: {
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
    borderColor: 'rgba(230, 46, 76, 0.2)',
  },

  // Language management card styles
  langHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  addLangHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  addLangHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  langListContainer: {
    gap: 10,
  },
  langCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langCardItemLight: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  langCardItemActive: {
    borderColor: 'rgba(230, 46, 76, 0.4)',
    backgroundColor: 'rgba(230, 46, 76, 0.06)',
  },
  langCardItemActiveLight: {
    borderColor: 'rgba(230, 46, 76, 0.35)',
    backgroundColor: 'rgba(230, 46, 76, 0.04)',
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  langCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeLangBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(230, 46, 76, 0.2)',
    borderWidth: 1,
    borderColor: THEME.colors.crimson,
  },
  activeLangBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.crimsonLight,
    textTransform: 'uppercase',
  },
  langCardCount: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  langCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLangBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  switchLangBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  switchLangBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchLangBtnTextLight: {
    color: '#1e293b',
  },
  deleteLangBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  disabledDeleteLangBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  singleLangNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  singleLangNoteBoxLight: {
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  singleLangNote: {
    fontSize: 12,
    color: '#93c5fd',
    flex: 1,
    lineHeight: 16,
  },
  singleLangNoteLight: {
    color: '#0369a1',
  },
});

