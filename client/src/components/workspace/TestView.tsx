import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Zap,
  Tag,
  Sparkles,
  Layers,
  HelpCircle,
  Check,
} from 'lucide-react-native';
import { WordItem, PART_OF_SPEECH_OPTIONS, PartOfSpeech } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { testHistoryService } from '../../lib/testHistoryStore';
import { normalizePartOfSpeech, detectQuickPartOfSpeech } from '../../lib/dictionaryService';
import { IrregularVerbsTestView } from './IrregularVerbsTestView';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

interface TestViewProps {
  words: WordItem[];
  onBackToVocabulary: () => void;
  isDark?: boolean;
}

interface QuizQuestion {
  targetWord: WordItem;
  prompt: string;
  helperBadge?: string;
  options: string[];
  correctAnswer: string;
}

const FALLBACK_DISTRACTORS = [
  'aprender', 'correr', 'casa', 'rápido', 'feliz', 'libro',
  'comer', 'grande', 'tiempo', 'hablar', 'mundo', 'nuevo',
  'amigo', 'caminar', 'escribir', 'entender', 'dormir', 'fuerte'
];

export const TestView: React.FC<TestViewProps> = ({ words, onBackToVocabulary, isDark = true }) => {
  const [testType, setTestType] = useState<'vocabulary' | 'part_of_speech' | 'irregular_verbs'>('vocabulary');
  const [selectedLevel, setSelectedLevel] = useState<string>('TODOS');
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<string>('TODOS');
  const [posQuizMode, setPosQuizMode] = useState<'identify_type' | 'translation'>('identify_type');

  const [isTestActive, setIsTestActive] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [insufficientWordsModal, setInsufficientWordsModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  // Helper: resolver tipo de palabra garantizado para cualquier palabra
  const resolvePos = (w: WordItem): PartOfSpeech => {
    if (w.partOfSpeech) {
      return normalizePartOfSpeech(w.partOfSpeech);
    }
    return detectQuickPartOfSpeech(w.word) || 'Sustantivo';
  };

  // Conteo de palabras por cada tipo de palabra
  const posCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PART_OF_SPEECH_OPTIONS.forEach((opt) => {
      counts[opt] = 0;
    });

    words.forEach((w) => {
      const p = resolvePos(w);
      counts[p] = (counts[p] || 0) + 1;
    });

    return counts;
  }, [words]);

  // Palabras disponibles según filtros activos
  const availableWords = useMemo(() => {
    return words.filter((w) => {
      const matchLevel = selectedLevel === 'TODOS' || w.level === selectedLevel;
      const wordPos = resolvePos(w);
      const matchPos = selectedPartOfSpeech === 'TODOS' || wordPos === selectedPartOfSpeech;
      return matchLevel && matchPos;
    });
  }, [words, selectedLevel, selectedPartOfSpeech]);

  // Iniciar Test
  const startQuiz = () => {
    if (availableWords.length === 0) {
      setModalMessage(
        `No se encontraron palabras para el filtro seleccionado (${selectedPartOfSpeech !== 'TODOS' ? `Tipo: ${selectedPartOfSpeech}` : ''} ${selectedLevel !== 'TODOS' ? `Nivel: ${selectedLevel}` : ''}). Selecciona otra opción o añade nuevas palabras.`
      );
      setInsufficientWordsModal(true);
      return;
    }

    const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    let generated: QuizQuestion[] = [];

    // Modo A: Identificar categoría gramatical (¿Qué tipo de palabra es?)
    if (testType === 'part_of_speech' && posQuizMode === 'identify_type') {
      generated = selected.map((word) => {
        const correctPos = resolvePos(word);

        // 3 distractores aleatorios de las otras categorías gramaticales
        const otherOptions = PART_OF_SPEECH_OPTIONS.filter((p) => p !== correctPos);
        const shuffledDistractors = [...otherOptions].sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [correctPos, ...shuffledDistractors].sort(() => Math.random() - 0.5);

        return {
          targetWord: word,
          prompt: `¿A qué categoría gramatical pertenece "${word.word}"?`,
          helperBadge: word.translation ? `Traducción: ${word.translation}` : undefined,
          options,
          correctAnswer: correctPos,
        };
      });
    } else {
      // Modo B: Traducción estándar (Vocabulario general o filtrado por tipo)
      const allTranslationsPool = words.map((w) => w.translation).filter(Boolean);
      const combinedPool = Array.from(new Set([...allTranslationsPool, ...FALLBACK_DISTRACTORS]));

      generated = selected.map((word) => {
        const correctPos = resolvePos(word);
        const otherTranslations = combinedPool.filter(
          (t) => t.toLowerCase() !== word.translation.toLowerCase()
        );
        const distractors = otherTranslations.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [word.translation, ...distractors].sort(() => Math.random() - 0.5);

        return {
          targetWord: word,
          prompt:
            selectedPartOfSpeech !== 'TODOS'
              ? `¿Cuál es la traducción correcta de este ${selectedPartOfSpeech.toLowerCase()}?`
              : '¿Cuál es la traducción correcta?',
          helperBadge: `Tipo: ${correctPos}`,
          options,
          correctAnswer: word.translation,
        };
      });
    }

    setQuestions(generated);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsTestFinished(false);
    setIsTestActive(true);
  };

  const handleSelectOption = (opt: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(opt);

    const isCorrect = opt === questions[currentIdx].correctAnswer;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setIsTestFinished(true);
    setIsTestActive(false);

    const total = questions.length;
    const finalScore = score + (selectedAnswer === questions[currentIdx]?.correctAnswer ? 1 : 0);
    const score10 = total > 0 ? Number(((finalScore / total) * 10).toFixed(1)) : 0;
    const percentage = total > 0 ? Math.round((finalScore / total) * 100) : 0;

    let grade = 'Insuficiente';
    if (percentage >= 90) grade = 'Excelente';
    else if (percentage >= 70) grade = 'Notable';
    else if (percentage >= 50) grade = 'Aprobado';

    let testTitle = `Vocabulario (${selectedLevel})`;
    let historyType: 'vocabulary' | 'part_of_speech' = 'vocabulary';

    if (testType === 'part_of_speech') {
      historyType = 'part_of_speech';
      if (posQuizMode === 'identify_type') {
        testTitle = selectedPartOfSpeech !== 'TODOS'
          ? `Identificar Categoría (${selectedPartOfSpeech})`
          : 'Identificar Tipo de Palabra';
      } else {
        testTitle = `Test por Tipo: ${selectedPartOfSpeech}`;
      }
    } else if (selectedPartOfSpeech !== 'TODOS') {
      testTitle = `Vocabulario: ${selectedPartOfSpeech} (${selectedLevel})`;
    }

    testHistoryService.addTest({
      type: historyType,
      title: testTitle,
      level: selectedLevel,
      scoreOutOfTen: score10,
      percentage,
      gradeLabel: grade,
      totalQuestions: total,
      correctCount: finalScore,
      completedAt: new Date().toISOString(),
    });
  };

  // Modo: Verbos Irregulares
  if (testType === 'irregular_verbs') {
    return (
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={[styles.modeTabBar, !isDark && styles.modeTabBarLight]}>
            <TouchableOpacity
              style={styles.modeTab}
              onPress={() => {
                setTestType('vocabulary');
                setIsTestActive(false);
                setIsTestFinished(false);
              }}
            >
              <BookOpen size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
              <Text style={[styles.modeTabText, !isDark && styles.modeTabTextLight]}>
                Test Vocabulario
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeTab}
              onPress={() => {
                setTestType('part_of_speech');
                setIsTestActive(false);
                setIsTestFinished(false);
              }}
            >
              <Tag size={16} color={!isDark ? '#64748b' : THEME.colors.textMuted} />
              <Text style={[styles.modeTabText, !isDark && styles.modeTabTextLight]}>
                Test por Tipo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, styles.modeTabActive]}
              onPress={() => setTestType('irregular_verbs')}
            >
              <Zap size={16} color="#ffffff" />
              <Text style={[styles.modeTabText, styles.modeTabTextActive]}>
                Verbos Irregulares
              </Text>
            </TouchableOpacity>
          </View>

          <IrregularVerbsTestView onBackToVocabulary={onBackToVocabulary} isDark={isDark} />
        </View>
      </View>
    );
  }

  // Pantalla de Resultados
  if (isTestFinished) {
    const total = questions.length;
    const score10 = total > 0 ? Number(((score / total) * 10).toFixed(1)) : 0;

    return (
      <View style={styles.centerContainer}>
        <View style={styles.contentWrapper}>
          <View style={[styles.card, !isDark && styles.cardLight]}>
            <View style={styles.resultsBadge}>
              <Trophy size={42} color={THEME.colors.amber} />
            </View>
            <Text style={[styles.resultTitle, !isDark && styles.resultTitleLight]}>
              {testType === 'part_of_speech'
                ? '¡Test por Tipo Finalizado!'
                : '¡Test de Vocabulario Finalizado!'}
            </Text>
            <Text style={styles.resultScore}>{score10} / 10</Text>
            <Text style={[styles.resultSub, !isDark && styles.resultSubLight]}>
              Has respondido correctamente {score} de {total} preguntas.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={startQuiz}>
              <RotateCcw size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Repetir Evaluación</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, !isDark && styles.secondaryBtnLight]}
              onPress={() => {
                setIsTestFinished(false);
                setIsTestActive(false);
              }}
            >
              <Text style={[styles.secondaryBtnText, !isDark && styles.secondaryBtnTextLight]}>
                Cambiar Filtros o Modalidad
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Pantalla de Quiz Activo
  if (isTestActive && questions.length > 0) {
    const q = questions[currentIdx];

    return (
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          {/* Header con progreso */}
          <View style={styles.quizHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.quizStep, !isDark && styles.quizStepLight]}>
                Pregunta {currentIdx + 1} de {questions.length}
              </Text>
              {q.helperBadge && (
                <View style={[styles.quizBadgePill, !isDark && styles.quizBadgePillLight]}>
                  <Text style={[styles.quizBadgePillText, !isDark && styles.quizBadgePillTextLight]}>
                    {q.helperBadge}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsTestActive(false);
                setIsTestFinished(false);
              }}
            >
              <Text style={[styles.cancelLink, !isDark && styles.cancelLinkLight]}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de progreso */}
          <View style={[styles.progressBarTrack, !isDark && styles.progressBarTrackLight]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIdx + 1) / questions.length) * 100}%` },
              ]}
            />
          </View>

          {/* Tarjeta de la Pregunta */}
          <View style={[styles.card, !isDark && styles.cardLight]}>
            <Text style={[styles.questionPrompt, !isDark && styles.questionPromptLight]}>
              {q.prompt}
            </Text>

            <View style={styles.wordAudioRow}>
              <Text style={[styles.quizWord, !isDark && styles.quizWordLight]}>
                {q.targetWord.word}
              </Text>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() => vocabService.speak(q.targetWord.word)}
                activeOpacity={0.7}
              >
                <Volume2 size={20} color={THEME.colors.crimsonLight} />
              </TouchableOpacity>
            </View>

            {q.targetWord.phoneticGuide ? (
              <Text style={styles.phoneticPrompt}>
                Pronunciación: {q.targetWord.phoneticGuide}
              </Text>
            ) : null}

            {/* Opciones múltiples */}
            <View style={styles.optionsList}>
              {q.options.map((opt, i) => {
                const isCorrect = opt === q.correctAnswer;
                const isSelected = selectedAnswer === opt;

                const baseBtnStyle = [styles.optionBtn, !isDark && styles.optionBtnLight];
                let btnStyle = baseBtnStyle;
                if (selectedAnswer !== null) {
                  if (isCorrect) btnStyle = [...baseBtnStyle, styles.optionCorrect];
                  else if (isSelected) btnStyle = [...baseBtnStyle, styles.optionWrong];
                }

                return (
                  <TouchableOpacity
                    key={i}
                    style={btnStyle}
                    onPress={() => handleSelectOption(opt)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        !isDark && styles.optionTextLight,
                        selectedAnswer !== null && isCorrect && styles.optionTextCorrect,
                      ]}
                    >
                      {opt}
                    </Text>
                    {selectedAnswer !== null && isCorrect && (
                      <CheckCircle2 size={18} color={THEME.colors.emerald} />
                    )}
                    {selectedAnswer !== null && isSelected && !isCorrect && (
                      <XCircle size={18} color="#f87171" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botón siguiente */}
            {selectedAnswer !== null && (
              <TouchableOpacity
                style={styles.nextQuestionBtn}
                onPress={handleNextQuestion}
                activeOpacity={0.85}
              >
                <Text style={styles.nextQuestionBtnText}>
                  {currentIdx + 1 < questions.length ? 'Siguiente Pregunta' : 'Ver Resultados'}
                </Text>
                <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Pantallas de Configuración (Setup)
  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Selector de modo principal: 3 pestañas */}
        <View style={[styles.modeTabBar, !isDark && styles.modeTabBarLight]}>
          <TouchableOpacity
            style={[styles.modeTab, testType === 'vocabulary' && styles.modeTabActive]}
            onPress={() => {
              setTestType('vocabulary');
              setSelectedPartOfSpeech('TODOS');
            }}
          >
            <BookOpen
              size={16}
              color={testType === 'vocabulary' ? '#ffffff' : !isDark ? '#64748b' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                testType === 'vocabulary' && styles.modeTabTextActive,
                !isDark && testType !== 'vocabulary' && styles.modeTabTextLight,
              ]}
            >
              Test Vocabulario
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, testType === 'part_of_speech' && styles.modeTabActive]}
            onPress={() => setTestType('part_of_speech')}
          >
            <Tag
              size={16}
              color={testType === 'part_of_speech' ? '#ffffff' : !isDark ? '#64748b' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                testType === 'part_of_speech' && styles.modeTabTextActive,
                !isDark && testType !== 'part_of_speech' && styles.modeTabTextLight,
              ]}
            >
              Test por Tipo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, (testType as string) === 'irregular_verbs' && styles.modeTabActive]}
            onPress={() => setTestType('irregular_verbs')}
          >
            <Zap
              size={16}
              color={(testType as string) === 'irregular_verbs' ? '#ffffff' : !isDark ? '#64748b' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                (testType as string) === 'irregular_verbs' && styles.modeTabTextActive,
                !isDark && (testType as string) !== 'irregular_verbs' && styles.modeTabTextLight,
              ]}
            >
              Verbos Irregulares
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENIDO SEGÚN PESTAÑA: TEST POR TIPO */}
        {testType === 'part_of_speech' ? (
          <View style={[styles.card, !isDark && styles.cardLight]}>
            <View style={styles.introHeader}>
              <View style={[styles.introIconCircle, { backgroundColor: 'rgba(230, 46, 76, 0.15)' }]}>
                <Tag size={28} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={[styles.introTitle, !isDark && styles.introTitleLight]}>
                Evaluación por Tipo Gramatical
              </Text>
              <Text style={[styles.introSubtitle, !isDark && styles.introSubtitleLight]}>
                Practica por categoría morfológica (verbos, adjetivos, etc.) o entrena tu habilidad para clasificarlas.
              </Text>
            </View>

            {/* Selector de Modalidad dentro de Test por Tipo */}
            <Text style={[styles.filterTitle, !isDark && styles.filterTitleLight]}>
              Modalidad de Evaluación:
            </Text>
            <View style={styles.posModeGrid}>
              <TouchableOpacity
                style={[
                  styles.posModeCard,
                  !isDark && styles.posModeCardLight,
                  posQuizMode === 'identify_type' && styles.posModeCardActive,
                ]}
                onPress={() => setPosQuizMode('identify_type')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Sparkles
                    size={16}
                    color={posQuizMode === 'identify_type' ? '#ffffff' : THEME.colors.crimsonLight}
                  />
                  <Text
                    style={[
                      styles.posModeTitle,
                      !isDark && styles.posModeTitleLight,
                      posQuizMode === 'identify_type' && styles.posModeTitleActive,
                    ]}
                  >
                    Identificar Categoría
                  </Text>
                </View>
                <Text
                  style={[
                    styles.posModeDesc,
                    !isDark && styles.posModeDescLight,
                    posQuizMode === 'identify_type' && styles.posModeDescActive,
                  ]}
                >
                  Se te muestra la palabra y adivinas si es Sustantivo, Verbo, Adjetivo, etc.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.posModeCard,
                  !isDark && styles.posModeCardLight,
                  posQuizMode === 'translation' && styles.posModeCardActive,
                ]}
                onPress={() => setPosQuizMode('translation')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Layers
                    size={16}
                    color={posQuizMode === 'translation' ? '#ffffff' : THEME.colors.crimsonLight}
                  />
                  <Text
                    style={[
                      styles.posModeTitle,
                      !isDark && styles.posModeTitleLight,
                      posQuizMode === 'translation' && styles.posModeTitleActive,
                    ]}
                  >
                    Traducción del Tipo
                  </Text>
                </View>
                <Text
                  style={[
                    styles.posModeDesc,
                    !isDark && styles.posModeDescLight,
                    posQuizMode === 'translation' && styles.posModeDescActive,
                  ]}
                >
                  Evalúa la traducción de palabras pertenecientes al tipo seleccionado.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de Categoría Gramatical */}
            <Text style={[styles.filterTitle, !isDark && styles.filterTitleLight, { marginTop: 6 }]}>
              Selecciona el Tipo de Palabra:
            </Text>
            <View style={styles.posChipsWrapper}>
              <TouchableOpacity
                style={[
                  styles.posFilterChip,
                  !isDark && styles.posFilterChipLight,
                  selectedPartOfSpeech === 'TODOS' && styles.posFilterChipActive,
                ]}
                onPress={() => setSelectedPartOfSpeech('TODOS')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.posFilterChipText,
                    !isDark && styles.posFilterChipTextLight,
                    selectedPartOfSpeech === 'TODOS' && styles.posFilterChipTextActive,
                  ]}
                >
                  TODOS ({words.length})
                </Text>
              </TouchableOpacity>

              {PART_OF_SPEECH_OPTIONS.map((pos) => {
                const count = posCounts[pos] || 0;
                const isSelected = selectedPartOfSpeech === pos;
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.posFilterChip,
                      !isDark && styles.posFilterChipLight,
                      isSelected && styles.posFilterChipActive,
                    ]}
                    onPress={() => setSelectedPartOfSpeech(pos)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.posFilterChipText,
                        !isDark && styles.posFilterChipTextLight,
                        isSelected && styles.posFilterChipTextActive,
                      ]}
                    >
                      {pos} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selector de Nivel */}
            <Text style={[styles.filterTitle, !isDark && styles.filterTitleLight, { marginTop: 14 }]}>
              Filtrar por Nivel (Opcional):
            </Text>
            <View style={styles.levelSelector}>
              {['TODOS', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.levelChip,
                    !isDark && styles.levelChipLight,
                    selectedLevel === lvl && styles.levelChipActive,
                  ]}
                  onPress={() => setSelectedLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      !isDark && styles.levelChipTextLight,
                      selectedLevel === lvl && styles.levelChipTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Resumen */}
            <View style={[styles.statsSummaryBox, !isDark && styles.statsSummaryBoxLight]}>
              <Text style={[styles.statsSummaryText, !isDark && styles.statsSummaryTextLight]}>
                Palabras disponibles para este test:{' '}
                <Text style={{ color: !isDark ? '#0f172a' : '#ffffff', fontWeight: '800' }}>
                  {availableWords.length}
                </Text>
                {selectedPartOfSpeech !== 'TODOS' && ` • Tipo: ${selectedPartOfSpeech}`}
                {selectedLevel !== 'TODOS' && ` • Nivel: ${selectedLevel}`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={startQuiz}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Iniciar Test por Tipo</Text>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ) : (
          /* CONTENIDO PESTAÑA: TEST VOCABULARIO GENERAL CON FILTRO DE TIPO */
          <View style={[styles.card, !isDark && styles.cardLight]}>
            <View style={styles.introHeader}>
              <View style={styles.introIconCircle}>
                <Trophy size={28} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={[styles.introTitle, !isDark && styles.introTitleLight]}>
                Evaluación de Vocabulario
              </Text>
              <Text style={[styles.introSubtitle, !isDark && styles.introSubtitleLight]}>
                Preguntas tipo test de opción múltiple para medir tu retención y reconocimiento léxico.
              </Text>
            </View>

            {/* Selector de Nivel */}
            <Text style={[styles.filterTitle, !isDark && styles.filterTitleLight]}>
              Selecciona el Nivel:
            </Text>
            <View style={styles.levelSelector}>
              {['TODOS', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.levelChip,
                    !isDark && styles.levelChipLight,
                    selectedLevel === lvl && styles.levelChipActive,
                  ]}
                  onPress={() => setSelectedLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      !isDark && styles.levelChipTextLight,
                      selectedLevel === lvl && styles.levelChipTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Filtro opcional por Tipo de Palabra dentro de vocabulario */}
            <Text style={[styles.filterTitle, !isDark && styles.filterTitleLight, { marginTop: 4 }]}>
              Filtrar por Tipo de Palabra (Opcional):
            </Text>
            <View style={styles.posChipsWrapper}>
              <TouchableOpacity
                style={[
                  styles.posFilterChip,
                  !isDark && styles.posFilterChipLight,
                  selectedPartOfSpeech === 'TODOS' && styles.posFilterChipActive,
                ]}
                onPress={() => setSelectedPartOfSpeech('TODOS')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.posFilterChipText,
                    !isDark && styles.posFilterChipTextLight,
                    selectedPartOfSpeech === 'TODOS' && styles.posFilterChipTextActive,
                  ]}
                >
                  TODOS
                </Text>
              </TouchableOpacity>

              {PART_OF_SPEECH_OPTIONS.map((pos) => {
                const count = posCounts[pos] || 0;
                const isSelected = selectedPartOfSpeech === pos;
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.posFilterChip,
                      !isDark && styles.posFilterChipLight,
                      isSelected && styles.posFilterChipActive,
                    ]}
                    onPress={() => setSelectedPartOfSpeech(pos)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.posFilterChipText,
                        !isDark && styles.posFilterChipTextLight,
                        isSelected && styles.posFilterChipTextActive,
                      ]}
                    >
                      {pos} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.statsSummaryBox, !isDark && styles.statsSummaryBoxLight, { marginTop: 14 }]}>
              <Text style={[styles.statsSummaryText, !isDark && styles.statsSummaryTextLight]}>
                Palabras disponibles con los filtros actuales:{' '}
                <Text style={{ color: !isDark ? '#0f172a' : '#ffffff', fontWeight: '700' }}>
                  {availableWords.length}
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={startQuiz}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Iniciar Evaluación</Text>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ConfirmModal
        isOpen={insufficientWordsModal}
        title="Sin Palabras Suficientes"
        message={modalMessage}
        confirmText="Entendido"
        cancelText={null}
        variant="warning"
        onConfirm={() => setInsufficientWordsModal(false)}
        onCancel={() => setInsufficientWordsModal(false)}
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingBottom: 24,
  },
  centerContainer: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.lg,
    padding: 4,
    marginBottom: 16,
    width: '100%',
    alignSelf: 'center',
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: THEME.radius.md,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: THEME.colors.crimson,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  modeTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  introHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  introIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 420,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  levelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  levelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  levelChipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  levelChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  levelChipTextActive: {
    color: '#ffffff',
  },

  // Part of speech mode cards
  posModeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  posModeCard: {
    flex: 1,
    minWidth: 220,
    padding: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  posModeCardActive: {
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    borderColor: THEME.colors.crimson,
  },
  posModeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  posModeTitleActive: {
    color: THEME.colors.crimsonLight,
  },
  posModeDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
  posModeDescActive: {
    color: '#f8fafc',
  },

  // Part of speech chips wrapper
  posChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  posFilterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  posFilterChipActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  posFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  posFilterChipTextActive: {
    color: '#ffffff',
  },

  statsSummaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 18,
  },
  statsSummaryText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    width: '100%',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    width: '100%',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quizStep: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  quizBadgePill: {
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.3)',
  },
  quizBadgePillText: {
    color: THEME.colors.crimsonLight,
    fontSize: 11,
    fontWeight: '700',
  },
  cancelLink: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.crimson,
    borderRadius: 2,
  },
  questionPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  wordAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  quizWord: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  speakerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneticPrompt: {
    fontSize: 12,
    color: THEME.colors.crimsonLight,
    fontWeight: '600',
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.emerald,
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#f87171',
  },
  optionText: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: THEME.colors.emerald,
    fontWeight: '700',
  },
  nextQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
  },
  nextQuestionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultsBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 38,
    fontWeight: '900',
    color: THEME.colors.emerald,
    textAlign: 'center',
    marginVertical: 8,
  },
  resultSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Light mode styles
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    elevation: 2,
  },
  modeTabBarLight: {
    backgroundColor: '#e2e8f0',
  },
  modeTabTextLight: {
    color: '#475569',
  },
  introTitleLight: {
    color: '#0f172a',
  },
  introSubtitleLight: {
    color: '#475569',
  },
  filterTitleLight: {
    color: '#475569',
  },
  levelChipLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  levelChipTextLight: {
    color: '#475569',
  },
  posModeCardLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  posModeTitleLight: {
    color: '#0f172a',
  },
  posModeDescLight: {
    color: '#64748b',
  },
  posFilterChipLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  posFilterChipTextLight: {
    color: '#475569',
  },
  statsSummaryBoxLight: {
    backgroundColor: '#f1f5f9',
  },
  statsSummaryTextLight: {
    color: '#475569',
  },
  secondaryBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  secondaryBtnTextLight: {
    color: '#334155',
  },
  quizStepLight: {
    color: '#0f172a',
  },
  quizBadgePillLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  quizBadgePillTextLight: {
    color: '#e11d48',
  },
  cancelLinkLight: {
    color: '#64748b',
  },
  progressBarTrackLight: {
    backgroundColor: '#e2e8f0',
  },
  questionPromptLight: {
    color: '#475569',
  },
  quizWordLight: {
    color: '#0f172a',
  },
  optionBtnLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  optionTextLight: {
    color: '#1e293b',
  },
  resultTitleLight: {
    color: '#0f172a',
  },
  resultSubLight: {
    color: '#475569',
  },
});
