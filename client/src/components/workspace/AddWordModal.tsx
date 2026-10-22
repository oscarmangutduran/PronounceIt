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
import {
  autoEnrichWord,
  normalizePartOfSpeech,
  detectQuickPartOfSpeech,
  isLikelySpanish,
  getInstantEnrichmentSync,
  getPhoneticsForEnglishWord,
  translatePhrase,
  generateExampleSentencesWithAI,
  isGeminiConfigured,
  getWordLevel,
} from '../../lib/dictionaryService';
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

interface ClearInputButtonProps {
  visible: boolean;
  onClear: () => void;
  isDark: boolean;
  isTextArea?: boolean;
}

const ClearInputButton: React.FC<ClearInputButtonProps> = ({
  visible,
  onClear,
  isDark,
  isTextArea,
}) => {
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={[
        styles.clearFieldBtn,
        isTextArea && styles.clearFieldBtnTextArea,
        !isDark && styles.clearFieldBtnLight,
      ]}
      onPress={(e) => {
        if (Platform.OS === 'web') {
          e?.preventDefault?.();
          e?.stopPropagation?.();
        }
        onClear();
      }}
      {...(Platform.OS === 'web'
        ? ({
            onMouseDown: (e: any) => {
              e.preventDefault();
              e.stopPropagation();
            },
            onClick: (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            },
          } as any)
        : {})}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Borrar contenido del campo"
    >
      <X size={13} color={!isDark ? '#64748b' : '#cbd5e1'} strokeWidth={2.2} />
    </TouchableOpacity>
  );
};

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
  const [generatingSentences, setGeneratingSentences] = useState(false);
  const [phoneticGuide, setPhoneticGuide] = useState('');
  const [ipa, setIpa] = useState('');
  const [hasManuallyEditedPhoneticGuide, setHasManuallyEditedPhoneticGuide] = useState(false);
  const [hasManuallyEditedIpa, setHasManuallyEditedIpa] = useState(false);
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

  const [translatingSentence, setTranslatingSentence] = useState<'en_to_es' | 'es_to_en' | null>(null);

  // Live Auto-Enrich state
  const enrichReqIdRef = React.useRef(0);
  const [loadingAutoEnrich, setLoadingAutoEnrich] = useState(false);
  const [hasManuallyEditedEnglish, setHasManuallyEditedEnglish] = useState(false);
  const [hasManuallyEditedTranslation, setHasManuallyEditedTranslation] = useState(false);
  const [hasManuallyEditedExamples, setHasManuallyEditedExamples] = useState(false);
  const [translationAlternatives, setTranslationAlternatives] = useState<string[]>([]);

  // Dropdown & custom input states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategorySubInput, setCustomCategorySubInput] = useState('');
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
      setHasManuallyEditedPhoneticGuide(Boolean(initialWord.phoneticGuide));
      setHasManuallyEditedIpa(Boolean(initialWord.ipa));

      if (initialWord.translation && (initialWord.translation.includes('/') || initialWord.translation.includes(','))) {
        const parts = initialWord.translation
          .split(/\s*[\/,;]\s*/)
          .map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1))
          .filter(Boolean);
        setTranslationAlternatives(parts);
      } else {
        setTranslationAlternatives([]);
      }

      const initCats = getWordCategories(initialWord);
      const initSubs = getWordSubcategories(initialWord);
      setSelectedCategories(initCats.length > 0 ? initCats : [allCategories[0]?.name || 'General']);
      setSelectedSubcategories(initSubs);

      setIsCustomCategoryMode(false);
      setIsCustomSubcategoryMode(false);
      setCustomCategoryInput('');
      setCustomCategorySubInput('');
      setCustomSubcategoryInput('');

      const initialPos = normalizePartOfSpeech(initialWord.partOfSpeech || 'Sustantivo');
      setPartOfSpeech(initialPos);
      setIsPosManuallySelected(true);
      setHasManuallyEditedTranslation(true);
      setHasManuallyEditedExamples(true);
    } else {
      setWord('');
      setTranslation('');
      setTranslationAlternatives([]);
      setExampleEn('');
      setExampleEs('');
      setPhoneticGuide('');
      setIpa('');
      setHasManuallyEditedPhoneticGuide(false);
      setHasManuallyEditedIpa(false);

      const defaultGroup = defaultCategoryGroup || (allCategories[0]?.name || 'General');
      setSelectedCategories([defaultGroup]);
      setSelectedSubcategories(defaultCategorySub ? [defaultCategorySub] : []);

      setIsCustomCategoryMode(false);
      setIsCustomSubcategoryMode(false);
      setCustomCategoryInput('');
      setCustomCategorySubInput('');
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

  // Direct execution of auto-enrichment (immediate local fill + fast network enrichment)
  // Direct execution of auto-enrichment (immediate local fill + fast network enrichment)
  const executeAutoEnrichNow = useCallback(async (customText?: string, customLang?: 'en' | 'es') => {
    if (initialWord) return;
    const lang = customLang || inputLanguage;
    const sourceText = (customText !== undefined ? customText : (lang === 'es' ? translation : word)).trim();
    if (!sourceText || sourceText.length < 2) {
      setLoadingAutoEnrich(false);
      return;
    }

    const currentReqId = ++enrichReqIdRef.current;

    // 0ms instant local pre-fill
    const instant = getInstantEnrichmentSync(sourceText, lang);
    if (instant && enrichReqIdRef.current === currentReqId) {
      if (lang === 'es') {
        if (instant.word && !hasManuallyEditedEnglish) {
          setWord(instant.word);
          const phon = getPhoneticsForEnglishWord(instant.word);
          if (!hasManuallyEditedPhoneticGuide && phon.phoneticGuide) setPhoneticGuide(phon.phoneticGuide);
          if (!hasManuallyEditedIpa && phon.ipa) setIpa(phon.ipa);
        }
      } else {
        if (instant.translation && !hasManuallyEditedTranslation) setTranslation(instant.translation);
        if (!hasManuallyEditedPhoneticGuide && instant.phoneticGuide) setPhoneticGuide(instant.phoneticGuide);
        if (!hasManuallyEditedIpa && instant.ipa) setIpa(instant.ipa);
      }
      if (instant.exampleEn && !hasManuallyEditedExamples) {
        setExampleEn((prev) => prev || instant.exampleEn || '');
        setExampleEs((prev) => prev || instant.exampleEs || '');
      }
      if (instant.partOfSpeech && !isPosManuallySelected) setPartOfSpeech(instant.partOfSpeech);
      if (instant.alternatives && instant.alternatives.length > 0) {
        setTranslationAlternatives(instant.alternatives);
      }
    }

    setLoadingAutoEnrich(true);
    try {
      const res = await autoEnrichWord(sourceText, lang, isGeminiConfigured());
      if (res && enrichReqIdRef.current === currentReqId) {
        let currentEnWord = word;
        if (lang === 'es') {
          if (!hasManuallyEditedEnglish && res.word) {
            setWord(res.word);
            currentEnWord = res.word;
          }
        } else {
          if (!hasManuallyEditedTranslation) {
            setTranslation(res.translation || '');
          }
        }
        if (res.alternatives && res.alternatives.length > 0) {
          setTranslationAlternatives(res.alternatives);
        }
        if (!hasManuallyEditedExamples && res.exampleEn) {
          setExampleEn(res.exampleEn);
          setExampleEs(res.exampleEs || '');
        }

        // Always update phonetics from the English word if not manually edited by the user
        if (!hasManuallyEditedPhoneticGuide) {
          if (res.phoneticGuide) {
            setPhoneticGuide(res.phoneticGuide);
          } else if (currentEnWord) {
            setPhoneticGuide(getPhoneticsForEnglishWord(currentEnWord).phoneticGuide);
          }
        }
        if (!hasManuallyEditedIpa) {
          if (res.ipa) {
            setIpa(res.ipa);
          } else if (currentEnWord) {
            setIpa(getPhoneticsForEnglishWord(currentEnWord).ipa);
          }
        }
        if (!isPosManuallySelected && res.partOfSpeech) {
          setPartOfSpeech(normalizePartOfSpeech(res.partOfSpeech));
        }
      }
    } catch (e) {
      console.warn('Auto enrich preview error:', e);
    } finally {
      if (enrichReqIdRef.current === currentReqId) {
        setLoadingAutoEnrich(false);
      }
    }
  }, [
    initialWord,
    inputLanguage,
    translation,
    word,
    hasManuallyEditedEnglish,
    hasManuallyEditedTranslation,
    hasManuallyEditedExamples,
    hasManuallyEditedPhoneticGuide,
    hasManuallyEditedIpa,
    isPosManuallySelected,
  ]);

  // Ultra-fast live auto-enrichment debounce (100ms)
  useEffect(() => {
    if (initialWord) return;

    const sourceText = inputLanguage === 'es' ? translation.trim() : word.trim();
    if (!sourceText || sourceText.length < 2) {
      setLoadingAutoEnrich(false);
      return;
    }

    const timer = setTimeout(() => {
      executeAutoEnrichNow(sourceText, inputLanguage);
    }, 100);

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
    if (clean.length > 0) {
      // Immediately calculate authentic English phonetics (both IPA and Spanish phonetic guide)
      const phon = getPhoneticsForEnglishWord(clean);
      if (!hasManuallyEditedPhoneticGuide && phon.phoneticGuide) {
        setPhoneticGuide(phon.phoneticGuide);
      }
      if (!hasManuallyEditedIpa && phon.ipa) {
        setIpa(phon.ipa);
      }

      if (clean.length >= 2 && !initialWord && inputLanguage === 'en') {
        const instant = getInstantEnrichmentSync(clean, 'en');
        if (instant) {
          if (instant.partOfSpeech && !isPosManuallySelected) setPartOfSpeech(instant.partOfSpeech);
          if (instant.translation && !hasManuallyEditedTranslation) setTranslation(instant.translation);
          if (instant.exampleEn && !hasManuallyEditedExamples && !exampleEn) {
            setExampleEn(instant.exampleEn);
            setExampleEs(instant.exampleEs || '');
          }
        }
      } else if (clean.length > 0 && !isPosManuallySelected && inputLanguage === 'en') {
        const quickPos = detectQuickPartOfSpeech(clean);
        if (quickPos) {
          setPartOfSpeech(quickPos);
        }
      }
    } else {
      if (!hasManuallyEditedPhoneticGuide) setPhoneticGuide('');
      if (!hasManuallyEditedIpa) setIpa('');
    }
  };

  const handleTranslationChange = (text: string) => {
    setTranslation(text);
    if (inputLanguage === 'en') {
      setHasManuallyEditedTranslation(true);
    }

    const clean = text.trim();
    if (clean.length >= 2 && !initialWord && inputLanguage === 'es') {
      const instant = getInstantEnrichmentSync(clean, 'es');
      if (instant) {
        if (instant.word && !hasManuallyEditedEnglish) {
          setWord(instant.word);
          const phon = getPhoneticsForEnglishWord(instant.word);
          if (!hasManuallyEditedPhoneticGuide && phon.phoneticGuide) {
            setPhoneticGuide(phon.phoneticGuide);
          }
          if (!hasManuallyEditedIpa && phon.ipa) {
            setIpa(phon.ipa);
          }
        }
        if (instant.partOfSpeech && !isPosManuallySelected) setPartOfSpeech(instant.partOfSpeech);
        if (instant.exampleEn && !hasManuallyEditedExamples && !exampleEn) {
          setExampleEn(instant.exampleEn);
          setExampleEs(instant.exampleEs || '');
        }
      }
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

  const handleClearWord = () => {
    enrichReqIdRef.current++;
    setWord('');
    setLoadingAutoEnrich(false);
    if (inputLanguage === 'es') {
      setHasManuallyEditedEnglish(false);
    } else {
      if (!hasManuallyEditedPhoneticGuide) setPhoneticGuide('');
      if (!hasManuallyEditedIpa) setIpa('');
    }
  };

  const handleClearTranslation = () => {
    enrichReqIdRef.current++;
    setTranslation('');
    setTranslationAlternatives([]);
    setLoadingAutoEnrich(false);
    if (inputLanguage === 'en') {
      setHasManuallyEditedTranslation(false);
    }
  };

  const handleClearExampleEn = () => {
    setExampleEn('');
    setHasManuallyEditedExamples(false);
  };

  const handleClearExampleEs = () => {
    setExampleEs('');
    setHasManuallyEditedExamples(false);
  };

  const handleClearPhoneticGuide = () => {
    setPhoneticGuide('');
    setHasManuallyEditedPhoneticGuide(true);
  };

  const handleClearIpa = () => {
    setIpa('');
    setHasManuallyEditedIpa(true);
  };

  // On-demand AI suggestion generator for word
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

    if (!isGeminiConfigured()) {
      setValidationError('La API de Google Gemini no está configurada. Puedes añadir tu clave en Ajustes.');
      return;
    }

    setLoadingAutoEnrich(true);
    setValidationError(null);
    try {
      const res = await autoEnrichWord(currentInput, inputLanguage, true);
      if (res) {
        if (inputLanguage === 'es') {
          setWord(res.word || '');
        } else {
          setTranslation(res.translation || '');
        }
        if (res.alternatives && res.alternatives.length > 0) {
          setTranslationAlternatives(res.alternatives);
        }
        setExampleEn(res.exampleEn || '');
        setExampleEs(res.exampleEs || '');
        if (res.phoneticGuide) {
          setPhoneticGuide(res.phoneticGuide);
          setHasManuallyEditedPhoneticGuide(false);
        }
        if (res.ipa) {
          setIpa(res.ipa);
          setHasManuallyEditedIpa(false);
        }
        if (res.partOfSpeech) setPartOfSpeech(normalizePartOfSpeech(res.partOfSpeech));
        setHasManuallyEditedEnglish(true);
        setHasManuallyEditedTranslation(true);
        setHasManuallyEditedExamples(true);
      }
    } catch (e: any) {
      console.warn('Error al autocompletar con traducción:', e);
      setValidationError(`Error al traducir con IA: ${e?.message || 'Error de conexión'}`);
    } finally {
      setLoadingAutoEnrich(false);
    }
  };

  // Recalculate phonetics for the current English word on demand
  const handleRecalculatePhonetics = (forcedWord?: string) => {
    const targetWord = (forcedWord || word).trim();
    if (!targetWord) return;
    const phon = getPhoneticsForEnglishWord(targetWord);
    setPhoneticGuide(phon.phoneticGuide);
    setIpa(phon.ipa);
    setHasManuallyEditedPhoneticGuide(false);
    setHasManuallyEditedIpa(false);
  };

  // Generate authentic, contextual example sentences with AI
  const handleGenerateSentencesWithAI = async () => {
    const targetWord = word.trim() || translation.trim();
    if (!targetWord) {
      setValidationError(
        inputLanguage === 'es'
          ? 'Por favor escribe primero la palabra en español o inglés para generar frases con IA.'
          : 'Por favor escribe primero la palabra en inglés o español para generar frases con IA.'
      );
      return;
    }

    setGeneratingSentences(true);
    setValidationError(null);

    try {
      const currentEn = word.trim();
      const currentEs = translation.trim();
      const pair = await generateExampleSentencesWithAI(
        currentEn || currentEs,
        currentEs || undefined,
        partOfSpeech || undefined
      );

      if (pair && pair.exampleEn && pair.exampleEs) {
        setExampleEn(pair.exampleEn);
        setExampleEs(pair.exampleEs);
        setHasManuallyEditedExamples(true);
      } else {
        // Fallback: translate existing sentence if user had already written one
        if (exampleEn.trim() && !exampleEs.trim()) {
          await handleTranslateSentence('en_to_es');
        } else if (exampleEs.trim() && !exampleEn.trim()) {
          await handleTranslateSentence('es_to_en');
        } else {
          setValidationError('No se pudo generar la frase de ejemplo. Inténtalo de nuevo.');
        }
      }
    } catch (err: any) {
      console.warn('Error generating sentences with AI:', err);
      setValidationError(`Error al generar frases: ${err?.message || 'Error de conexión'}`);
    } finally {
      setGeneratingSentences(false);
    }
  };

  // Translate example phrases (sentences) with AI
  const handleTranslateSentence = async (direction: 'en_to_es' | 'es_to_en') => {
    const sourceText = direction === 'en_to_es' ? exampleEn.trim() : exampleEs.trim();

    // If sourceText is empty, smartly generate both sentences with AI instead of showing an error
    if (!sourceText) {
      await handleGenerateSentencesWithAI();
      return;
    }

    setTranslatingSentence(direction);
    setValidationError(null);

    try {
      const fromLang = direction === 'en_to_es' ? 'en' : 'es';
      const toLang = direction === 'en_to_es' ? 'es' : 'en';
      const result = await translatePhrase(sourceText, fromLang, toLang);
      if (result && result.text) {
        if (direction === 'en_to_es') {
          setExampleEs(result.text);
        } else {
          setExampleEn(result.text);
        }
        setHasManuallyEditedExamples(true);
      }
    } catch (err: any) {
      console.warn('Error translating sentence:', err);
      setValidationError(`Error al traducir frase: ${err?.message || 'Verifica la clave API'}`);
    } finally {
      setTranslatingSentence(null);
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
    const cleanSub = customCategorySubInput.trim();
    if (!clean) return;

    // 1. Registrar formalmente en vocabService la categoría con su subcategoría asociada
    const subsToRegister = cleanSub ? [cleanSub] : [];
    vocabService.addCategory(clean, subsToRegister);

    // 2. Seleccionar la categoría creada
    if (!selectedCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setSelectedCategories((prev) => [...prev, clean]);
    }

    // 3. Seleccionar la subcategoría si fue proporcionada
    if (cleanSub) {
      if (!selectedSubcategories.some((s) => s.toLowerCase() === cleanSub.toLowerCase())) {
        setSelectedSubcategories((prev) => [...prev, cleanSub]);
      }
    }

    setCustomCategoryInput('');
    setCustomCategorySubInput('');
    setIsCustomCategoryMode(false);
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
      // Asociar la nueva subcategoría a las categorías actualmente seleccionadas en vocabService
      const currentCats = vocabService.getCategories();
      selectedCategories.forEach((catName) => {
        const found = currentCats.find((c) => c.name.toLowerCase() === catName.toLowerCase());
        if (found) {
          vocabService.addSubcategory(found.id, clean);
        }
      });
      setCustomSubcategoryInput('');
      setIsCustomSubcategoryMode(false);
    }
  };

  // Multiple Translation Alternative Helpers
  const handleToggleTranslationAlternative = (alt: string) => {
    const isEs = inputLanguage === 'es';
    const currentText = (isEs ? word : translation).trim();
    const cleanAlt = alt.trim();
    if (!cleanAlt) return;

    const parts = currentText
      ? currentText
          .split(/\s*[\/,;]\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const altLower = cleanAlt.toLowerCase();
    const exists = parts.some((p) => p.toLowerCase() === altLower);

    let newParts: string[];
    if (exists) {
      newParts = parts.filter((p) => p.toLowerCase() !== altLower);
    } else {
      newParts = [...parts, cleanAlt];
    }

    const newText = newParts.join(' / ');
    if (isEs) {
      setWord(newText);
      setHasManuallyEditedEnglish(true);
    } else {
      setTranslation(newText);
      setHasManuallyEditedTranslation(true);
    }
  };

  const isAlternativeSelected = (alt: string) => {
    const isEs = inputLanguage === 'es';
    const currentText = (isEs ? word : translation).trim().toLowerCase();
    const cleanAlt = alt.trim().toLowerCase();
    if (!currentText || !cleanAlt) return false;
    const parts = currentText
      .split(/\s*[\/,;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.includes(cleanAlt);
  };

  const renderAlternativeTranslationChips = () => {
    if (!translationAlternatives || translationAlternatives.length === 0) return null;

    return (
      <View style={[styles.altsContainer, !isDark && styles.altsContainerLight]}>
        <View style={styles.altsHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Sparkles size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
            <Text style={[styles.altsTitle, !isDark && styles.altsTitleLight]}>
              Traducciones alternativas sugeridas:
            </Text>
          </View>
          <Text style={[styles.altsHint, !isDark && styles.altsHintLight]}>
            Toca para añadir con barra ( / )
          </Text>
        </View>

        <View style={styles.altsChipsRow}>
          {translationAlternatives.map((alt, idx) => {
            const active = isAlternativeSelected(alt);
            return (
              <TouchableOpacity
                key={`${alt}_${idx}`}
                style={[
                  styles.altChip,
                  !isDark && styles.altChipLight,
                  active && styles.altChipActive,
                  !isDark && active && styles.altChipActiveLight,
                ]}
                onPress={() => handleToggleTranslationAlternative(alt)}
                activeOpacity={0.7}
              >
                {active ? (
                  <Check size={11} color="#ffffff" style={{ marginRight: 4 }} />
                ) : (
                  <Plus size={11} color={!isDark ? '#e11d48' : '#ff758c'} style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[
                    styles.altChipText,
                    !isDark && styles.altChipTextLight,
                    active && styles.altChipTextActive,
                  ]}
                >
                  {alt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const handleSave = async () => {
    let cleanWord = word.trim();
    let finalTranslation = translation.trim();

    // If in Spanish mode and English word hasn't been set yet, resolve via Spanish
    if (inputLanguage === 'es' && !cleanWord && finalTranslation) {
      setSaving(true);
      try {
        const enriched = await autoEnrichWord(finalTranslation, 'es', isGeminiConfigured());
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
        const enriched = await autoEnrichWord(cleanWord, 'en', isGeminiConfigured());
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

    // Normalizar formato de múltiples traducciones: "Traducción 1 / Traducción 2"
    if (finalTranslation.includes('/') || finalTranslation.includes(',')) {
      finalTranslation = finalTranslation
        .split(/\s*[\/,]\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' / ');
    }

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

    // Ensure phonetics are always computed from the English word if empty
    if (cleanWord) {
      const autoPhon = getPhoneticsForEnglishWord(cleanWord);
      if (!finalPhoneticGuide) {
        finalPhoneticGuide = autoPhon.phoneticGuide;
      }
      if (!finalIpa) {
        finalIpa = autoPhon.ipa;
      }
    }

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
      phoneticGuide: finalPhoneticGuide || (cleanWord ? getPhoneticsForEnglishWord(cleanWord).phoneticGuide : `"${cleanWord.toLowerCase()}"`),
      ipa: finalIpa || (cleanWord ? getPhoneticsForEnglishWord(cleanWord).ipa : ''),
      definition: finalTranslation,
      exampleEn: finalExampleEn,
      exampleEs: finalExampleEs,
      level:
        initialWord &&
        initialWord.level &&
        initialWord.level !== 'B1' &&
        initialWord.word.trim().toLowerCase() === cleanWord.trim().toLowerCase()
          ? initialWord.level
          : getWordLevel(cleanWord),
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
                      style={[
                        styles.aiSuggestBtn,
                        !isDark && styles.aiSuggestBtnLight,
                      ]}
                      onPress={() => handleRegenerateWithAI()}
                      disabled={loadingAutoEnrich}
                      activeOpacity={0.7}
                    >
                      {loadingAutoEnrich ? (
                        <ActivityIndicator size="small" color={!isDark ? '#e11d48' : '#ff758c'} />
                      ) : (
                        <Sparkles size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      )}
                      <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>
                        {loadingAutoEnrich ? 'Traduciendo...' : 'IA'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      !isDark && styles.inputLight,
                      focusedField === 'translation' && styles.inputFocused,
                      Boolean(translation) && styles.inputWithClearBtn,
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
                  <ClearInputButton
                    visible={Boolean(translation && translation.length > 0)}
                    onClear={handleClearTranslation}
                    isDark={isDark}
                  />
                </View>

                {loadingAutoEnrich && !isEditing && (
                  <View style={styles.inlineLoadingBox}>
                    <ActivityIndicator size="small" color="#ff4d6d" />
                    <Text style={[styles.inlineLoadingText, !isDark && styles.inlineLoadingTextLight]}>
                      Traduciendo con IA y buscando datos...
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
                      style={[
                        styles.aiSuggestBtn,
                        !isDark && styles.aiSuggestBtnLight,
                      ]}
                      onPress={() => handleRegenerateWithAI()}
                      disabled={loadingAutoEnrich}
                      activeOpacity={0.7}
                    >
                      {loadingAutoEnrich ? (
                        <ActivityIndicator size="small" color={!isDark ? '#e11d48' : '#ff758c'} />
                      ) : (
                        <Sparkles size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      )}
                      <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>
                        {loadingAutoEnrich ? 'Traduciendo...' : 'IA'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      !isDark && styles.inputLight,
                      focusedField === 'word' && styles.inputFocused,
                      Boolean(word) && styles.inputWithClearBtn,
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
                  <ClearInputButton
                    visible={Boolean(word && word.length > 0)}
                    onClear={handleClearWord}
                    isDark={isDark}
                  />
                </View>

                {loadingAutoEnrich && !isEditing && (
                  <View style={styles.inlineLoadingBox}>
                    <ActivityIndicator size="small" color="#ff4d6d" />
                    <Text style={[styles.inlineLoadingText, !isDark && styles.inlineLoadingTextLight]}>
                      Traduciendo con IA y buscando datos...
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
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      !isDark && styles.inputLight,
                      focusedField === 'word' && styles.inputFocused,
                      Boolean(word) && styles.inputWithClearBtn,
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
                  <ClearInputButton
                    visible={Boolean(word && word.length > 0)}
                    onClear={handleClearWord}
                    isDark={isDark}
                  />
                </View>
                {renderAlternativeTranslationChips()}
              </View>
            ) : (
              // 2. Secundaria: Significado al Español
              <View style={styles.inputGroup}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Significado / Traducción (Español) *
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      !isDark && styles.inputLight,
                      focusedField === 'translation' && styles.inputFocused,
                      Boolean(translation) && styles.inputWithClearBtn,
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
                  <ClearInputButton
                    visible={Boolean(translation && translation.length > 0)}
                    onClear={handleClearTranslation}
                    isDark={isDark}
                  />
                </View>
                {renderAlternativeTranslationChips()}
              </View>
            )}

            {/* 3. Frase de Ejemplo en Inglés */}
            <View style={styles.inputGroup}>
              <View style={styles.labelActionRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Frase de Ejemplo (Inglés)
                </Text>
                <View style={styles.labelActions}>
                  {exampleEn.trim().length > 0 && (
                    <TouchableOpacity
                      style={[styles.speakerBtn, !isDark && styles.speakerBtnLight]}
                      onPress={() => vocabService.speak(exampleEn)}
                      activeOpacity={0.7}
                    >
                      <Volume2 size={13} color={!isDark ? '#e11d48' : THEME.colors.crimsonLight} />
                      <Text style={[styles.speakerBtnText, !isDark && styles.speakerBtnTextLight]}>Escuchar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.aiSuggestBtn,
                      !isDark && styles.aiSuggestBtnLight,
                    ]}
                    onPress={handleGenerateSentencesWithAI}
                    disabled={generatingSentences || Boolean(translatingSentence)}
                    activeOpacity={0.7}
                    accessibilityLabel="Generar frases con IA"
                  >
                    {generatingSentences ? (
                      <ActivityIndicator size="small" color={!isDark ? '#e11d48' : '#ff758c'} />
                    ) : (
                      <Sparkles size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                    )}
                    <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>
                      {generatingSentences ? 'Generando...' : 'IA Frases'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    !isDark && styles.inputLight,
                    focusedField === 'exampleEn' && styles.inputFocused,
                    Boolean(exampleEn) && styles.textAreaWithClearBtn,
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
                <ClearInputButton
                  visible={Boolean(exampleEn && exampleEn.length > 0)}
                  onClear={handleClearExampleEn}
                  isDark={isDark}
                  isTextArea
                />
              </View>
            </View>

            {/* 4. Traducción de la Frase en Español */}
            <View style={styles.inputGroup}>
              <View style={styles.labelActionRow}>
                <Text style={[styles.label, !isDark && styles.labelLight]}>
                  Traducción de la Frase (Español)
                </Text>
                <View style={styles.labelActions}>
                  <TouchableOpacity
                    style={[
                      styles.aiSuggestBtn,
                      !isDark && styles.aiSuggestBtnLight,
                    ]}
                    onPress={() => {
                      if (exampleEn.trim()) {
                        handleTranslateSentence('en_to_es');
                      } else {
                        handleGenerateSentencesWithAI();
                      }
                    }}
                    disabled={Boolean(translatingSentence) || generatingSentences}
                    activeOpacity={0.7}
                    accessibilityLabel="Traducir o generar frase con IA"
                  >
                    {translatingSentence === 'en_to_es' || generatingSentences ? (
                      <ActivityIndicator size="small" color={!isDark ? '#e11d48' : '#ff758c'} />
                    ) : (
                      <Sparkles size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                    )}
                    <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>
                      {translatingSentence === 'en_to_es'
                        ? 'Traduciendo...'
                        : exampleEn.trim() && !exampleEs.trim()
                        ? 'Traducir con IA'
                        : 'IA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    !isDark && styles.inputLight,
                    focusedField === 'exampleEs' && styles.inputFocused,
                    Boolean(exampleEs) && styles.textAreaWithClearBtn,
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
                <ClearInputButton
                  visible={Boolean(exampleEs && exampleEs.length > 0)}
                  onClear={handleClearExampleEs}
                  isDark={isDark}
                  isTextArea
                />
              </View>
            </View>

            {/* 5. Pronunciación Fonética (Guía & IPA) */}
            <View style={styles.inputGroup}>
              <View style={[styles.labelActionRow, !isDesktop && styles.labelActionRowMobile]}>
                <View style={styles.labelTitleContainer}>
                  <Text style={[styles.label, !isDark && styles.labelLight]}>
                    Pronunciación Fonética
                  </Text>
                  <Text style={[styles.subLabelHint, !isDark && styles.subLabelHintLight]}>
                    Cómo se dice en inglés (Lectura en español e IPA)
                  </Text>
                </View>
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
                  {word.trim().length > 0 && (
                    <TouchableOpacity
                      style={[styles.aiSuggestBtn, !isDark && styles.aiSuggestBtnLight]}
                      onPress={() => handleRecalculatePhonetics()}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={12} color={!isDark ? '#e11d48' : '#ff758c'} />
                      <Text style={[styles.aiSuggestBtnText, !isDark && styles.aiSuggestBtnTextLight]}>Recalcular</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[styles.autoPosSubtext, !isDark && styles.autoPosSubtextLight, { marginTop: -2, marginBottom: 2 }]}>
                ✨ Se completa automáticamente de cómo se dice la palabra en inglés (leído en español e IPA).
              </Text>

              <View style={[styles.rowCols, !isDesktop && styles.rowColsMobile]}>
                <View style={[styles.colHalf, !isDesktop && styles.colFull]}>
                  <Text style={[styles.subLabel, !isDark && styles.subLabelLight]}>
                    Guía Fonética (Lectura en español)
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        !isDark && styles.inputLight,
                        focusedField === 'phoneticGuide' && styles.inputFocused,
                        Boolean(phoneticGuide) && styles.inputWithClearBtn,
                      ]}
                      placeholder='Ej: "breik-zru", "áp-l"'
                      placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                      value={phoneticGuide}
                      onChangeText={(text) => {
                        setPhoneticGuide(text);
                        setHasManuallyEditedPhoneticGuide(true);
                      }}
                      onFocus={() => {
                        setFocusedField('phoneticGuide');
                        setIsCategoryDropdownOpen(false);
                        setIsSubcategoryDropdownOpen(false);
                      }}
                      onBlur={() => setFocusedField(null)}
                    />
                    <ClearInputButton
                      visible={Boolean(phoneticGuide && phoneticGuide.length > 0)}
                      onClear={handleClearPhoneticGuide}
                      isDark={isDark}
                    />
                  </View>
                </View>

                <View style={[styles.colHalf, !isDesktop && styles.colFull]}>
                  <Text style={[styles.subLabel, !isDark && styles.subLabelLight]}>
                    Fonética IPA (Internacional)
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        !isDark && styles.inputLight,
                        focusedField === 'ipa' && styles.inputFocused,
                        Boolean(ipa) && styles.inputWithClearBtn,
                      ]}
                      placeholder="Ej: /ˈbreɪkˌθruː/, /ˈæp.əl/"
                      placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                      value={ipa}
                      onChangeText={(text) => {
                        setIpa(text);
                        setHasManuallyEditedIpa(true);
                      }}
                      onFocus={() => {
                        setFocusedField('ipa');
                        setIsCategoryDropdownOpen(false);
                        setIsSubcategoryDropdownOpen(false);
                      }}
                      onBlur={() => setFocusedField(null)}
                    />
                    <ClearInputButton
                      visible={Boolean(ipa && ipa.length > 0)}
                      onClear={handleClearIpa}
                      isDark={isDark}
                    />
                  </View>
                </View>
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

              {/* Input para agregar nueva categoría personalizada y subcategoría asociada */}
              {isCustomCategoryMode ? (
                <View style={[styles.customCategoryCard, !isDark && styles.customCategoryCardLight]}>
                  <View style={styles.customCategoryHeader}>
                    <Folder size={14} color="#e62e4c" />
                    <Text style={[styles.customCategoryCardTitle, !isDark && styles.customCategoryCardTitleLight]}>
                      Nueva Categoría y Subcategoría asociada
                    </Text>
                  </View>

                  <View style={styles.customInputRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <TextInput
                        style={[
                          styles.input,
                          !isDark && styles.inputLight,
                          Boolean(customCategoryInput) && styles.inputWithClearBtn,
                        ]}
                        placeholder="Nombre de la nueva categoría principal *"
                        placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                        value={customCategoryInput}
                        onChangeText={setCustomCategoryInput}
                        autoFocus
                      />
                      <ClearInputButton
                        visible={Boolean(customCategoryInput && customCategoryInput.length > 0)}
                        onClear={() => setCustomCategoryInput('')}
                        isDark={isDark}
                      />
                    </View>
                  </View>

                  <View style={[styles.customInputRow, { marginTop: 6 }]}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <TextInput
                        style={[
                          styles.input,
                          !isDark && styles.inputLight,
                          Boolean(customCategorySubInput) && styles.inputWithClearBtn,
                        ]}
                        placeholder="Subcategoría asociada (opcional)..."
                        placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                        value={customCategorySubInput}
                        onChangeText={setCustomCategorySubInput}
                        onSubmitEditing={handleAddCustomCategory}
                      />
                      <ClearInputButton
                        visible={Boolean(customCategorySubInput && customCategorySubInput.length > 0)}
                        onClear={() => setCustomCategorySubInput('')}
                        isDark={isDark}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.saveCustomBtn,
                        !customCategoryInput.trim() && { opacity: 0.5 },
                      ]}
                      onPress={handleAddCustomCategory}
                      disabled={!customCategoryInput.trim()}
                    >
                      <Sparkles size={13} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.saveCustomBtnText}>Asociar</Text>
                    </TouchableOpacity>
                  </View>

                  {customCategoryInput.trim() ? (
                    <Text style={[styles.customCategoryHint, !isDark && styles.customCategoryHintLight]}>
                      {customCategorySubInput.trim()
                        ? `✓ «${customCategorySubInput.trim()}» quedará asociada a la categoría «${customCategoryInput.trim()}».`
                        : `✓ Se registrará la categoría «${customCategoryInput.trim()}».`}
                    </Text>
                  ) : null}
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
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <TextInput
                      style={[
                        styles.input,
                        !isDark && styles.inputLight,
                        Boolean(customSubcategoryInput) && styles.inputWithClearBtn,
                      ]}
                      placeholder="Nombre de la nueva subcategoría..."
                      placeholderTextColor={!isDark ? '#94a3b8' : THEME.colors.textSubtle}
                      value={customSubcategoryInput}
                      onChangeText={setCustomSubcategoryInput}
                      autoFocus
                    />
                    <ClearInputButton
                      visible={Boolean(customSubcategoryInput && customSubcategoryInput.length > 0)}
                      onClear={() => setCustomSubcategoryInput('')}
                      isDark={isDark}
                    />
                  </View>
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
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
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
    gap: 8,
  },
  labelActionRowMobile: {
    flexWrap: 'wrap',
    gap: 8,
  },
  labelTitleContainer: {
    flex: 1,
    minWidth: 140,
  },
  subLabelHint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  subLabelHintLight: {
    color: '#64748b',
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
  actionBtnActive: {
    borderWidth: 1.5,
    borderColor: '#ff4d6d',
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
  inputWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
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
  inputWithClearBtn: {
    paddingRight: 38,
  },
  textArea: {
    height: 68,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  textAreaWithClearBtn: {
    paddingRight: 38,
  },
  clearFieldBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as any) : {}),
  },
  clearFieldBtnLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  clearFieldBtnTextArea: {
    top: 10,
    right: 10,
  },
  inputFocused: {
    borderColor: THEME.colors.crimson,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
  },
  rowCols: {
    flexDirection: 'row',
    gap: 10,
  },
  rowColsMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  colHalf: {
    flex: 1,
    gap: 6,
  },
  colFull: {
    width: '100%',
    flex: undefined,
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
  customCategoryCard: {
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    padding: 12,
    gap: 8,
  },
  customCategoryCardLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  customCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  customCategoryCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customCategoryCardTitleLight: {
    color: '#9f1239',
  },
  customCategoryHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ff758c',
    marginTop: 2,
  },
  customCategoryHintLight: {
    color: '#b91c1c',
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
  subLabelLight: {
    color: '#64748b',
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

  // Alternative Translation Chips Styles
  altsContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(230, 46, 76, 0.05)',
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.18)',
    gap: 8,
  },
  altsContainerLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  altsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  altsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  altsTitleLight: {
    color: '#9f1239',
  },
  altsHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  altsHintLight: {
    color: '#94a3b8',
  },
  altsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  altChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full || 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
  },
  altChipLight: {
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
  },
  altChipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  altChipActiveLight: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  altChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.crimsonLight,
  },
  altChipTextLight: {
    color: '#e11d48',
  },
  altChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
