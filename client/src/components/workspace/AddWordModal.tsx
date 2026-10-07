import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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
  ChevronDown,
  ChevronUp,
  Plus,
  Volume2,
} from 'lucide-react-native';
import { WordItem, CategoryItem } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { autoEnrichWord, AutoEnrichResult } from '../../lib/dictionaryService';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

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
  const [categoryGroup, setCategoryGroup] = useState('Grammar');
  const [categorySub, setCategorySub] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live Auto-Enrich Preview
  const [previewData, setPreviewData] = useState<AutoEnrichResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Dropdown states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);

  // Get all unique categories (from prop + vocabStore)
  const allCategories = useMemo(() => {
    const list: { name: string; count?: number; subcategories?: string[] }[] = [];
    const seen = new Set<string>();

    // 1. From categories prop
    categories.forEach((cat) => {
      if (!seen.has(cat.name.toLowerCase())) {
        seen.add(cat.name.toLowerCase());
        list.push({
          name: cat.name,
          count: cat.count,
          subcategories: cat.subcategories?.map((s) => s.name) || [],
        });
      }
    });

    // 2. From words in storage
    const storedWords = vocabService.getWords();
    storedWords.forEach((w) => {
      if (w.categoryGroup && !seen.has(w.categoryGroup.toLowerCase())) {
        seen.add(w.categoryGroup.toLowerCase());
        list.push({
          name: w.categoryGroup,
          count: 0,
          subcategories: [],
        });
      }
    });

    // Defaults if empty
    if (list.length === 0) {
      list.push({ name: 'Grammar', count: 0, subcategories: [] });
      list.push({ name: 'Readings', count: 0, subcategories: ['The little Prince'] });
    }

    return list;
  }, [categories]);

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    const set = new Set<string>();
    const currentCat = allCategories.find(
      (c) => c.name.toLowerCase() === categoryGroup.toLowerCase()
    );
    if (currentCat?.subcategories) {
      currentCat.subcategories.forEach((s) => set.add(s));
    }

    // Check words in storage
    const storedWords = vocabService.getWords();
    storedWords.forEach((w) => {
      if (
        w.categoryGroup?.toLowerCase() === categoryGroup.toLowerCase() &&
        w.categorySub
      ) {
        set.add(w.categorySub);
      }
    });

    return Array.from(set);
  }, [allCategories, categoryGroup]);

  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word);
      setCategoryGroup(initialWord.categoryGroup || 'Grammar');
      setCategorySub(initialWord.categorySub || '');
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      setPreviewData({
        word: initialWord.word,
        translation: initialWord.translation,
        ipa: initialWord.ipa,
        phoneticGuide: initialWord.phoneticGuide,
        phoneticNote: initialWord.phoneticNote || '',
        definition: initialWord.definition || '',
        exampleEn: initialWord.exampleEn || (initialWord as any).example || '',
        exampleEs: initialWord.exampleEs || (initialWord as any).exampleTranslation || '',
        level: initialWord.level,
        partOfSpeech: initialWord.partOfSpeech,
        categoryGroup: initialWord.categoryGroup,
        categorySub: initialWord.categorySub,
      });
    } else {
      setWord('');
      const defaultGroup = defaultCategoryGroup || (allCategories[0]?.name || 'Grammar');
      setCategoryGroup(defaultGroup);
      setCategorySub(defaultCategorySub || '');
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      setPreviewData(null);
    }
    setIsCategoryOpen(false);
    setIsSubcategoryOpen(false);
  }, [initialWord, defaultCategoryGroup, defaultCategorySub, isOpen, allCategories]);

  // Debounced live auto-enrichment as the user types
  useEffect(() => {
    const clean = word.trim();
    if (!clean || clean.length < 2) {
      if (!initialWord) setPreviewData(null);
      setLoadingPreview(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await autoEnrichWord(clean);
        setPreviewData(res);
      } catch (e) {
        console.warn('Auto enrich preview error:', e);
      } finally {
        setLoadingPreview(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [word, initialWord]);

  const handleSelectCategory = (name: string) => {
    setCategoryGroup(name);
    setIsCategoryOpen(false);
    setIsCustomCategory(false);

    // Auto-update subcategory to first available or reset
    const cat = allCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      setCategorySub(cat.subcategories[0]);
    } else {
      setCategorySub('');
    }
  };

  const handleSelectSubcategory = (name: string) => {
    setCategorySub(name);
    setIsSubcategoryOpen(false);
    setIsCustomSubcategory(false);
  };

  const handleSave = async () => {
    if (!word.trim()) {
      setValidationError('Por favor ingresa la palabra en inglés.');
      return;
    }

    setSaving(true);
    let enrichedData: any = previewData;
    if (!enrichedData || enrichedData.word.toLowerCase() !== word.trim().toLowerCase()) {
      try {
        enrichedData = await autoEnrichWord(word.trim());
      } catch (e) {
        console.warn('Auto enrich error on save:', e);
      }
    }

    const finalGroup = categoryGroup.trim() || enrichedData?.categoryGroup || 'Grammar';
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
            {/* Notice info banner */}
            <View style={styles.noticeBox}>
              <Sparkles size={14} color="#ff4d6d" style={{ marginTop: 2 }} />
              <Text style={styles.noticeText}>
                Escribe la palabra y selecciona su categoría. La traducción, fonética en inglés y las frases de ejemplo en inglés y español se autogeneran al instante.
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
                placeholder="Ej: breakthrough, eloquent, serendipity..."
                placeholderTextColor={THEME.colors.textSubtle}
                value={word}
                onChangeText={setWord}
                onFocus={() => {
                  setFocusedField('word');
                  setIsCategoryOpen(false);
                  setIsSubcategoryOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {/* Live Auto-Enrichment Preview Box */}
            {loadingPreview && (
              <View style={styles.previewLoadingBox}>
                <ActivityIndicator size="small" color="#ff4d6d" />
                <Text style={styles.previewLoadingText}>
                  Buscando traducción, fonética y frases de ejemplo...
                </Text>
              </View>
            )}

            {previewData && !loadingPreview && (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#ff4d6d" />
                    <Text style={styles.previewBadgeText}>Auto-Generado</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => vocabService.speak(previewData.word || word)}
                    style={styles.previewSpeakerBtn}
                    activeOpacity={0.8}
                  >
                    <Volume2 size={13} color={THEME.colors.crimsonLight} />
                    <Text style={styles.previewAudioText}>Escuchar pronunciación</Text>
                  </TouchableOpacity>
                </View>

                {/* Traducción y Fonética en inglés */}
                <View style={styles.previewRow}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.previewLabel}>Traducción (Español)</Text>
                    <Text style={styles.previewTranslation}>{previewData.translation}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.previewLabel}>Fonéticamente (Inglés)</Text>
                    <Text style={styles.previewIpa}>{previewData.ipa || '—'}</Text>
                    {previewData.phoneticGuide ? (
                      <Text style={styles.previewGuide}>{previewData.phoneticGuide}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Frase en inglés y frase en español */}
                <View style={styles.previewSentenceBox}>
                  <Text style={styles.previewLabel}>Frase en inglés con esta palabra</Text>
                  <Text style={styles.previewSentenceEn}>{previewData.exampleEn}</Text>

                  <Text style={[styles.previewLabel, { marginTop: 8 }]}>Traducción en español</Text>
                  <Text style={styles.previewSentenceEs}>{previewData.exampleEs}</Text>
                </View>
              </View>
            )}

            {/* 2. Categoría (Lista Desplegable) */}
            <View style={[styles.inputGroup, { zIndex: 50 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Categoría *</Text>
                {!isCustomCategory && (
                  <TouchableOpacity onPress={() => setIsCustomCategory(true)}>
                    <Text style={styles.linkText}>+ Nueva categoría</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isCustomCategory ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Escribe el nombre de la categoría..."
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={categoryGroup}
                    onChangeText={setCategoryGroup}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.cancelCustomBtn}
                    onPress={() => {
                      setIsCustomCategory(false);
                      setCategoryGroup(allCategories[0]?.name || 'Grammar');
                    }}
                  >
                    <Text style={styles.cancelCustomBtnText}>Elegir existente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  {/* Dropdown Trigger */}
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      isCategoryOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsCategoryOpen(!isCategoryOpen);
                      setIsSubcategoryOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Folder size={15} color={THEME.colors.crimsonLight} />
                      <Text style={styles.dropdownTriggerText}>
                        {categoryGroup || 'Selecciona una categoría...'}
                      </Text>
                    </View>
                    {isCategoryOpen ? (
                      <ChevronUp size={16} color={THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Menu List */}
                  {isCategoryOpen && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        {allCategories.map((cat) => {
                          const isSelected =
                            categoryGroup.toLowerCase() === cat.name.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={cat.name}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => handleSelectCategory(cat.name)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.dropdownItemLeft}>
                                <Folder
                                  size={14}
                                  color={isSelected ? '#ffffff' : THEME.colors.crimsonLight}
                                />
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSelected && styles.dropdownItemTextActive,
                                  ]}
                                >
                                  {cat.name}
                                </Text>
                              </View>
                              {isSelected && <Check size={14} color="#ffffff" />}
                            </TouchableOpacity>
                          );
                        })}

                        <TouchableOpacity
                          style={styles.dropdownItemNew}
                          onPress={() => {
                            setIsCustomCategory(true);
                            setIsCategoryOpen(false);
                            setCategoryGroup('');
                          }}
                          activeOpacity={0.8}
                        >
                          <Plus size={14} color={THEME.colors.crimsonLight} />
                          <Text style={styles.dropdownItemNewText}>
                            + Escribir otra categoría...
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 3. Subcategoría (Lista Desplegable) */}
            <View style={[styles.inputGroup, { zIndex: 40 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Subcategoría</Text>
                {!isCustomSubcategory && (
                  <TouchableOpacity onPress={() => setIsCustomSubcategory(true)}>
                    <Text style={styles.linkText}>+ Nueva subcategoría</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isCustomSubcategory ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Escribe la subcategoría..."
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={categorySub}
                    onChangeText={setCategorySub}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.cancelCustomBtn}
                    onPress={() => {
                      setIsCustomSubcategory(false);
                      setCategorySub(availableSubcategories[0] || '');
                    }}
                  >
                    <Text style={styles.cancelCustomBtnText}>Elegir existente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  {/* Dropdown Trigger */}
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      isSubcategoryOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsSubcategoryOpen(!isSubcategoryOpen);
                      setIsCategoryOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Pin size={14} color={categorySub ? '#ff758c' : THEME.colors.textSubtle} />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          !categorySub && { color: THEME.colors.textSubtle },
                        ]}
                      >
                        {categorySub || 'Sin subcategoría (General)'}
                      </Text>
                    </View>
                    {isSubcategoryOpen ? (
                      <ChevronUp size={16} color={THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Menu List */}
                  {isSubcategoryOpen && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        {/* Option: Sin subcategoría */}
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            categorySub === '' && styles.dropdownItemActive,
                          ]}
                          onPress={() => handleSelectSubcategory('')}
                          activeOpacity={0.8}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Pin size={13} color={categorySub === '' ? '#ffffff' : THEME.colors.textSubtle} />
                            <Text
                              style={[
                                styles.dropdownItemText,
                                categorySub === '' && styles.dropdownItemTextActive,
                              ]}
                            >
                              Sin subcategoría (General)
                            </Text>
                          </View>
                          {categorySub === '' && <Check size={14} color="#ffffff" />}
                        </TouchableOpacity>

                        {/* List available subcategories for current category */}
                        {availableSubcategories.map((subName) => {
                          const isSelected =
                            categorySub.toLowerCase() === subName.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={subName}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => handleSelectSubcategory(subName)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.dropdownItemLeft}>
                                <Pin
                                  size={13}
                                  color={isSelected ? '#ffffff' : '#ff758c'}
                                />
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSelected && styles.dropdownItemTextActive,
                                  ]}
                                >
                                  {subName}
                                </Text>
                              </View>
                              {isSelected && <Check size={14} color="#ffffff" />}
                            </TouchableOpacity>
                          );
                        })}

                        <TouchableOpacity
                          style={styles.dropdownItemNew}
                          onPress={() => {
                            setIsCustomSubcategory(true);
                            setIsSubcategoryOpen(false);
                            setCategorySub('');
                          }}
                          activeOpacity={0.8}
                        >
                          <Plus size={14} color={THEME.colors.crimsonLight} />
                          <Text style={styles.dropdownItemNewText}>
                            + Escribir otra subcategoría...
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
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
                  <Text style={styles.saveButtonText}>Guardando...</Text>
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

      {/* Validation Alert Modal */}
      <ConfirmModal
        isOpen={!!validationError}
        title="Campo Requerido"
        message={validationError || ''}
        confirmText="Entendido"
        cancelText={null}
        variant="warning"
        onConfirm={() => setValidationError(null)}
      />
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
    maxWidth: 500,
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
    position: 'relative',
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
  linkText: {
    fontSize: 11,
    color: THEME.colors.crimsonLight,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  inputFocused: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelCustomBtn: {
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelCustomBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Live Preview Styles
  previewLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewLoadingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  previewCard: {
    backgroundColor: '#120d1e',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
    borderRadius: THEME.radius.lg,
    padding: 14,
    gap: 12,
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff758c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewSpeakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderRadius: 6,
  },
  previewAudioText: {
    fontSize: 11,
    color: THEME.colors.crimsonLight,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 10,
    color: THEME.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  previewTranslation: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewIpa: {
    fontSize: 13,
    fontWeight: '600',
    color: '#93c5fd',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewGuide: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
  },
  previewSentenceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: THEME.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  previewSentenceEn: {
    fontSize: 12,
    color: '#e2e8f0',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  previewSentenceEs: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },

  // Dropdown Styles
  dropdownContainer: {
    position: 'relative',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    height: 44,
  },
  dropdownTriggerActive: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#1c1530',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
    borderRadius: THEME.radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownScrollView: {
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownItemActive: {
    backgroundColor: THEME.colors.crimson,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dropdownItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
  },
  dropdownItemNewText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.crimsonLight,
  },

  // Modal Footer
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
