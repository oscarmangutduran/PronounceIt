import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  X,
  Sparkles,
  Check,
  Folder,
  BookOpen,
  Pin,
} from 'lucide-react-native';
import { WordItem, CategoryItem } from '../../types';
import { autoEnrichWord } from '../../lib/dictionaryService';
import { THEME } from '../../theme';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Omit<WordItem, 'id'>) => void;
  initialWord?: WordItem | null;
  categories?: CategoryItem[];
  defaultCategoryGroup?: string;
  defaultCategorySub?: string;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWord,
  categories = [],
  defaultCategoryGroup,
  defaultCategorySub,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [word, setWord] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('General');
  const [categorySub, setCategorySub] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word);
      setCategoryGroup(initialWord.categoryGroup || 'General');
      setCategorySub(initialWord.categorySub || '');
    } else {
      setWord('');
      setCategoryGroup(defaultCategoryGroup || 'General');
      setCategorySub(defaultCategorySub || '');
    }
  }, [initialWord, defaultCategoryGroup, defaultCategorySub, isOpen]);

  // Find subcategories for the current category group
  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === categoryGroup.toLowerCase()
  );
  const availableSubcategories = activeCategoryObj?.subcategories || [];

  const handleSave = async () => {
    if (!word.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Por favor ingresa la palabra en inglés.');
      } else {
        Alert.alert('Campo requerido', 'Por favor ingresa la palabra en inglés.');
      }
      return;
    }

    setSaving(true);
    let enrichedData: any = null;
    try {
      enrichedData = await autoEnrichWord(word.trim());
    } catch (e) {
      console.warn('Auto enrich error on save:', e);
    }

    const finalGroup = categoryGroup.trim() || enrichedData?.categoryGroup || 'General';
    const finalSub = categorySub.trim() || enrichedData?.categorySub || '';

    onSave({
      word: word.trim(),
      translation: enrichedData?.translation || (initialWord ? initialWord.translation : word.trim()),
      phoneticGuide:
        enrichedData?.phoneticGuide ||
        (initialWord ? initialWord.phoneticGuide : `"${word.trim().toLowerCase()}"`),
      ipa: enrichedData?.ipa || (initialWord ? initialWord.ipa : ''),
      definition: enrichedData?.definition || (initialWord ? initialWord.definition : ''),
      exampleEn: enrichedData?.exampleEn || (initialWord ? initialWord.exampleEn : ''),
      exampleEs: enrichedData?.exampleEs || (initialWord ? initialWord.exampleEs : ''),
      level: enrichedData?.level || (initialWord ? initialWord.level : 'B1'),
      partOfSpeech: enrichedData?.partOfSpeech || (initialWord ? initialWord.partOfSpeech : 'noun'),
      categoryGroup: finalGroup,
      categorySub: finalSub,
      status: initialWord ? initialWord.status : 'nueva',
      isFavorite: initialWord ? initialWord.isFavorite : false,
      srsIntervalDays: initialWord?.srsIntervalDays ?? 1,
    });

    setSaving(false);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
        <View style={[styles.modalCard, isDesktop && styles.modalCardDesktop]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIcon}>
                <BookOpen size={16} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={styles.headerTitle}>
                {initialWord ? 'Editar Palabra' : 'Nueva Palabra'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Info notice */}
            <View style={styles.noticeBox}>
              <Sparkles size={14} color="#ff4d6d" style={{ marginTop: 2 }} />
              <Text style={styles.noticeText}>
                Ingresa únicamente la palabra y su ubicación. La traducción, fonética IPA, pronunciación y ejemplos se enriquecerán automáticamente.
              </Text>
            </View>

            {/* 1. Palabra en Inglés */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Palabra en Inglés *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'word' && styles.inputFocused,
                ]}
                placeholder="Ej: breakthrough, ubiquitous..."
                placeholderTextColor={THEME.colors.textSubtle}
                value={word}
                onChangeText={setWord}
                onFocus={() => setFocusedField('word')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {/* 2. Categoría */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Categoría *</Text>
                <Text style={styles.sublabel}>Temario o grupo</Text>
              </View>

              {/* Quick chips for existing categories */}
              {categories.length > 0 && (
                <View style={styles.chipsRow}>
                  {categories.map((cat) => {
                    const isSelected = categoryGroup.toLowerCase() === cat.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setCategoryGroup(cat.name)}
                        activeOpacity={0.7}
                      >
                        <Folder
                          size={12}
                          color={isSelected ? '#ffffff' : THEME.colors.crimsonLight}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TextInput
                style={[
                  styles.input,
                  focusedField === 'categoryGroup' && styles.inputFocused,
                ]}
                placeholder="Ej: Grammar, Readings, Negocios..."
                placeholderTextColor={THEME.colors.textSubtle}
                value={categoryGroup}
                onChangeText={setCategoryGroup}
                onFocus={() => setFocusedField('categoryGroup')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* 3. Subcategoría */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Subcategoría</Text>
                <Text style={styles.sublabel}>Opcional (capítulo o tema)</Text>
              </View>

              {/* Quick chips for subcategories */}
              {availableSubcategories.length > 0 && (
                <View style={styles.chipsRow}>
                  {availableSubcategories.map((sub) => {
                    const isSelected = categorySub.toLowerCase() === sub.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setCategorySub(sub.name)}
                        activeOpacity={0.7}
                      >
                        <Pin
                          size={11}
                          color={isSelected ? '#ffffff' : THEME.colors.textSubtle}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TextInput
                style={[
                  styles.input,
                  focusedField === 'categorySub' && styles.inputFocused,
                ]}
                placeholder="Ej: The little Prince, Phrasal Verbs..."
                placeholderTextColor={THEME.colors.textSubtle}
                value={categorySub}
                onChangeText={setCategorySub}
                onFocus={() => setFocusedField('categorySub')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </ScrollView>

          {/* Modal Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Enriqueciendo...</Text>
                </>
              ) : (
                <>
                  <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Guardar Palabra</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#161026',
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  modalCardDesktop: {
    width: '100%',
    maxWidth: 480,
    borderRadius: THEME.radius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    borderRadius: THEME.radius.md,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#ffb3c1',
    lineHeight: 17,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sublabel: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  inputFocused: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
