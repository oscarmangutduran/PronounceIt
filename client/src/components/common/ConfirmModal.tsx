import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  X,
} from 'lucide-react-native';
import { THEME } from '../../theme';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string | null;
  variant?: ModalVariant;
  onConfirm: () => void;
  onCancel?: () => void;
  isDark?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isDark = true,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <View style={[styles.iconCircle, styles.iconDanger]}>
            <Trash2 size={22} color="#f87171" />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconCircle, styles.iconWarning]}>
            <AlertTriangle size={22} color="#fbbf24" />
          </View>
        );
      case 'success':
        return (
          <View style={[styles.iconCircle, styles.iconSuccess]}>
            <CheckCircle2 size={22} color="#34d399" />
          </View>
        );
      case 'info':
      default:
        return (
          <View style={[styles.iconCircle, styles.iconInfo]}>
            <Info size={22} color="#60a5fa" />
          </View>
        );
    }
  };

  const getConfirmButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return styles.btnDanger;
      case 'warning':
        return styles.btnWarning;
      case 'success':
        return styles.btnSuccess;
      case 'info':
      default:
        return styles.btnInfo;
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, !isDark && styles.cardLight]}>
          {/* Close button in corner if cancelable */}
          {onCancel && (
            <TouchableOpacity
              style={styles.cornerClose}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <X size={16} color={!isDark ? '#64748b' : THEME.colors.textSubtle} />
            </TouchableOpacity>
          )}

          {/* Icon Badge */}
          {renderIcon()}

          {/* Text Content */}
          <Text style={[styles.title, !isDark && styles.titleLight]}>{title}</Text>
          <Text style={[styles.message, !isDark && styles.messageLight]}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {cancelText && onCancel && (
              <TouchableOpacity
                style={[styles.cancelBtn, !isDark && styles.cancelBtnLight]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, !isDark && styles.cancelBtnTextLight]}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                getConfirmButtonStyle(),
                !cancelText && { flex: 1 },
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#161026',
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  cornerClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  iconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  confirmBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    backgroundColor: '#e62e4c',
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  btnWarning: {
    backgroundColor: '#d97706',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  btnSuccess: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  btnInfo: {
    backgroundColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
  },
  titleLight: {
    color: '#0f172a',
  },
  messageLight: {
    color: '#475569',
  },
  cancelBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  cancelBtnTextLight: {
    color: '#334155',
  },
});
