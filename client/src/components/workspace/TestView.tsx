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
} from 'lucide-react-native';
import { WordItem } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { testHistoryService } from '../../lib/testHistoryStore';
import { IrregularVerbsTestView } from './IrregularVerbsTestView';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

interface TestViewProps {
  words: WordItem[];
  onBackToVocabulary: () => void;
}

interface QuizQuestion {
  targetWord: WordItem;
  options: string[];
  correctAnswer: string;
}

export const TestView: React.FC<TestViewProps> = ({ words, onBackToVocabulary }) => {
  const [testType, setTestType] = useState<'vocabulary' | 'irregular_verbs'>('vocabulary');
  const [selectedLevel, setSelectedLevel] = useState<string>('TODOS');
  const [isTestActive, setIsTestActive] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [insufficientWordsModal, setInsufficientWordsModal] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const availableWords = useMemo(() => {
    if (selectedLevel === 'TODOS') return words;
    return words.filter((w) => w.level === selectedLevel);
  }, [words, selectedLevel]);

  const startVocabTest = () => {
    if (availableWords.length < 4) {
      setInsufficientWordsModal(true);
      return;
    }

    const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    // Generate 4 multiple choice options for each
    const generated: QuizQuestion[] = selected.map((word) => {
      const distractors = words
        .filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.translation);

      const options = [word.translation, ...distractors].sort(() => Math.random() - 0.5);

      return {
        targetWord: word,
        options,
        correctAnswer: word.translation,
      };
    });

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
      finishVocabTest();
    }
  };

  const finishVocabTest = () => {
    setIsTestFinished(true);
    setIsTestActive(false);

    const total = questions.length;
    const finalScore = score + (selectedAnswer === questions[currentIdx]?.correctAnswer ? 1 : 0);
    const score10 = Number(((finalScore / total) * 10).toFixed(1));
    const percentage = Math.round((finalScore / total) * 100);

    let grade = 'Insuficiente';
    if (percentage >= 90) grade = 'Excelente';
    else if (percentage >= 70) grade = 'Notable';
    else if (percentage >= 50) grade = 'Aprobado';

    testHistoryService.addTest({
      type: 'vocabulary',
      title: `Vocabulario (${selectedLevel})`,
      level: selectedLevel,
      scoreOutOfTen: score10,
      percentage,
      gradeLabel: grade,
      totalQuestions: total,
      correctCount: finalScore,
      completedAt: new Date().toISOString(),
    });
  };

  if (testType === 'irregular_verbs') {
    return (
      <View style={styles.container}>
        <View style={styles.modeTabBar}>
          <TouchableOpacity
            style={styles.modeTab}
            onPress={() => setTestType('vocabulary')}
          >
            <BookOpen size={16} color={THEME.colors.textMuted} />
            <Text style={styles.modeTabText}>Test Vocabulario</Text>
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

        <IrregularVerbsTestView onBackToVocabulary={onBackToVocabulary} />
      </View>
    );
  }

  // Vocabulary Results
  if (isTestFinished) {
    const total = questions.length;
    const score10 = Number(((score / total) * 10).toFixed(1));

    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.card}>
          <View style={styles.resultsBadge}>
            <Trophy size={42} color={THEME.colors.amber} />
          </View>
          <Text style={styles.resultTitle}>¡Test de Vocabulario Finalizado!</Text>
          <Text style={styles.resultScore}>{score10} / 10</Text>
          <Text style={styles.resultSub}>
            Has respondido correctamente {score} de {total} preguntas.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={startVocabTest}>
            <RotateCcw size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Repetir Evaluación</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setIsTestFinished(false);
              setIsTestActive(false);
            }}
          >
            <Text style={styles.secondaryBtnText}>Cambiar Nivel o Modo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Active Quiz
  if (isTestActive && questions.length > 0) {
    const q = questions[currentIdx];

    return (
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Progress */}
        <View style={styles.quizHeader}>
          <Text style={styles.quizStep}>
            Pregunta {currentIdx + 1} de {questions.length}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setIsTestActive(false);
              setIsTestFinished(false);
            }}
          >
            <Text style={styles.cancelLink}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Progress track */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIdx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        {/* Question Prompt Card */}
        <View style={styles.card}>
          <Text style={styles.questionPrompt}>¿Cuál es la traducción correcta?</Text>

          <View style={styles.wordAudioRow}>
            <Text style={styles.quizWord}>{q.targetWord.word}</Text>
            <TouchableOpacity
              style={styles.speakerBtn}
              onPress={() => vocabService.speak(q.targetWord.word)}
            >
              <Volume2 size={20} color={THEME.colors.crimsonLight} />
            </TouchableOpacity>
          </View>

          {q.targetWord.phoneticGuide ? (
            <Text style={styles.phoneticPrompt}>
              Pronunciación: {q.targetWord.phoneticGuide}
            </Text>
          ) : null}

          {/* 4 Options */}
          <View style={styles.optionsList}>
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === q.correctAnswer;

              let btnStyle = styles.optionBtn;
              if (selectedAnswer !== null) {
                if (isCorrect) btnStyle = [styles.optionBtn, styles.optionCorrect];
                else if (isSelected) btnStyle = [styles.optionBtn, styles.optionWrong];
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

          {/* Next Button */}
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
      </ScrollView>
    );
  }

  // Setup / Entry Screen
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Mode switcher tabs */}
      <View style={styles.modeTabBar}>
        <TouchableOpacity
          style={[styles.modeTab, styles.modeTabActive]}
          onPress={() => setTestType('vocabulary')}
        >
          <BookOpen size={16} color="#ffffff" />
          <Text style={[styles.modeTabText, styles.modeTabTextActive]}>Test Vocabulario</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modeTab}
          onPress={() => setTestType('irregular_verbs')}
        >
          <Zap size={16} color={THEME.colors.textMuted} />
          <Text style={styles.modeTabText}>Verbos Irregulares</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.introHeader}>
          <View style={styles.introIconCircle}>
            <Trophy size={28} color={THEME.colors.crimsonLight} />
          </View>
          <Text style={styles.introTitle}>Evaluación de Vocabulario</Text>
          <Text style={styles.introSubtitle}>
            Preguntas tipo test de opción múltiple para medir tu retención y reconocimiento léxico.
          </Text>
        </View>

        <Text style={styles.filterTitle}>Selecciona el Nivel:</Text>
        <View style={styles.levelSelector}>
          {['TODOS', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.levelChip,
                selectedLevel === lvl && styles.levelChipActive,
              ]}
              onPress={() => setSelectedLevel(lvl)}
            >
              <Text
                style={[
                  styles.levelChipText,
                  selectedLevel === lvl && styles.levelChipTextActive,
                ]}
              >
                {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsSummaryBox}>
          <Text style={styles.statsSummaryText}>
            Palabras disponibles para este nivel:{' '}
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {availableWords.length}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={startVocabTest}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Iniciar Evaluación</Text>
          <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      <ConfirmModal
        isOpen={insufficientWordsModal}
        title="Insuficientes Palabras"
        message={`Necesitas al menos 4 palabras registradas en el nivel seleccionado (${selectedLevel}) para generar un test con opciones múltiples.`}
        confirmText="Entendido"
        cancelText={null}
        variant="warning"
        onConfirm={() => setInsufficientWordsModal(false)}
        onCancel={() => setInsufficientWordsModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: THEME.colors.bgDark,
  },
  centerContainer: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.lg,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: THEME.colors.crimson,
  },
  modeTabText: {
    fontSize: 13,
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
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
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
  },
  introSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
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
    marginBottom: 18,
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
  statsSummaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 20,
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
    fontSize: 13,
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
});
