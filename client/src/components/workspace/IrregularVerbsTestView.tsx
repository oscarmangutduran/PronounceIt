import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  Trophy,
  Award,
  Zap,
} from 'lucide-react-native';
import { IRREGULAR_VERBS, IrregularVerb } from '../../data/irregularVerbs';
import { vocabService } from '../../lib/vocabularyStore';
import { testHistoryService } from '../../lib/testHistoryStore';
import { THEME } from '../../theme';
import { ConfirmModal } from '../common/ConfirmModal';

export interface VerbQuestionEvaluation {
  verb: IrregularVerb;
  userPastSimple: string;
  userPastParticiple: string;
  isPastSimpleCorrect: boolean;
  isPastParticipleCorrect: boolean;
  isPastSimpleTypo: boolean;
  isPastParticipleTypo: boolean;
  score: number;
}

export interface VerbTestResult {
  level: string;
  totalQuestions: number;
  scoreOutOfTen: number;
  percentage: number;
  gradeLabel: string;
  fullyCorrectCount: number;
  pastSimpleCorrectCount: number;
  pastParticipleCorrectCount: number;
  questions: VerbQuestionEvaluation[];
  completedAt: string;
}

interface IrregularVerbsTestViewProps {
  onBackToVocabulary: () => void;
  onStateChange?: (state: 'setup' | 'testing' | 'result') => void;
  onOpenResultsModal?: () => void;
}

