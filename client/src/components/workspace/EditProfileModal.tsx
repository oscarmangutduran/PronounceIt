import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { X, User, Check } from 'lucide-react-native';
import { UserProfile } from '../../types';
import { firebaseService } from '../../lib/firebaseClient';
import { THEME } from '../../theme';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProfileUpdated: (user: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setUsername(currentUser.username || '');
    }
  }, [currentUser, isOpen]);

  const handleSave = async () => {
    if (!currentUser) return;

    const updated: UserProfile = {
      ...currentUser,
      full_name: fullName.trim() || currentUser.full_name,
      username: username.trim() || currentUser.username,
    };

    await firebaseService.updateProfileData({
      full_name: updated.full_name,
      username: updated.username,
    });

    onProfileUpdated(updated);
    onClose();
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <User size={16} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={styles.title}>Editar Perfil</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre"
                placeholderTextColor={THEME.colors.textSubtle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de Usuario</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="usuario123"
                placeholderTextColor={THEME.colors.textSubtle}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Guardar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    gap: 14,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 44,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.crimson,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
