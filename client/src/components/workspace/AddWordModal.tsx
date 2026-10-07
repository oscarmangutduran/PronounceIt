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
} from 'react-native';
import {
  X,
  Volume2,
  Sparkles,
  Check,
  Folder,
  BookOpen,
} from 'lucide-react-native';
import { WordItem, WordLevel, CategoryItem } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
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
  defaultCategoryGroup,
  defaultCategorySub,
}) => {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [phoneticGuide, setPhoneticGuide] = useState('');
  const [ipa, setIpa] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleEs, setExampleEs] = useState('');
  const [level, setLevel] = useState<WordLevel>('B1');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [categoryGroup, setCategoryGroup] = useState('General');
  const [categorySub, setCategorySub] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);

  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word);
      setTranslation(initialWord.translation);
      setPhoneticGuide(initialWord.phoneticGuide || '');
      setIpa(initialWord.ipa || '');
      setDefinition(initialWord.definition || '');
      setExampleEn(initialWord.exampleEn || '');
      setExampleEs(initialWord.exampleEs || '');
      setLevel(initialWord.level || 'B1');
      setPartOfSpeech(initialWord.partOfSpeech || 'noun');
      setCategoryGroup(initialWord.categoryGroup || 'General');
      setCategorySub(initialWord.categorySub || '');
    } else {
      setWord('');
      setTranslation('');
      setPhoneticGuide('');
      setIpa('');
      setDefinition('');
      setExampleEn('');
      setExampleEs('');
      setLevel('B1');
      setPartOfSpeech('noun');
      setCategoryGroup(defaultCategoryGroup || 'General');
      setCategorySub(defaultCategorySub || '');
    }
  }, [initialWord, defaultCategoryGroup, defaultCategorySub, isOpen]);

  const handleAutoEnrich = async () => {
    if (!word.trim()) {
      Alert.alert('Aviso', 'Escribe primero una palabra en inglés.');
      return;
    }

    setLoadingAuto(true);
    try {
      const result = await autoEnrichWord(word.trim());
      if (result) {
        if (result.translation) setTranslation(result.translation);
        if (result.phoneticGuide) setPhoneticGuide(result.phoneticGuide);
        if (result.ipa) setIpa(result.ipa);
        if (result.definition) setDefinition(result.definition);
        if (result.exampleEn) setExampleEn(result.exampleEn);
        if (result.exampleEs) setExampleEs(result.exampleEs);
        if (result.level) setLevel(result.level);
        if (result.partOfSpeech) setPartOfSpeech(result.partOfSpeech);
        if (result.categoryGroup) setCategoryGroup(result.categoryGroup);
        if (result.categorySub) setCategorySub(result.categorySub);
      }
    } catch (e) {
      console.warn('Auto enrich error:', e);
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleSave = () => {
    if (!word.trim() || !translation.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa la palabra y su traducción.');
      return;
    }

    onSave({
      word: word.trim(),
      translation: translation.trim(),
      phoneticGuide: phoneticGuide.trim() || `"${word.trim().toLowerCase()}"`,
      ipa: ipa.trim(),
      definition: definition.trim(),
      exampleEn: exampleEn.trim(),
      exampleEs: exampleEs.trim(),
      level,
      partOfSpeech,
      categoryGroup: categoryGroup.trim() || 'General',
      categorySub: categorySub.trim(),
      status: initialWord ? initialWord.status : 'nueva',
      isFavorite: initialWord ? initialWord.isFavorite : false,
      srsIntervalDays: initialWord?.srsIntervalDays ?? 1,
    });

    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            {/* Word Input + AI enrichment button */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Palabra en Inglés *</Text>
              <View style={styles.wordInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ej: breakthrough"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={word}
                  onChangeText={setWord}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleAutoEnrich}
                  disabled={loadingAuto}
                >
                  {loadingAuto ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.aiButtonText}>IA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Translation */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Traducción al Español *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: avance importante / gran descubrimiento"
                placeholderTextColor={THEME.colors.textSubtle}
                value={translation}
                onChangeText={setTranslation}
              />
            </View>

            {/* Phonetic guide */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Pronunciación en Español (Guía)</Text>
                {word.trim() ? (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => vocabService.speak(word)}
                  >
                    <Volume2 size={13} color={THEME.colors.crimsonLight} />
                    <Text style={{ fontSize: 11, color: THEME.colors.crimsonLight }}>
                      Escuchar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                style={styles.input}
                placeholder='Ej: "breeik-thruu"'
                placeholderTextColor={THEME.colors.textSubtle}
                value={phoneticGuide}
                onChangeText={setPhoneticGuide}
              />
            </View>

            {/* IPA & Level */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Fonética IPA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: /ˈbreɪkˌθruː/"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={ipa}
                  onChangeText={setIpa}
                />
              </View>

              <View style={[styles.inputGroup, { width: 100 }]}>
                <Text style={styles.label}>Nivel MCER</Text>
                <View style={styles.levelPillRow}>
                  {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.miniLevelPill,
                        level === lvl && styles.miniLevelPillActive,
                      ]}
                      onPress={() => setLevel(lvl as WordLevel)}
                    >
                      <Text
                        style={[
                          styles.miniLevelPillText,
                          level === lvl && styles.miniLevelPillTextActive,
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Example English */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frase de Ejemplo (Inglés)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ej: Scientists made a major breakthrough."
                placeholderTextColor={THEME.colors.textSubtle}
                value={exampleEn}
                onChangeText={setExampleEn}
                multiline
              />
            </View>

            {/* Example Spanish */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Traducción de Ejemplo (Español)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ej: Los científicos lograron un avance importante."
                placeholderTextColor={THEME.colors.textSubtle}
                value={exampleEs}
                onChangeText={setExampleEs}
                multiline
              />
            </View>

            {/* Category group & sub */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Categoría Grupo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Readings / Business"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={categoryGroup}
                  onChangeText={setCategoryGroup}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Subcategoría</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Cap. 1 / Vocabulario"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={categorySub}
                  onChangeText={setCategorySub}
                />
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>Guardar Palabra</Text>
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
  modalCard: {
    backgroundColor: THEME.colors.bgCard,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
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
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  wordInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
  },
  aiButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  levelPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniLevelPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  miniLevelPillActive: {
    backgroundColor: THEME.colors.crimson,
  },
  miniLevelPillText: {
    color: THEME.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  miniLevelPillTextActive: {
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
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
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
