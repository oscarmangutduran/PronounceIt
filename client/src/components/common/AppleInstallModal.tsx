import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Apple,
  Share2,
  SquarePlus,
  Sparkles,
  Check,
  Copy,
  X,
  ExternalLink,
  Smartphone,
} from 'lucide-react-native';
import { THEME } from '../../theme';

export interface AppleInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const AppleInstallModal: React.FC<AppleInstallModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent || '';
      const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIosDevice(isIos);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://pronounceit.vercel.app';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pronounceit.vercel.app';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalCard, !isDark && styles.modalCardLight]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.appleIconBox, !isDark && styles.appleIconBoxLight]}>
                <Apple size={22} color={!isDark ? '#000000' : '#ffffff'} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.title, !isDark && styles.textBlack]}>
                  Instalar en Apple (iOS)
                </Text>
                <Text style={[styles.subtitle, !isDark && styles.textMutedLight]}>
                  iPhone, iPad & Mac
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, !isDark && styles.closeBtnLight]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={18} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Badge Info */}
            <View style={[styles.infoBanner, !isDark && styles.infoBannerLight]}>
              <Sparkles size={16} color={THEME.colors.crimsonLight} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={[styles.infoBannerText, !isDark && styles.infoBannerTextLight]}>
                PronounceIt funciona como una <Text style={{ fontWeight: '700' }}>App Nativa en iOS (PWA)</Text>: sin descargas pesadas de tienda, rápida, sin barras de navegación y con acceso directo en tu pantalla de inicio.
              </Text>
            </View>

            {/* Pasos de Instalación */}
            <Text style={[styles.stepsHeading, !isDark && styles.textBlack]}>
              Pasos para instalar en tu iPhone / iPad:
            </Text>

            {/* Paso 1 */}
            <View style={[styles.stepItem, !isDark && styles.stepItemLight]}>
              <View style={[styles.stepNumber, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, !isDark && styles.textBlack]}>
                    Abre en Safari y pulsa Compartir
                  </Text>
                  <Share2 size={16} color="#3b82f6" style={{ marginLeft: 6 }} />
                </View>
                <Text style={[styles.stepDesc, !isDark && styles.textMutedLight]}>
                  En la barra inferior de Safari en tu iPhone, pulsa el botón <Text style={{ fontWeight: '700' }}>Compartir</Text> (el icono cuadrado con una flecha apuntando arriba).
                </Text>
              </View>
            </View>

            {/* Paso 2 */}
            <View style={[styles.stepItem, !isDark && styles.stepItemLight]}>
              <View style={[styles.stepNumber, { backgroundColor: '#10b981' }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, !isDark && styles.textBlack]}>
                    Añadir a pantalla de inicio
                  </Text>
                  <SquarePlus size={16} color="#10b981" style={{ marginLeft: 6 }} />
                </View>
                <Text style={[styles.stepDesc, !isDark && styles.textMutedLight]}>
                  En el menú de acciones que aparece, desplázate hacia abajo y selecciona <Text style={{ fontWeight: '700' }}>"Añadir a pantalla de inicio"</Text>.
                </Text>
              </View>
            </View>

            {/* Paso 3 */}
            <View style={[styles.stepItem, !isDark && styles.stepItemLight]}>
              <View style={[styles.stepNumber, { backgroundColor: THEME.colors.crimson }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, !isDark && styles.textBlack]}>
                    Pulsa "Añadir" y ¡listo!
                  </Text>
                  <Check size={16} color={THEME.colors.crimsonLight} style={{ marginLeft: 6 }} />
                </View>
                <Text style={[styles.stepDesc, !isDark && styles.textMutedLight]}>
                  Toca <Text style={{ fontWeight: '700' }}>Añadir</Text> en la esquina superior derecha. El icono de PronounceIt se creará en tu pantalla y abrirá a pantalla completa.
                </Text>
              </View>
            </View>

            {/* Enlace para compartir o abrir en Safari */}
            <View style={[styles.urlCard, !isDark && styles.urlCardLight]}>
              <Text style={[styles.urlLabel, !isDark && styles.textMutedLight]}>
                Enlace oficial para abrir en Safari en tu dispositivo Apple:
              </Text>
              <View style={styles.urlRow}>
                <Text style={[styles.urlText, !isDark && styles.textBlack]} numberOfLines={1}>
                  {currentUrl}
                </Text>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                  onPress={handleCopyLink}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <>
                      <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnText}>¡Copiado!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnText}>Copiar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, !isDark && styles.footerLight]}>
            <TouchableOpacity
              style={[styles.primaryBtn, !isDark && styles.primaryBtnLight]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, !isDark && styles.primaryBtnTextLight]}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 24,
    overflow: 'hidden',
  },
  modalCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIconBoxLight: {
    backgroundColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  textBlack: {
    color: '#0f172a',
  },
  textMutedLight: {
    color: '#64748b',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLight: {
    backgroundColor: '#f1f5f9',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(230, 46, 76, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.2)',
    marginBottom: 18,
  },
  infoBannerLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#fbcfe8',
  },
  infoBannerTextLight: {
    color: '#9f1239',
  },
  stepsHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepItemLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
  },
  urlCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  urlCardLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  urlLabel: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#10b981',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'flex-end',
  },
  footerLight: {
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  primaryBtn: {
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnLight: {
    backgroundColor: '#0f172a',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  primaryBtnTextLight: {
    color: '#ffffff',
  },
});
