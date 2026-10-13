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
  Bookmark,
  Tag,
  Languages,
  RotateCcw,
} from 'lucide-react-native';
import { WordItem, CategoryItem, PartOfSpeech, PART_OF_SPEECH_OPTIONS } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { autoEnrichWord, normalizePartOfSpeech, detectQuickPartOfSpeech } from '../../lib/dictionaryService';
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
  isDark?: boolean;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWord,
  categories = [],
  defaultCategoryGroup,
  defaultCategorySub,
  isDark = true,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isEditing = Boolean(initialWord);

  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleEs, setExampleEs] = useState('');
  const [phoneticGuide, setPhoneticGuide] = useState('');
  const [ipa, setIpa] = useState('');
  const [categoryGroup, setCategoryGroup] = useState(defaultCategoryGroup || '');
  const [categorySub, setCategorySub] = useState(defaultCategorySub || '');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('Sustantivo');
  const [isPosManuallySelected, setIsPosManuallySelected] = useState(false);
  const [isPosSelectorOpen, setIsPosSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live Auto-Enrich state
  const [loadingAutoEnrich, setLoadingAutoEnrich] = useState(false);
  const [hasManuallyEditedTranslation, setHasManuallyEditedTranslation] = useState(false);
  const [hasManuallyEditedExamples, setHasManuallyEditedExamples] = useState(false);

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

  // Sync state on mount or when initialWord / props change
  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word || '');
      setTranslation(initialWord.translation || '');
      setExampleEn(initialWord.exampleEn || (initialWord as any).example || '');
      setExampleEs(initialWord.exampleEs || (initialWord as any).exampleTranslation || '');
      setPhoneticGuide(initialWord.phoneticGuide || '');
      setIpa(initialWord.ipa || '');
      setCategoryGroup(initialWord.categoryGroup || (allCategories[0]?.name || ''));
      setCategorySub(initialWord.categorySub || '');
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      const initialPos = normalizePartOfSpeech(initialWord.partOfSpeech || 'Sustantivo');
      setPartOfSpeech(initialPos);
      setIsPosManuallySelected(true);
      setHasManuallyEditedTranslation(true);
      setHasManuallyEditedExamples(true);
    } else {
      setWord('');
      setTranslation('');
      setExampleEn('');
      setExampleEs('');
      setPhoneticGuide('');
      setIpa('');
      const defaultGroup = defaultCategoryGroup || (allCategories[0]?.name || '');
      setCategoryGroup(defaultGroup);
      setCategorySub(defaultCategorySub || '');
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      setPartOfSpeech('Sustantivo');
      setIsPosManuallySelected(false);
      setIsPosSelectorOpen(false);
      setHasManuallyEditedTranslation(false);
      setHasManuallyEditedExamples(false);
    }
    setLoadingAutoEnrich(false);
    setIsCategoryOpen(false);
    setIsSubcategoryOpen(false);
  }, [initialWord, defaultCategoryGroup, defaultCategorySub, isOpen, allCategories]);

  // Debounced live auto-enrichment when creating a NEW word
  useEffect(() => {
    if (initialWord) return; // In edit mode, do NOT auto-overwrite user's fields while typing

    const clean = word.trim();
    if (!clean || clean.length < 2) {
      setLoadingAutoEnrich(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAutoEnrich(true);
      try {
        const res = await autoEnrichWord(clean);
        if (res) {
          if (!hasManuallyEditedTranslation) {
            setTranslation(res.translation || '');
          }
          if (!hasManuallyEditedExamples) {
            setExampleEn(res.exampleEn || '');
            setExampleEs(res.exampleEs || '');
          }
          setPhoneticGuide((prev) => (prev ? prev : res.phoneticGuide || ''));
          setIpa((prev) => (prev ? prev : res.ipa || ''));
          if (!isPosManuallySelected && res.partOfSpeech) {
            setPartOfSpeech(normalizePartOfSpeech(res.partOfSpeech));
          }
        }
      } catch (e) {
        console.warn('Auto enrich preview error:', e);
      } finally {
        setLoadingAutoEnrich(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [word, initialWord, hasManuallyEditedTranslation, hasManuallyEditedExamples, isPosManuallySelected]);

  const handleWordChange = (text: string) => {
    setWord(text);
    const clean = text.trim();
    if (clean.length > 0 && !isPosManuallySelected) {
      const quickPos = detectQuickPartOfSpeech(clean);
      if (quickPos) {
        setPartOfSpeech(quickPos);
      }
    }
  };

  const handleTranslationChange = (text: string) => {
    setTranslation(text);
    setHasManuallyEditedTranslation(true);
  };

  const handleExampleEnChange = (text: string) => {
    setExampleEn(text);
    setHasManuallyEditedExamples(true);
  };

  const handleExampleEsChange = (text: string) => {
    setExampleEs(text);
    setHasManuallyEditedExamples(true);
  };

  // On-demand AI suggestion generator (usable in both create and edit modes)
  const handleRegenerateWithAI = async () => {
    const clean = word.trim();
    if (!clean) {
      setValidationError('Por favor ingresa primero la palabra en inglés.');
      return;
    }
    setLoadingAutoEnrich(true);
    try {
      const res = await autoEnrichWord(clean);
      if (res) {
        setTranslation(res.translation || '');
        setExampleEn(res.exampleEn || '');
        setExampleEs(res.exampleEs || '');
        if (res.phoneticGuide) setPhoneticGuide(res.phoneticGuide);
        if (res.ipa) setIpa(res.ipa);
        if (res.partOfSpeech) setPartOfSpeech(normalizePartOfSpeech(res.partOfSpeech));
        setHasManuallyEditedTranslation(true);
        setHasManuallyEditedExamples(true);
      }
    } catch (e) {
      console.warn('Error al autocompletar con IA:', e);
    } finally {
      setLoadingAutoEnrich(false);
    }
  };

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
    const cleanWord = word.trim();
    if (!cleanWord) {
      setValidationError('Por favor ingresa la palabra en inglés.');
      return;
    }

    setSaving(true);
    let finalTranslation = translation.trim();
    let finalExampleEn = exampleEn.trim();
    let finalExampleEs = exampleEs.trim();
    let finalPhoneticGuide = phoneticGuide.trim();
    let finalIpa = ipa.trim();
    let finalPos = partOfSpeech;

    // Fallback if translation is blank
    if (!finalTranslation) {
      try {
        const enriched = await autoEnrichWord(cleanWord);
        if (enriched) {
          if (!finalTranslation) finalTranslation = enriched.translation;
          if (!finalExampleEn) finalExampleEn = enriched.exampleEn;
          if (!finalExampleEs) finalExampleEs = enriched.exampleEs;
          if (!finalPhoneticGuide) finalPhoneticGuide = enriched.phoneticGuide;
          if (!finalIpa) finalIpa = enriched.ipa;
          if (!isPosManuallySelected && enriched.partOfSpeech) {
            finalPos = normalizePartOfSpeech(enriched.partOfSpeech);
          }
        }
      } catch (e) {
        console.warn('Auto enrich error on save fallback:', e);
      }
    }

    if (!finalTranslation) {
      finalTranslation = cleanWord;
    }

    const finalGroup = categoryGroup.trim() || (allCategories[0]?.name || 'General');
    const finalSub = categorySub.trim() || '';

    // Automatically ensure the category & subcategory are registered in the user's categories list
    if (finalGroup) {
      try {
        const cat = vocabService.addCategory(finalGroup);
        if (finalSub && cat?.id) {
          vocabService.addSubcategory(cat.id, finalSub);
        }
      } catch (e) {
        console.warn('Category auto-register warning:', e);
      }
    }

    onSave({
      word: cleanWord,
      translation: finalTranslation,
      phoneticGuide: finalPhoneticGuide || `"${cleanWord.toLowerCase()}"`,
      ipa: finalIpa || '',
      definition: finalTranslation,
      exampleEn: finalExampleEn,
      exampleEs: finalExampleEs,
      level: initialWord ? initialWord.level : 'B1',
      partOfSpeech: finalPos,
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
        <View
          style={[
            styles.modalCard,
            isDesktop && styles.modalCardDesktop,
            !isDark && styles.modalCardLight,
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, !isDark && styles.modalHeaderLight]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIcon}>
                <BookOpen size={16} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={[styles.headerTitle, !isDark && styles.headerTitleLight]}>
                {isEditing ? 'Editar Palabra' : 'Nueva Palabra'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Notice info banner */}
            <View style={[styles.noticeBox, !isDark && styles.noticeBoxLight]}>
              <Sparkles size={14} color="#ff4d6d" style={{ marginTop: 2 }} />
              <Text style={[styles.noticeText, !isDark && styles.noticeTextLight]}>
                {isEditing
                  ? 'Puedes modificar el significado, las dos oraciones de ejemplo y todos los campos de esta palabra.'
                  : 'Escribe la palabra en inglés. El significado, la fonética y las frases se sugieren automáticamente y puedes editarlas todas.'}
              </Text>
            </View>

            {/* 1. Palabra en Inglés */}
            <View style={styles.inputGroup}>
              <View style={styles.labelActionRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>Palabra en Inglés *</Text>
                <View style={styles.labelActions}>
                  {word.trim().length > 0 && (
                    <TouchableOpacity
                      style={[styles.speakerBtn, !isDark && styles.speakerBtnLight]}
                      onPress={() => vocabService.speak(word)}
                      activeOpacity={0.7}
                    >
                      <Volume2 size={13} color={!isDark ? '#e11d48' : THEME.colors.crimsonLight} />
                      <Text style={[styles.speakerBtnText, !isDark && styles.speakerBtnTextLight]}>Escuchar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.aiSuggestBtn, !isDark && styles.aiSuggestBtnLight]}
                    onPress={handleRegenerateWithAI}
                    disabled={loadingAutoEnrich}
                    activeOpacity={0.7}
                  >
                    {loadingAutoEnrich ? (
                      <ActivityIndicator size="small" color={!isDark ? '#e11d48' : '#ff758c'} />
                    ) : (
                      <Sparkles size={13} color={!isDark ? '#e11d48' : '#ff758c'} />
                    )}
                    <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>
                      {loadingAutoEnrich ? 'Buscando...' : 'Sugerir con IA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={[
                  styles.input,
                  !isDark && styles.inputLight,
                  focusedField === 'word' && styles.inputFocused,
                ]}
                placeholder="Ej: breakthrough, eloquent, serendipity..."
                placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                value={word}
                onChangeText={handleWordChange}
                onFocus={() => {
                  setFocusedField('word');
                  setIsCategoryOpen(false);
                  setIsSubcategoryOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoFocus={!isEditing}
              />

              {loadingAutoEnrich && !isEditing && (
                <View style={styles.inlineLoadingBox}>
                  <ActivityIndicator size="small" color="#ff4d6d" />
                  <Text style={[styles.inlineLoadingText, !isDark && styles.inlineLoadingTextLight]}>
                    Buscando traducción y frases sugeridas...
                  </Text>
                </View>
              )}
            </View>

            {/* 2. Significado / Traducción al Español */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !isDark && styles.labelLight]}>
                Significado / Traducción (Español) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !isDark && styles.inputLight,
                  focusedField === 'translation' && styles.inputFocused,
                ]}
                placeholder="Ej: gran avance, hallazgo importante, elocuente..."
                placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                value={translation}
                onChangeText={handleTranslationChange}
                onFocus={() => {
                  setFocusedField('translation');
                  setIsCategoryOpen(false);
                  setIsSubcategoryOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* 3. Frase de Ejemplo en Inglés */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !isDark && styles.labelLight]}>
                Frase de Ejemplo (Inglés)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  !isDark && styles.inputLight,
                  focusedField === 'exampleEn' && styles.inputFocused,
                ]}
                placeholder="Ej: Scientists announced a major breakthrough in renewable energy."
                placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                value={exampleEn}
                onChangeText={handleExampleEnChange}
                multiline
                numberOfLines={2}
                onFocus={() => {
                  setFocusedField('exampleEn');
                  setIsCategoryOpen(false);
                  setIsSubcategoryOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* 4. Traducción de la Frase en Español */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !isDark && styles.labelLight]}>
                Traducción de la Frase (Español)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  !isDark && styles.inputLight,
                  focusedField === 'exampleEs' && styles.inputFocused,
                ]}
                placeholder="Ej: Los científicos anunciaron un gran avance en energía renovable."
                placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                value={exampleEs}
                onChangeText={handleExampleEsChange}
                multiline
                numberOfLines={2}
                onFocus={() => {
                  setFocusedField('exampleEs');
                  setIsCategoryOpen(false);
                  setIsSubcategoryOpen(false);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* 5. Pronunciación Fonética (Guía & IPA) */}
            <View style={styles.rowCols}>
              <View style={styles.colHalf}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Guía Fonética (Aprox.)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !isDark && styles.inputLight,
                    focusedField === 'phoneticGuide' && styles.inputFocused,
                  ]}
                  placeholder='Ej: "breik-zru"'
                  placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                  value={phoneticGuide}
                  onChangeText={setPhoneticGuide}
                  onFocus={() => {
                    setFocusedField('phoneticGuide');
                    setIsCategoryOpen(false);
                    setIsSubcategoryOpen(false);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.colHalf}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Fonética IPA
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !isDark && styles.inputLight,
                    focusedField === 'ipa' && styles.inputFocused,
                  ]}
                  placeholder="Ej: /ˈbreɪkˌθruː/"
                  placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                  value={ipa}
                  onChangeText={setIpa}
                  onFocus={() => {
                    setFocusedField('ipa');
                    setIsCategoryOpen(false);
                    setIsSubcategoryOpen(false);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* 6. Tipo de palabra (Gramática) */}
            <View style={[styles.autoPosBox, !isDark && styles.autoPosBoxLight]}>
              <View style={styles.autoPosHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                  <Sparkles size={14} color="#ff4d6d" />
                  <Text style={[styles.autoPosTitle, !isDark && styles.autoPosTitleLight]}>
                    Tipo de palabra:
                  </Text>
                  <View style={[styles.autoPosBadge, !isDark && styles.autoPosBadgeLight]}>
                    <Text style={[styles.autoPosBadgeText, !isDark && styles.autoPosBadgeTextLight]}>
                      {partOfSpeech}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.changePosToggleBtn}
                  onPress={() => setIsPosSelectorOpen(!isPosSelectorOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changePosToggleText}>
                    {isPosSelectorOpen ? 'Ocultar opciones' : 'Modificar manual'}
                  </Text>
                  {isPosSelectorOpen ? (
                    <ChevronUp size={12} color={THEME.colors.crimsonLight} />
                  ) : (
                    <ChevronDown size={12} color={THEME.colors.crimsonLight} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.autoPosSubtext, !isDark && styles.autoPosSubtextLight]}>
                {isPosManuallySelected
                  ? 'Modificado manualmente por ti.'
                  : '✨ Asignado automáticamente según la gramática en inglés.'}
              </Text>

              {/* Botones / Chips de las 9 opciones solicitadas */}
              {isPosSelectorOpen && (
                <View style={[styles.posChipsContainer, { marginTop: 10 }]}>
                  {PART_OF_SPEECH_OPTIONS.map((posOption) => {
                    const isSelected = partOfSpeech === posOption;
                    return (
                      <TouchableOpacity
                        key={posOption}
                        style={[
                          styles.posChip,
                          !isDark && styles.posChipLight,
                          isSelected && styles.posChipActive,
                        ]}
                        onPress={() => {
                          setPartOfSpeech(posOption);
                          setIsPosManuallySelected(true);
                        }}
                        activeOpacity={0.8}
                      >
                        {isSelected && (
                          <Check size={12} color="#ffffff" style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[
                            styles.posChipText,
                            !isDark && styles.posChipTextLight,
                            isSelected && styles.posChipTextActive,
                          ]}
                        >
                          {posOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 7. Categoría (Lista Desplegable) */}
            <View style={[styles.inputGroup, { zIndex: 50 }]}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>Categoría *</Text>
                {!isCustomCategory && (
                  <TouchableOpacity onPress={() => setIsCustomCategory(true)}>
                    <Text style={styles.linkText}>+ Nueva categoría</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isCustomCategory ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, !isDark && styles.inputLight, { flex: 1 }]}
                    placeholder="Escribe el nombre de la categoría..."
                    placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                    value={categoryGroup}
                    onChangeText={setCategoryGroup}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.cancelCustomBtn, !isDark && styles.cancelCustomBtnLight]}
                    onPress={() => {
                      setIsCustomCategory(false);
                      setCategoryGroup(allCategories[0]?.name || '');
                    }}
                  >
                    <Text style={[styles.cancelCustomBtnText, !isDark && styles.cancelCustomBtnTextLight]}>Elegir existente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      !isDark && styles.dropdownTriggerLight,
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
                      <Text style={[styles.dropdownTriggerText, !isDark && styles.dropdownTriggerTextLight]}>
                        {categoryGroup || 'Selecciona una categoría...'}
                      </Text>
                    </View>
                    {isCategoryOpen ? (
                      <ChevronUp size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isCategoryOpen && (
                    <View style={[styles.dropdownMenu, !isDark && styles.dropdownMenuLight]}>
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
                                    !isDark && styles.dropdownItemTextLight,
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

            {/* 8. Subcategoría (Lista Desplegable) */}
            <View style={[styles.inputGroup, { zIndex: 40 }]}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>Subcategoría</Text>
                {!isCustomSubcategory && (
                  <TouchableOpacity onPress={() => setIsCustomSubcategory(true)}>
                    <Text style={styles.linkText}>+ Nueva subcategoría</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isCustomSubcategory ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, !isDark && styles.inputLight, { flex: 1 }]}
                    placeholder="Escribe la subcategoría..."
                    placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                    value={categorySub}
                    onChangeText={setCategorySub}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.cancelCustomBtn, !isDark && styles.cancelCustomBtnLight]}
                    onPress={() => {
                      setIsCustomSubcategory(false);
                      setCategorySub(availableSubcategories[0] || '');
                    }}
                  >
                    <Text style={[styles.cancelCustomBtnText, !isDark && styles.cancelCustomBtnTextLight]}>Elegir existente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      !isDark && styles.dropdownTriggerLight,
                      isSubcategoryOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsSubcategoryOpen(!isSubcategoryOpen);
                      setIsCategoryOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Pin size={14} color={categorySub ? '#ff758c' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)} />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          !isDark && styles.dropdownTriggerTextLight,
                          !categorySub && { color: !isDark ? '#94a3b8' : THEME.colors.textSubtle },
                        ]}
                      >
                        {categorySub || 'Sin subcategoría (General)'}
                      </Text>
                    </View>
                    {isSubcategoryOpen ? (
                      <ChevronUp size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isSubcategoryOpen && (
                    <View style={[styles.dropdownMenu, !isDark && styles.dropdownMenuLight]}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            categorySub === '' && styles.dropdownItemActive,
                          ]}
                          onPress={() => handleSelectSubcategory('')}
                          activeOpacity={0.8}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Pin size={13} color={categorySub === '' ? '#ffffff' : (!isDark ? '#94a3b8' : THEME.colors.textSubtle)} />
                            <Text
                              style={[
                                styles.dropdownItemText,
                                !isDark && styles.dropdownItemTextLight,
                                categorySub === '' && styles.dropdownItemTextActive,
                              ]}
                            >
                              Sin subcategoría (General)
                            </Text>
                          </View>
                          {categorySub === '' && <Check size={14} color="#ffffff" />}
                        </TouchableOpacity>

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
                                    !isDark && styles.dropdownItemTextLight,
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
          <View style={[styles.modalFooter, !isDark && styles.modalFooterLight]}>
            <TouchableOpacity
              style={[styles.cancelButton, !isDark && styles.cancelButtonLight]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, !isDark && styles.cancelButtonTextLight]}>Cancelar</Text>
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
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Actualizar Palabra' : 'Guardar Palabra'}
                  </Text>
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
        isDark={isDark}
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
    maxWidth: 520,
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
    gap: 14,
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
  labelActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderRadius: 6,
  },
  speakerBtnLight: {
    backgroundColor: '#ffe4e6',
  },
  speakerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.crimsonLight,
  },
  speakerBtnTextLight: {
    color: '#e11d48',
  },
  aiSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
  },
  aiSuggestBtnLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  aiSuggestBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff758c',
  },
  aiSuggestBtnTextLight: {
    color: '#e11d48',
  },
  inlineLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  inlineLoadingText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  inlineLoadingTextLight: {
    color: '#64748b',
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
  textArea: {
    height: 68,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  rowCols: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
    gap: 6,
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

  // Light Mode Overrides
  modalCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  modalHeaderLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerTitleLight: {
    color: '#0f172a',
  },
  noticeBoxLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  noticeTextLight: {
    color: '#9f1239',
  },
  labelLight: {
    color: '#0f172a',
  },
  inputLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  cancelCustomBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  cancelCustomBtnTextLight: {
    color: '#475569',
  },
  dropdownTriggerLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  dropdownTriggerTextLight: {
    color: '#0f172a',
  },
  dropdownMenuLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownItemTextLight: {
    color: '#334155',
  },
  modalFooterLight: {
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  cancelButtonLight: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonTextLight: {
    color: '#475569',
  },

  // Part of Speech Chips Styles
  posChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  posChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.full || 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  posChipLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  posChipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  posChipText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  posChipTextLight: {
    color: '#475569',
  },
  posChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Auto-assigned Part of Speech Box Styles
  autoPosBox: {
    backgroundColor: 'rgba(230, 46, 76, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.22)',
    borderRadius: THEME.radius.lg,
    padding: 12,
  },
  autoPosBoxLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  autoPosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  autoPosTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  autoPosTitleLight: {
    color: '#0f172a',
  },
  autoPosBadge: {
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: THEME.radius.full || 999,
  },
  autoPosBadgeLight: {
    backgroundColor: '#e11d48',
  },
  autoPosBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  autoPosBadgeTextLight: {
    color: '#ffffff',
  },
  autoPosSubtext: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  autoPosSubtextLight: {
    color: '#64748b',
  },
  changePosToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
  },
  changePosToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.crimsonLight,
  },
});
