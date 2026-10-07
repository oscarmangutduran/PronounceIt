import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { X, Folder, Layers, Sparkles } from 'lucide-react-native';
import { THEME } from '../../theme';

export type CategoryFormMode =
  | 'create_category'
  | 'edit_category'
  | 'create_subcategory'
  | 'edit_subcategory';

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: CategoryFormMode;
  initialValue?: string;
  categoryName?: string; // Parent category name when creating/editing subcategories
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  mode,
  initialValue = '',
  categoryName,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setError(null);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const isSubcategory = mode === 'create_subcategory' || mode === 'edit_subcategory';
  const isEditing = mode === 'edit_category' || mode === 'edit_subcategory';

  const title = isEditing
    ? isSubcategory
      ? 'Editar Subcategoría'
      : 'Editar Categoría'
    : isSubcategory
    ? `Nueva Subcategoría en "${categoryName || 'Categoría'}"`
    : 'Nueva Categoría';

  const subtitle = isEditing
    ? 'Cambiar el nombre actualizará automáticamente todas las palabras asociadas.'
    : isSubcategory
    ? 'Organiza términos específicos dentro de este temario principal.'
    : 'Crea un temario o sección temática para agrupar tu vocabulario.';

  const placeholder = isSubcategory
    ? 'Ej: Phrasal Verbs, Familia, Comida, Viajes...'
    : 'Ej: Gramática, Negocios, Lecturas, Coloquial...';

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Por favor ingresa un nombre.');
      return;
    }
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                {isSubcategory ? (
                  <Layers size={18} color="#ff4d6d" />
                ) : (
                  <Folder size={18} color="#ff4d6d" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.label}>
              {isSubcategory ? 'Nombre de la subcategoría' : 'Nombre de la categoría'}
            </Text>
            <TextInput
              style={[
                styles.input,
                isFocused && styles.inputFocused,
                !!error && styles.inputError,
              ]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError(null);
              }}
              placeholder={placeholder}
              placeholderTextColor={THEME.colors.textSubtle}
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onSubmitEditing={handleSubmit}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>
                {isEditing ? 'Guardar Cambios' : 'Crear'}
              </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#161026',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f0c18',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  inputFocused: {
    borderColor: '#e62e4c',
    backgroundColor: '#130d20',
  },
  inputError: {
    borderColor: '#f87171',
  },
  errorText: {
    fontSize: 11,
    color: '#f87171',
    marginTop: 6,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#e62e4c',
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
