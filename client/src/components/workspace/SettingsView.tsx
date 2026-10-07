import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Settings,
  User,
  Volume2,
  Key,
  LogOut,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react-native';
import { UserProfile } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { getGeminiApiKey, setGeminiApiKey } from '../../lib/dictionaryService';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onLogout }) => {
  const [audioSettings, setAudioSettings] = useState(() => vocabService.getAudioSettings());
  const [apiKey, setApiKey] = useState(() => getGeminiApiKey());
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const testVoice = () => {
    vocabService.speak('PronounceIt provides instant native pronunciation for all your words.');
  };

  const confirmReset = () => {
    setShowResetModal(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Settings size={24} color={THEME.colors.crimsonLight} />
        </View>
        <View>
          <Text style={styles.title}>Configuración</Text>
          <Text style={styles.subtitle}>Preferencias de audio, cuenta e IA</Text>
        </View>
      </View>

      {/* User profile card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cuenta de Usuario</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {currentUser?.full_name || currentUser?.username || 'Usuario Invitado'}
            </Text>
            <Text style={styles.profileEmail}>
              {currentUser?.email || 'Sin correo asociado'}
            </Text>
          </View>
        </View>
      </View>

      {/* Speech Audio Voice Settings */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Voz & Síntesis de Pronunciación</Text>
        <Text style={styles.sectionSubtitle}>
          Ajusta la velocidad de reproducción para practicar a tu propio ritmo.
        </Text>

        <View style={styles.rateOptions}>
          {[0.75, 0.85, 0.95, 1.05].map((rate) => (
            <TouchableOpacity
              key={rate}
              style={[
                styles.rateBtn,
                audioSettings.rate === rate && styles.rateBtnActive,
              ]}
              onPress={() => handleUpdateRate(rate)}
            >
              <Text
                style={[
                  styles.rateBtnText,
                  audioSettings.rate === rate && styles.rateBtnTextActive,
                ]}
              >
                {rate}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.testVoiceBtn} onPress={testVoice} activeOpacity={0.8}>
          <Volume2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.testVoiceBtnText}>Probar Voz en Inglés</Text>
        </TouchableOpacity>
      </View>

      {/* Gemini AI API Key */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clave API de Google Gemini (Opcional)</Text>
        <Text style={styles.sectionSubtitle}>
          Permite autocompletar fonética, definiciones y ejemplos con IA en tiempo real.
        </Text>

        <View style={styles.keyInputRow}>
          <TextInput
            style={styles.keyInput}
            placeholder="AIzaSy..."
            placeholderTextColor={THEME.colors.textSubtle}
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
            {isSavedKey ? (
              <Check size={18} color="#ffffff" />
            ) : (
              <Text style={styles.saveKeyText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Maintenance & Data */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos & Restablecimiento</Text>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={confirmReset}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color="#f87171" style={{ marginRight: 8 }} />
          <Text style={styles.resetBtnText}>Restablecer palabras a estado inicial</Text>
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => setShowLogoutModal(true)}
        activeOpacity={0.85}
      >
        <LogOut size={16} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Restablecer Vocabulario"
        message="¿Seguro que deseas reiniciar todo el vocabulario a los valores iniciales? Esta acción eliminará las palabras agregadas recientemente."
        confirmText="Restablecer"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setShowResetModal(false);
          vocabService.resetToDefault();
        }}
        onCancel={() => setShowResetModal(false)}
      />

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
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: THEME.colors.bgDark,
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
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
  },
  resetBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
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
});
