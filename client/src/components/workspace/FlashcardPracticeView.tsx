import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Volume2,
  RotateCcw,
  ArrowLeft,
  CheckCircle,
  ThumbsUp,
  AlertTriangle,
  Sparkles,
  Layers,
} from 'lucide-react-native';
import { WordItem, WordStatus } from '../../types';
import { vocabService } from '../../lib/vocabularyStore';
import { THEME } from '../../theme';

interface FlashcardPracticeViewProps {
  words: WordItem[];
  onBackToVocabulary: () => void;
  onUpdateStatus: (id: string, status: WordStatus) => void;
}

export const FlashcardPracticeView: React.FC<FlashcardPracticeViewProps> = ({
  words,
  onBackToVocabulary,
  onUpdateStatus,
}) => {
  const [deck, setDeck] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Shuffle words for practice session
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [words]);

  const currentWord = deck[currentIndex];

  const handleNext = (statusUpdate?: WordStatus) => {
    if (currentWord && statusUpdate) {
      onUpdateStatus(currentWord.id, statusUpdate);
    }
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    const reshuffled = [...words].sort(() => Math.random() - 0.5);
    setDeck(reshuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (!deck.length) {
    return (
      <View style={styles.centerContainer}>
        <Layers size={40} color={THEME.colors.crimsonLight} />
        <Text style={styles.emptyTitle}>Sin palabras para practicar</Text>
        <Text style={styles.emptySubtitle}>Agrega palabras en tu lista de vocabulario para iniciar.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToVocabulary}>
          <Text style={styles.backBtnText}>Volver al Vocabulario</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Session completed
  if (currentIndex >= deck.length) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.completeBadge}>
          <CheckCircle size={44} color={THEME.colors.emerald} />
        </View>
        <Text style={styles.completeTitle}>¡Sesión Completada!</Text>
        <Text style={styles.completeSubtitle}>
          Has repasado {deck.length} flashcards con éxito. Sigue así para consolidar tu memoria a largo plazo.
        </Text>

        <View style={styles.buttonStack}>
          <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
            <RotateCcw size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.restartBtnText}>Repasar de nuevo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={onBackToVocabulary}>
            <Text style={styles.backBtnText}>Volver al Vocabulario</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconBtn} onPress={onBackToVocabulary}>
          <ArrowLeft size={18} color={THEME.colors.textMuted} />
          <Text style={styles.headerBackText}>Salir</Text>
        </TouchableOpacity>

        <Text style={styles.progressText}>
          {currentIndex + 1} / {deck.length}
        </Text>

        <TouchableOpacity style={styles.shuffleBtn} onPress={handleRestart}>
          <RotateCcw size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentIndex + 1) / deck.length) * 100}%` },
          ]}
        />
      </View>

      {/* Interactive Flashcard */}
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => setIsFlipped(!isFlipped)}
        activeOpacity={0.9}
      >
        <View style={styles.card}>
          {/* Card Top Pill */}
          <View style={styles.cardTopBar}>
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeText}>
                {isFlipped ? 'REVERSO (TRADUCCIÓN)' : 'FRENTE (PRONUNCIACIÓN)'}
              </Text>
            </View>

            {currentWord.level ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{currentWord.level}</Text>
              </View>
            ) : null}
          </View>

          {/* Front content */}
          {!isFlipped ? (
            <View style={styles.cardBody}>
              <Text style={styles.mainWord}>{currentWord.word}</Text>

              <TouchableOpacity
                style={styles.audioAction}
                onPress={(e) => {
                  vocabService.speak(currentWord.word);
                }}
              >
                <Volume2 size={22} color="#ffffff" />
                <Text style={styles.audioActionText}>Escuchar Audio</Text>
              </TouchableOpacity>

              {currentWord.phoneticGuide ? (
                <View style={styles.guideBox}>
                  <Text style={styles.guideLabel}>Cómo suena en español:</Text>
                  <Text style={styles.guideText}>
                    {currentWord.phoneticGuide.startsWith('"')
                      ? currentWord.phoneticGuide
                      : `"${currentWord.phoneticGuide}"`}
                  </Text>
                </View>
              ) : null}

              {currentWord.ipa ? (
                <Text style={styles.ipaSub}>{currentWord.ipa}</Text>
              ) : null}

              <Text style={styles.tapTip}>Toca la tarjeta para ver la traducción</Text>
            </View>
          ) : (
            // Back content
            <View style={styles.cardBody}>
              <Text style={styles.translationWord}>{currentWord.translation}</Text>

              {currentWord.definition ? (
                <Text style={styles.definitionText}>{currentWord.definition}</Text>
              ) : null}

              {currentWord.exampleEn ? (
                <View style={styles.exampleCard}>
                  <Text style={styles.exampleEn}>{currentWord.exampleEn}</Text>
                  {currentWord.exampleEs ? (
                    <Text style={styles.exampleEs}>{currentWord.exampleEs}</Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.tapTip}>Toca para volver al frente</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* SRS Rating Actions */}
      <View style={styles.srsActions}>
        <TouchableOpacity
          style={[styles.srsBtn, styles.srsBtnHard]}
          onPress={() => handleNext('en_repaso')}
          activeOpacity={0.8}
        >
          <AlertTriangle size={16} color="#f87171" />
          <Text style={[styles.srsBtnText, { color: '#f87171' }]}>Difícil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.srsBtn, styles.srsBtnGood]}
          onPress={() => handleNext()}
          activeOpacity={0.8}
        >
          <ThumbsUp size={16} color={THEME.colors.amber} />
          <Text style={[styles.srsBtnText, { color: THEME.colors.amber }]}>Bien</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.srsBtn, styles.srsBtnEasy]}
          onPress={() => handleNext('dominada')}
          activeOpacity={0.8}
        >
          <CheckCircle size={16} color={THEME.colors.emerald} />
          <Text style={[styles.srsBtnText, { color: THEME.colors.emerald }]}>Fácil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  headerBackText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  shuffleBtn: {
    padding: 6,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.crimson,
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    maxHeight: 460,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.xl,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  sideBadgeText: {
    color: THEME.colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelBadgeText: {
    color: THEME.colors.crimsonLight,
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  mainWord: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  audioAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.full,
    gap: 8,
    shadowColor: THEME.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  audioActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  guideBox: {
    backgroundColor: 'rgba(230, 46, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  guideLabel: {
    color: THEME.colors.textSubtle,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  guideText: {
    color: '#ff8a9e',
    fontSize: 16,
    fontWeight: '700',
  },
  ipaSub: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  translationWord: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.emerald,
    textAlign: 'center',
  },
  definitionText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  exampleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.emerald,
    gap: 4,
  },
  exampleEn: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  exampleEs: {
    color: THEME.colors.textSubtle,
    fontSize: 12,
  },
  tapTip: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 10,
  },
  srsActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  srsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    gap: 6,
  },
  srsBtnHard: {
    borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  srsBtnGood: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  srsBtnEasy: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  srsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  completeBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.crimson,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
  },
  restartBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
  },
  backBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
});
