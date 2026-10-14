import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ArrowLeftRight,
} from 'lucide-react-native';
import { WordItem, CategoryItem, PartOfSpeech, PART_OF_SPEECH_OPTIONS } from '../../types';
import { vocabService, getWordCategories, getWordSubcategories } from '../../lib/vocabularyStore';
import { autoEnrichWord, normalizePartOfSpeech, detectQuickPartOfSpeech, isLikelySpanish } from '../../lib/dictionaryService';
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

  const [inputLanguage, setInputLanguage] = useState<'en' | 'es'>('en');
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleEs, setExampleEs] = useState('');
  const [phoneticGuide, setPhoneticGuide] = useState('');
  const [ipa, setIpa] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('Sustantivo');
  const [isPosManuallySelected, setIsPosManuallySelected] = useState(false);
  const [isPosSelectorOpen, setIsPosSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateWordName, setDuplicateWordName] = useState('');

  // Live Auto-Enrich state
  const [loadingAutoEnrich, setLoadingAutoEnrich] = useState(false);
  const [hasManuallyEditedEnglish, setHasManuallyEditedEnglish] = useState(false);
  const [hasManuallyEditedTranslation, setHasManuallyEditedTranslation] = useState(false);
  const [hasManuallyEditedExamples, setHasManuallyEditedExamples] = useState(false);

  // Dropdown & custom input states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomSubcategoryMode, setIsCustomSubcategoryMode] = useState(false);
  const [customSubcategoryInput, setCustomSubcategoryInput] = useState('');

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
      const wCats = getWordCategories(w);
      const wSubs = getWordSubcategories(w);
      wCats.forEach((wc) => {
        if (!seen.has(wc.toLowerCase())) {
          seen.add(wc.toLowerCase());
          list.push({
            name: wc,
            count: 0,
            subcategories: wSubs,
          });
        }
      });
    });

    return list;
  }, [categories]);

  // Available subcategories based on currently selected categories
  const availableSubcategories = useMemo(() => {
    const set = new Set<string>();

    allCategories.forEach((cat) => {
      if (selectedCategories.some((sc) => sc.toLowerCase() === cat.name.toLowerCase())) {
        cat.subcategories?.forEach((s) => set.add(s));
      }
    });

    const storedWords = vocabService.getWords();
    storedWords.forEach((w) => {
      const wCats = getWordCategories(w);
      if (wCats.some((wc) => selectedCategories.some((sc) => sc.toLowerCase() === wc.toLowerCase()))) {
        const wSubs = getWordSubcategories(w);
        wSubs.forEach((s) => set.add(s));
      }
    });

    return Array.from(set);
  }, [allCategories, selectedCategories]);

  // Sync state on mount or when initialWord / props change
  useEffect(() => {
    if (initialWord) {
      setWord(initialWord.word || '');
      setTranslation(initialWord.translation || '');
      setExampleEn(initialWord.exampleEn || (initialWord as any).example || '');
      setExampleEs(initialWord.exampleEs || (initialWord as any).exampleTranslation || '');
      setPhoneticGuide(initialWord.phoneticGuide || '');
      setIpa(initialWord.ipa || '');

      const initCats = getWordCategories(initialWord);
      const initSubs = getWordSubcategories(initialWord);
      setSelectedCategories(initCats.length > 0 ? initCats : [allCategories[0]?.name || 'General']);
      setSelectedSubcategories(initSubs);

      setIsCustomCategoryMode(false);
      setIsCustomSubcategoryMode(false);
      setCustomCategoryInput('');
      setCustomSubcategoryInput('');

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

      const defaultGroup = defaultCategoryGroup || (allCategories[0]?.name || 'General');
      setSelectedCategories([defaultGroup]);
      setSelectedSubcategories(defaultCategorySub ? [defaultCategorySub] : []);

      setIsCustomCategoryMode(false);
      setIsCustomSubcategoryMode(false);
      setCustomCategoryInput('');
      setCustomSubcategoryInput('');

      setPartOfSpeech('Sustantivo');
      setIsPosManuallySelected(false);
      setIsPosSelectorOpen(false);
      setInputLanguage('en');
      setHasManuallyEditedEnglish(false);
      setHasManuallyEditedTranslation(false);
      setHasManuallyEditedExamples(false);
    }
    setLoadingAutoEnrich(false);
    setIsCategoryDropdownOpen(false);
    setIsSubcategoryDropdownOpen(false);
  }, [initialWord, defaultCategoryGroup, defaultCategorySub, isOpen, allCategories]);

  // Direct execution of auto-enrichment (immediate or via debounce)
  const executeAutoEnrichNow = useCallback(async (customText?: string, customLang?: 'en' | 'es') => {
    if (initialWord) return;
    const lang = customLang || inputLanguage;
    const sourceText = (customText !== undefined ? customText : (lang === 'es' ? translation : word)).trim();
    if (!sourceText || sourceText.length < 2) {
      setLoadingAutoEnrich(false);
      return;
    }

    setLoadingAutoEnrich(true);
    try {
      const res = await autoEnrichWord(sourceText, lang);
      if (res) {
        if (lang === 'es') {
          if (!hasManuallyEditedEnglish) {
            setWord(res.word || '');
          }
        } else {
          if (!hasManuallyEditedTranslation) {
            setTranslation(res.translation || '');
          }
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
  }, [
    initialWord,
    inputLanguage,
    translation,
    word,
    hasManuallyEditedEnglish,
    hasManuallyEditedTranslation,
    hasManuallyEditedExamples,
    isPosManuallySelected,
  ]);

  // Ultra-fast live auto-enrichment debounce (220ms)
  useEffect(() => {
    if (initialWord) return;

    const sourceText = inputLanguage === 'es' ? translation.trim() : word.trim();
    if (!sourceText || sourceText.length < 2) {
      setLoadingAutoEnrich(false);
      return;
    }

    const timer = setTimeout(() => {
      executeAutoEnrichNow(sourceText, inputLanguage);
    }, 220);

    return () => clearTimeout(timer);
  }, [
    word,
    translation,
    inputLanguage,
    initialWord,
    executeAutoEnrichNow,
  ]);

  const handleWordChange = (text: string) => {
    setWord(text);
    if (inputLanguage === 'es') {
      setHasManuallyEditedEnglish(true);
    } else {
      // If user typed Spanish accents in English mode, auto-switch to Spanish mode
      if (isLikelySpanish(text) && !translation) {
        setInputLanguage('es');
        setTranslation(text);
        setWord('');
        setHasManuallyEditedEnglish(false);
        return;
      }
    }
    const clean = text.trim();
    if (clean.length > 0 && !isPosManuallySelected && inputLanguage === 'en') {
      const quickPos = detectQuickPartOfSpeech(clean);
      if (quickPos) {
        setPartOfSpeech(quickPos);
      }
    }
  };

  const handleTranslationChange = (text: string) => {
    setTranslation(text);
    if (inputLanguage === 'en') {
      setHasManuallyEditedTranslation(true);
    }
  };

  const handleSwitchLanguage = (lang: 'en' | 'es') => {
    if (inputLanguage === lang) return;
    setInputLanguage(lang);
  };

  const handleSwapLanguages = () => {
    setInputLanguage((prev) => (prev === 'en' ? 'es' : 'en'));
  };

  const handleExampleEnChange = (text: string) => {
    setExampleEn(text);
    setHasManuallyEditedExamples(true);
  };

  const handleExampleEsChange = (text: string) => {
    setExampleEs(text);
    setHasManuallyEditedExamples(true);
  };

  // On-demand AI suggestion generator
  const handleRegenerateWithAI = async () => {
    const currentInput = inputLanguage === 'es' ? translation.trim() : word.trim();
    if (!currentInput) {
      setValidationError(
        inputLanguage === 'es'
          ? 'Por favor ingresa primero la palabra en español.'
          : 'Por favor ingresa primero la palabra en inglés.'
      );
      return;
    }
    setLoadingAutoEnrich(true);
    try {
      const res = await autoEnrichWord(currentInput, inputLanguage);
      if (res) {
        if (inputLanguage === 'es') {
          setWord(res.word || '');
        } else {
          setTranslation(res.translation || '');
        }
        setExampleEn(res.exampleEn || '');
        setExampleEs(res.exampleEs || '');
        if (res.phoneticGuide) setPhoneticGuide(res.phoneticGuide);
        if (res.ipa) setIpa(res.ipa);
        if (res.partOfSpeech) setPartOfSpeech(normalizePartOfSpeech(res.partOfSpeech));
        setHasManuallyEditedEnglish(true);
        setHasManuallyEditedTranslation(true);
        setHasManuallyEditedExamples(true);
      }
    } catch (e) {
      console.warn('Error al autocompletar con IA:', e);
    } finally {
      setLoadingAutoEnrich(false);
    }
  };

  // Category Multi-Select Helpers
  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === catName.toLowerCase());
      if (exists) {
        const filtered = prev.filter((c) => c.toLowerCase() !== catName.toLowerCase());
        return filtered.length > 0 ? filtered : [catName]; // at least one category
      } else {
        return [...prev, catName];
      }
    });
  };

  const removeCategory = (catName: string) => {
    setSelectedCategories((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== catName.toLowerCase());
      return filtered.length > 0 ? filtered : [allCategories[0]?.name || 'General'];
    });
  };

  const handleAddCustomCategory = () => {
    const clean = customCategoryInput.trim();
    if (clean) {
      if (!selectedCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
        setSelectedCategories((prev) => [...prev, clean]);
      }
      setCustomCategoryInput('');
      setIsCustomCategoryMode(false);
    }
  };

  // Subcategory Multi-Select Helpers
  const toggleSubcategory = (subName: string) => {
    setSelectedSubcategories((prev) => {
      const exists = prev.some((s) => s.toLowerCase() === subName.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.toLowerCase() !== subName.toLowerCase());
      } else {
        return [...prev, subName];
      }
    });
  };

  const removeSubcategory = (subName: string) => {
    setSelectedSubcategories((prev) =>
      prev.filter((s) => s.toLowerCase() !== subName.toLowerCase())
    );
  };

  const handleAddCustomSubcategory = () => {
    const clean = customSubcategoryInput.trim();
    if (clean) {
      if (!selectedSubcategories.some((s) => s.toLowerCase() === clean.toLowerCase())) {
        setSelectedSubcategories((prev) => [...prev, clean]);
      }
      setCustomSubcategoryInput('');
      setIsCustomSubcategoryMode(false);
    }
  };

  const handleSave = async () => {
    let cleanWord = word.trim();
    let finalTranslation = translation.trim();

    // If in Spanish mode and English word hasn't been set yet, resolve via Spanish
    if (inputLanguage === 'es' && !cleanWord && finalTranslation) {
      setSaving(true);
      try {
        const enriched = await autoEnrichWord(finalTranslation, 'es');
        if (enriched?.word) {
          cleanWord = enriched.word.trim();
          if (!exampleEn && enriched.exampleEn) setExampleEn(enriched.exampleEn);
          if (!exampleEs && enriched.exampleEs) setExampleEs(enriched.exampleEs);
          if (!phoneticGuide && enriched.phoneticGuide) setPhoneticGuide(enriched.phoneticGuide);
          if (!ipa && enriched.ipa) setIpa(enriched.ipa);
          if (!isPosManuallySelected && enriched.partOfSpeech) {
            setPartOfSpeech(normalizePartOfSpeech(enriched.partOfSpeech));
          }
        }
      } catch (e) {
        console.warn('Auto enrich error on save fallback (ES):', e);
      }
    } else if (inputLanguage === 'en' && cleanWord && !finalTranslation) {
      setSaving(true);
      try {
        const enriched = await autoEnrichWord(cleanWord, 'en');
        if (enriched) {
          if (!finalTranslation) finalTranslation = enriched.translation;
          if (!exampleEn && enriched.exampleEn) setExampleEn(enriched.exampleEn);
          if (!exampleEs && enriched.exampleEs) setExampleEs(enriched.exampleEs);
          if (!phoneticGuide && enriched.phoneticGuide) setPhoneticGuide(enriched.phoneticGuide);
          if (!ipa && enriched.ipa) setIpa(enriched.ipa);
          if (!isPosManuallySelected && enriched.partOfSpeech) {
            setPartOfSpeech(normalizePartOfSpeech(enriched.partOfSpeech));
          }
        }
      } catch (e) {
        console.warn('Auto enrich error on save fallback (EN):', e);
      }
    }

    if (!cleanWord && !finalTranslation) {
      setValidationError(
        inputLanguage === 'es'
          ? 'Por favor ingresa la palabra en español.'
          : 'Por favor ingresa la palabra en inglés.'
      );
      setSaving(false);
      return;
    }

    if (!cleanWord) cleanWord = finalTranslation;
    if (!finalTranslation) finalTranslation = cleanWord;

    // Comprobar si la palabra ya existe en el vocabulario (evitar duplicados)
    const existingWords = vocabService.getWords();
    const isDuplicate = existingWords.some(
      (w) =>
        w.word.trim().toLowerCase() === cleanWord.toLowerCase() &&
        (!initialWord || w.id !== initialWord.id)
    );

    if (isDuplicate) {
      setDuplicateWordName(cleanWord);
      setDuplicateModalOpen(true);
      setSaving(false);
      return;
    }

    setSaving(true);
    let finalExampleEn = exampleEn.trim();
    let finalExampleEs = exampleEs.trim();
    let finalPhoneticGuide = phoneticGuide.trim();
    let finalIpa = ipa.trim();
    let finalPos = partOfSpeech;

    // Final fallback if translation is somehow still blank
    if (!finalTranslation) {
      finalTranslation = cleanWord;
    }

    const finalGroups = selectedCategories.length > 0 ? selectedCategories : ['General'];
    const finalSubs = selectedSubcategories;
    const finalGroupString = finalGroups.join(', ');
    const finalSubString = finalSubs.join(', ');

    // Automatically ensure all categories & subcategories are registered in vocabService
    finalGroups.forEach((groupName) => {
      try {
        const cat = vocabService.addCategory(groupName);
        if (finalSubs.length > 0 && cat?.id) {
          finalSubs.forEach((subName) => {
            vocabService.addSubcategory(cat.id, subName);
          });
        }
      } catch (e) {
        console.warn('Category auto-register warning:', e);
      }
    });

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
      categoryGroup: finalGroupString,
      categorySub: finalSubString,
      categoryGroups: finalGroups,
      categorySubs: finalSubs,
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
                  ? 'Puedes modificar el significado, las dos oraciones, y asignar varias categorías y subcategorías.'
                  : inputLanguage === 'es'
                  ? 'Escribe la palabra en español. La app buscará su traducción al inglés, su pronunciación fonética y oraciones de ejemplo automáticamente.'
                  : 'Escribe la palabra en inglés. La app completará su traducción al español, su pronunciación fonética y oraciones de ejemplo automáticamente.'}
              </Text>
            </View>

            {/* Language Selector Controls */}
            {!isEditing && (
              <View style={[styles.langSelectorCard, !isDark && styles.langSelectorCardLight]}>
                <View style={styles.langSelectorHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Languages size={14} color={!isDark ? '#e11d48' : '#ff758c'} />
                    <Text style={[styles.langSelectorTitle, !isDark && styles.langSelectorTitleLight]}>
                      Ingresar palabra en:
                    </Text>
                  </View>
                </View>
                <View style={styles.langToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.langPill,
                      !isDark && styles.langPillLight,
                      inputLanguage === 'en' && styles.langPillActive,
                      !isDark && inputLanguage === 'en' && styles.langPillActiveLight,
                    ]}
                    onPress={() => handleSwitchLanguage('en')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        !isDark && styles.langPillTextLight,
                        inputLanguage === 'en' && styles.langPillTextActive,
                        !isDark && inputLanguage === 'en' && styles.langPillTextActiveLight,
                      ]}
                    >
                      🇬🇧 Inglés
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.swapPillBtn, !isDark && styles.swapPillBtnLight]}
                    onPress={handleSwapLanguages}
                    activeOpacity={0.7}
                    accessibilityLabel="Intercambiar idioma de entrada"
                  >
                    <ArrowLeftRight size={14} color={!isDark ? '#e11d48' : '#ff758c'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.langPill,
                      !isDark && styles.langPillLight,
                      inputLanguage === 'es' && styles.langPillActive,
                      !isDark && inputLanguage === 'es' && styles.langPillActiveLight,
                    ]}
                    onPress={() => handleSwitchLanguage('es')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        !isDark && styles.langPillTextLight,
                        inputLanguage === 'es' && styles.langPillTextActive,
                        !isDark && inputLanguage === 'es' && styles.langPillTextActiveLight,
                      ]}
                    >
                      🇪🇸 Español
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* DYNAMIC FIELD 1: Primary Input based on active inputLanguage */}
            {inputLanguage === 'es' ? (
              // 1. Primaria en Español
              <View style={styles.inputGroup}>
                <View style={styles.labelActionRow}>
                  <Text style={[styles.label, !isDark && styles.labelLight]}>Palabra en Español *</Text>
                  <View style={styles.labelActions}>
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
                    focusedField === 'translation' && styles.inputFocused,
                  ]}
                  placeholder="Ej: manzana, compromiso, desarrollo, reunión..."
                  placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                  value={translation}
                  onChangeText={handleTranslationChange}
                  onFocus={() => {
                    setFocusedField('translation');
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
                  }}
                  onBlur={() => {
                    setFocusedField(null);
                    executeAutoEnrichNow();
                  }}
                  onSubmitEditing={() => executeAutoEnrichNow()}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoFocus={!isEditing}
                />

                {loadingAutoEnrich && !isEditing && (
                  <View style={styles.inlineLoadingBox}>
                    <ActivityIndicator size="small" color="#ff4d6d" />
                    <Text style={[styles.inlineLoadingText, !isDark && styles.inlineLoadingTextLight]}>
                      Traduciendo a inglés y buscando pronunciación...
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              // 1. Primaria en Inglés
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
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
                  }}
                  onBlur={() => {
                    setFocusedField(null);
                    executeAutoEnrichNow();
                  }}
                  onSubmitEditing={() => executeAutoEnrichNow()}
                  returnKeyType="done"
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
            )}

            {/* DYNAMIC FIELD 2: Target/Secondary Input based on active inputLanguage */}
            {inputLanguage === 'es' ? (
              // 2. Secundaria: Traducción al Inglés (con botón escuchar)
              <View style={styles.inputGroup}>
                <View style={styles.labelActionRow}>
                  <Text style={[styles.label, !isDark && styles.labelLight]}>
                    Palabra en Inglés (Traducción) *
                  </Text>
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
                </View>
                <TextInput
                  style={[
                    styles.input,
                    !isDark && styles.inputLight,
                    focusedField === 'word' && styles.inputFocused,
                  ]}
                  placeholder="Ej: apple, commitment, develop, meeting..."
                  placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                  value={word}
                  onChangeText={handleWordChange}
                  onFocus={() => {
                    setFocusedField('word');
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            ) : (
              // 2. Secundaria: Significado al Español
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
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            )}

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
                  setIsCategoryDropdownOpen(false);
                  setIsSubcategoryDropdownOpen(false);
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
                  setIsCategoryDropdownOpen(false);
                  setIsSubcategoryDropdownOpen(false);
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
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
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
                    setIsCategoryDropdownOpen(false);
                    setIsSubcategoryDropdownOpen(false);
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

            {/* 7. Categorías (Múltiples categorías permitidas) */}
            <View style={[styles.inputGroup, { zIndex: 50 }]}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Categorías (puedes elegir varias) *
                </Text>
                <TouchableOpacity onPress={() => setIsCustomCategoryMode(!isCustomCategoryMode)}>
                  <Text style={styles.linkText}>
                    {isCustomCategoryMode ? 'Cancelar' : '+ Nueva categoría'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chips de categorías seleccionadas */}
              <View style={styles.selectedTagsContainer}>
                {selectedCategories.map((catName) => (
                  <View
                    key={catName}
                    style={[styles.selectedTagPill, !isDark && styles.selectedTagPillLight]}
                  >
                    <Folder size={12} color={!isDark ? '#e11d48' : THEME.colors.crimsonLight} />
                    <Text
                      style={[styles.selectedTagText, !isDark && styles.selectedTagTextLight]}
                    >
                      {catName}
                    </Text>
                    {selectedCategories.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeCategory(catName)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Input para agregar nueva categoría personalizada */}
              {isCustomCategoryMode ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, !isDark && styles.inputLight, { flex: 1 }]}
                    placeholder="Nombre de la nueva categoría..."
                    placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                    value={customCategoryInput}
                    onChangeText={setCustomCategoryInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.saveCustomBtn]}
                    onPress={handleAddCustomCategory}
                  >
                    <Text style={styles.saveCustomBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      !isDark && styles.dropdownTriggerLight,
                      isCategoryDropdownOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                      setIsSubcategoryDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Folder size={15} color={THEME.colors.crimsonLight} />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          !isDark && styles.dropdownTriggerTextLight,
                        ]}
                      >
                        {selectedCategories.length > 0
                          ? `Categorías seleccionadas (${selectedCategories.length})`
                          : 'Selecciona categorías...'}
                      </Text>
                    </View>
                    {isCategoryDropdownOpen ? (
                      <ChevronUp size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isCategoryDropdownOpen && (
                    <View style={[styles.dropdownMenu, !isDark && styles.dropdownMenuLight]}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        {allCategories.map((cat) => {
                          const isSelected = selectedCategories.some(
                            (c) => c.toLowerCase() === cat.name.toLowerCase()
                          );
                          return (
                            <TouchableOpacity
                              key={cat.name}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => toggleCategory(cat.name)}
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
                            setIsCustomCategoryMode(true);
                            setIsCategoryDropdownOpen(false);
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

            {/* 8. Subcategorías (Múltiples subcategorías permitidas) */}
            <View style={[styles.inputGroup, { zIndex: 40 }]}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Subcategorías (opcional, puedes elegir varias)
                </Text>
                <TouchableOpacity onPress={() => setIsCustomSubcategoryMode(!isCustomSubcategoryMode)}>
                  <Text style={styles.linkText}>
                    {isCustomSubcategoryMode ? 'Cancelar' : '+ Nueva subcategoría'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chips de subcategorías seleccionadas */}
              {selectedSubcategories.length > 0 && (
                <View style={styles.selectedTagsContainer}>
                  {selectedSubcategories.map((subName) => (
                    <View
                      key={subName}
                      style={[styles.selectedTagPill, !isDark && styles.selectedTagPillLight]}
                    >
                      <Pin size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      <Text
                        style={[styles.selectedTagText, !isDark && styles.selectedTagTextLight]}
                      >
                        {subName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSubcategory(subName)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Input para agregar subcategoría personalizada */}
              {isCustomSubcategoryMode ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.input, !isDark && styles.inputLight, { flex: 1 }]}
                    placeholder="Nombre de la nueva subcategoría..."
                    placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                    value={customSubcategoryInput}
                    onChangeText={setCustomSubcategoryInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.saveCustomBtn]}
                    onPress={handleAddCustomSubcategory}
                  >
                    <Text style={styles.saveCustomBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      !isDark && styles.dropdownTriggerLight,
                      isSubcategoryDropdownOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen);
                      setIsCategoryDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Pin
                        size={14}
                        color={
                          selectedSubcategories.length > 0
                            ? '#ff758c'
                            : !isDark
                            ? '#94a3b8'
                            : THEME.colors.textSubtle
                        }
                      />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          !isDark && styles.dropdownTriggerTextLight,
                          selectedSubcategories.length === 0 && {
                            color: !isDark ? '#94a3b8' : THEME.colors.textSubtle,
                          },
                        ]}
                      >
                        {selectedSubcategories.length > 0
                          ? `Subcategorías elegidas (${selectedSubcategories.length})`
                          : 'Sin subcategoría (General)'}
                      </Text>
                    </View>
                    {isSubcategoryDropdownOpen ? (
                      <ChevronUp size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isSubcategoryDropdownOpen && (
                    <View style={[styles.dropdownMenu, !isDark && styles.dropdownMenuLight]}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        {/* Opción para limpiar todas las subcategorías */}
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            selectedSubcategories.length === 0 && styles.dropdownItemActive,
                          ]}
                          onPress={() => setSelectedSubcategories([])}
                          activeOpacity={0.8}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Pin
                              size={13}
                              color={
                                selectedSubcategories.length === 0
                                  ? '#ffffff'
                                  : !isDark
                                  ? '#94a3b8'
                                  : THEME.colors.textSubtle
                              }
                            />
                            <Text
                              style={[
                                styles.dropdownItemText,
                                !isDark && styles.dropdownItemTextLight,
                                selectedSubcategories.length === 0 && styles.dropdownItemTextActive,
                              ]}
                            >
                              Ninguna (General)
                            </Text>
                          </View>
                          {selectedSubcategories.length === 0 && (
                            <Check size={14} color="#ffffff" />
                          )}
                        </TouchableOpacity>

                        {availableSubcategories.map((subName) => {
                          const isSelected = selectedSubcategories.some(
                            (s) => s.toLowerCase() === subName.toLowerCase()
                          );
                          return (
                            <TouchableOpacity
                              key={subName}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => toggleSubcategory(subName)}
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
                            setIsCustomSubcategoryMode(true);
                            setIsSubcategoryDropdownOpen(false);
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
              <Text style={[styles.cancelButtonText, !isDark && styles.cancelButtonTextLight]}>
                Cancelar
              </Text>
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

      {/* Duplicate Word Alert Modal */}
      <ConfirmModal
        isOpen={duplicateModalOpen}
        title="Palabra ya registrada"
        message={`La palabra "${duplicateWordName}" ya existe en tu vocabulario. Puedes buscarla en tu lista para repasarla o editar sus datos.`}
        confirmText="Entendido"
        cancelText={null}
        variant="warning"
        onConfirm={() => setDuplicateModalOpen(false)}
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
  langSelectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    borderRadius: THEME.radius.lg,
    padding: 10,
    gap: 8,
    marginBottom: 4,
  },
  langSelectorCardLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  langSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langSelectorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  langSelectorTitleLight: {
    color: '#0f172a',
  },
  langToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  langPillActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.2)',
    borderColor: THEME.colors.crimson,
  },
  langPillActiveLight: {
    backgroundColor: '#ffe4e6',
    borderColor: '#e11d48',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  langPillTextLight: {
    color: '#64748b',
  },
  langPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  langPillTextActiveLight: {
    color: '#e11d48',
    fontWeight: '700',
  },
  swapPillBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapPillBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
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
  saveCustomBtn: {
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: THEME.colors.crimson,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCustomBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tags Pill Container
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
  },
  selectedTagPillLight: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fca5a5',
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  selectedTagTextLight: {
    color: '#0f172a',
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