export const IrregularVerbsTestView: React.FC<IrregularVerbsTestViewProps> = ({
  onBackToVocabulary,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('TODOS');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [testActive, setTestActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [activeVerbs, setActiveVerbs] = useState<IrregularVerb[]>([]);
  const [inputPastSimple, setInputPastSimple] = useState('');
  const [inputPastParticiple, setInputPastParticiple] = useState('');
  const [evaluations, setEvaluations] = useState<VerbQuestionEvaluation[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [noVerbsModal, setNoVerbsModal] = useState(false);

  const availableVerbs = useMemo(() => {
    if (selectedLevel === 'TODOS') return IRREGULAR_VERBS;
    return IRREGULAR_VERBS.filter((v) => v.level === selectedLevel);
  }, [selectedLevel]);

  const startTest = () => {
    const pool = [...availableVerbs].sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, Math.min(questionCount, pool.length));
    if (selected.length === 0) {
      setNoVerbsModal(true);
      return;
    }
    setActiveVerbs(selected);
    setCurrentIndex(0);
    setInputPastSimple('');
    setInputPastParticiple('');
    setEvaluations([]);
    setShowAnswer(false);
    setTestCompleted(false);
    setTestActive(true);
  };

  const currentVerb = activeVerbs[currentIndex];

  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

  const checkAnswer = () => {
    if (!currentVerb) return;
    const pastSimpleCorrect = currentVerb.pastSimple
      .split('/')
      .some((opt) => normalize(opt) === normalize(inputPastSimple));
    const pastParticipleCorrect = currentVerb.pastParticiple
      .split('/')
      .some((opt) => normalize(opt) === normalize(inputPastParticiple));

    const bothCorrect = pastSimpleCorrect && pastParticipleCorrect;
    const score = bothCorrect ? 10 : pastSimpleCorrect || pastParticipleCorrect ? 5 : 0;

    const evaluation: VerbQuestionEvaluation = {
      verb: currentVerb,
      userPastSimple: inputPastSimple.trim(),
      userPastParticiple: inputPastParticiple.trim(),
      isPastSimpleCorrect: pastSimpleCorrect,
      isPastParticipleCorrect: pastParticipleCorrect,
      isPastSimpleTypo: false,
      isPastParticipleTypo: false,
      score,
    };

    setEvaluations((prev) => [...prev, evaluation]);
    setShowAnswer(true);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < activeVerbs.length) {
      setCurrentIndex((prev) => prev + 1);
      setInputPastSimple('');
      setInputPastParticiple('');
      setShowAnswer(false);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    setTestCompleted(true);
    setTestActive(false);

    const total = activeVerbs.length;
    const fullyCorrect = evaluations.filter(
      (e) => e.isPastSimpleCorrect && e.isPastParticipleCorrect
    ).length;
    const score10 = Number(((fullyCorrect / total) * 10).toFixed(1));
    const percentage = Math.round((fullyCorrect / total) * 100);

    let gradeLabel = 'Insuficiente';
    if (percentage >= 90) gradeLabel = 'Excelente / Sobresaliente';
    else if (percentage >= 70) gradeLabel = 'Notable';
    else if (percentage >= 50) gradeLabel = 'Aprobado';

    testHistoryService.addTest({
      type: 'irregular_verbs',
      title: `Verbos Irregulares (${selectedLevel})`,
      level: selectedLevel,
      scoreOutOfTen: score10,
      percentage,
      gradeLabel,
      totalQuestions: total,
      correctCount: fullyCorrect,
      completedAt: new Date().toISOString(),
      irregularVerbQuestions: evaluations,
    });
  };

  // 1. SETUP SCREEN
  if (!testActive && !testCompleted) {
    return (
      <View style={styles.scrollContainer}>
        <View style={styles.contentWrapper}>
          <View style={styles.setupCard}>
            <View style={styles.setupHeader}>
              <View style={styles.setupIconBadge}>
                <Zap size={24} color={THEME.colors.crimsonLight} />
              </View>
              <Text style={styles.setupTitle}>Test de Verbos Irregulares</Text>
              <Text style={styles.setupSubtitle}>
                Pon a prueba tu dominio de las 3 formas: Infinitivo, Pasado Simple y Participio.
              </Text>
            </View>

            {/* Level selector */}
            <Text style={styles.sectionLabel}>Selecciona el Nivel:</Text>
            <View style={styles.levelRow}>
              {['TODOS', 'A1', 'A2', 'B1', 'B2'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.levelBtn, selectedLevel === lvl && styles.levelBtnActive]}
                  onPress={() => setSelectedLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.levelBtnText,
                      selectedLevel === lvl && styles.levelBtnTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Questions count */}
            <Text style={styles.sectionLabel}>Número de preguntas:</Text>
            <View style={styles.countRow}>
              {[5, 10, 15, 20].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.countBtn, questionCount === num && styles.countBtnActive]}
                  onPress={() => setQuestionCount(num)}
                >
                  <Text
                    style={[
                      styles.countBtnText,
                      questionCount === num && styles.countBtnTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startTest} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Comenzar Evaluación</Text>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>

        <ConfirmModal
          isOpen={noVerbsModal}
          title="Sin Verbos Disponibles"
          message={`No hay suficientes verbos irregulares registrados para el nivel seleccionado (${selectedLevel}).`}
          confirmText="Entendido"
          cancelText={null}
          variant="warning"
          onConfirm={() => setNoVerbsModal(false)}
          onCancel={() => setNoVerbsModal(false)}
        />
      </View>
    );
  }

  // 2. RESULTS SCREEN
  if (testCompleted) {
    const total = activeVerbs.length;
    const fullyCorrect = evaluations.filter(
      (e) => e.isPastSimpleCorrect && e.isPastParticipleCorrect
    ).length;
    const score10 = Number(((fullyCorrect / total) * 10).toFixed(1));

    return (
      <View style={styles.scrollContainer}>
        <View style={styles.contentWrapper}>
          <View style={styles.setupCard}>
            <View style={styles.resultsBadge}>
              <Trophy size={40} color={THEME.colors.amber} />
            </View>
            <Text style={styles.setupTitle}>¡Test Completado!</Text>
            <Text style={styles.scoreBig}>{score10} / 10</Text>
            <Text style={styles.scoreSub}>
              Acertaste {fullyCorrect} de {total} verbos irregulares.
            </Text>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                setTestCompleted(false);
                setTestActive(false);
              }}
            >
              <RotateCcw size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.startBtnText}>Hacer otro test</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 3. TESTING SCREEN
  return (
    <View style={styles.scrollContainer}>
      <View style={styles.contentWrapper}>
        {/* Header bar */}
        <View style={styles.testHeader}>
          <Text style={styles.testProgress}>
            Pregunta {currentIndex + 1} de {activeVerbs.length}
          </Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setTestActive(false);
              setTestCompleted(false);
            }}
          >
            <Text style={styles.cancelBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Verb Question Card */}
        <View style={styles.questionCard}>
        <View style={styles.verbPromptRow}>
          <View>
            <Text style={styles.infinitiveText}>{currentVerb?.infinitive}</Text>
            <Text style={styles.translationText}>{currentVerb?.translation}</Text>
          </View>

          <TouchableOpacity
            style={styles.speakerBtn}
            onPress={() => vocabService.speak(currentVerb?.infinitive || '')}
          >
            <Volume2 size={20} color={THEME.colors.crimsonLight} />
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.inputSection}>
          <Text style={styles.inputFieldLabel}>Pasado Simple (Past Simple):</Text>
          <TextInput
            style={[
              styles.input,
              showAnswer &&
                (evaluations[currentIndex]?.isPastSimpleCorrect
                  ? styles.inputCorrect
                  : styles.inputWrong),
            ]}
            placeholder="Ej: went / saw / did"
            placeholderTextColor={THEME.colors.textSubtle}
            value={inputPastSimple}
            onChangeText={setInputPastSimple}
            editable={!showAnswer}
            autoCapitalize="none"
          />

          <Text style={styles.inputFieldLabel}>Participio (Past Participle):</Text>
          <TextInput
            style={[
              styles.input,
              showAnswer &&
                (evaluations[currentIndex]?.isPastParticipleCorrect
                  ? styles.inputCorrect
                  : styles.inputWrong),
            ]}
            placeholder="Ej: gone / seen / done"
            placeholderTextColor={THEME.colors.textSubtle}
            value={inputPastParticiple}
            onChangeText={setInputPastParticiple}
            editable={!showAnswer}
            autoCapitalize="none"
          />
        </View>

        {/* Show feedback if answered */}
        {showAnswer && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Respuestas correctas:</Text>
            <Text style={styles.feedbackContent}>
              Past Simple: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{currentVerb.pastSimple}</Text>
            </Text>
            <Text style={styles.feedbackContent}>
              Past Participle: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{currentVerb.pastParticiple}</Text>
            </Text>
          </View>
        )}

        {/* Actions */}
        {!showAnswer ? (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={checkAnswer}
            disabled={!inputPastSimple.trim() || !inputPastParticiple.trim()}
          >
            <Text style={styles.submitBtnText}>Verificar Respuesta</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 < activeVerbs.length ? 'Siguiente Pregunta' : 'Finalizar Test'}
            </Text>
            <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  setupCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  setupIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 10,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  levelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  levelBtnActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  levelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  levelBtnTextActive: {
    color: '#ffffff',
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    width: '100%',
  },
  countBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  countBtnActive: {
    backgroundColor: THEME.colors.crimson,
    borderColor: THEME.colors.crimson,
  },
  countBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  countBtnTextActive: {
    color: '#ffffff',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    width: '100%',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  testProgress: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    padding: 6,
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  questionCard: {
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
  verbPromptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infinitiveText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  translationText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    gap: 8,
    marginBottom: 20,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 46,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 10,
  },
  inputCorrect: {
    borderColor: THEME.colors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  inputWrong: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  feedbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.crimsonLight,
    gap: 4,
  },
  feedbackTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.crimsonLight,
    marginBottom: 4,
  },
  feedbackContent: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  submitBtn: {
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.emerald,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
  },
  nextBtnText: {
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
    marginBottom: 16,
  },
  scoreBig: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.colors.emerald,
    marginVertical: 10,
  },
  scoreSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginBottom: 24,
  },
});
