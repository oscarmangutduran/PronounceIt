import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react-native';
import { WordItem } from '../../types';
import { testHistoryService, StoredTestItem } from '../../lib/testHistoryStore';
import { THEME } from '../../theme';

interface StatsDashboardViewProps {
  words: WordItem[];
}

export const StatsDashboardView: React.FC<StatsDashboardViewProps> = ({ words }) => {
  const [history, setHistory] = useState<StoredTestItem[]>([]);

  useEffect(() => {
    setHistory(testHistoryService.getHistory());
    const unsub = testHistoryService.subscribe(() => {
      setHistory(testHistoryService.getHistory());
    });
    return () => unsub();
  }, []);

  const totalWords = words.length;
  const masteredCount = words.filter((w) => w.status === 'dominada').length;
  const reviewCount = words.filter((w) => w.status === 'en_repaso').length;
  const newCount = words.filter((w) => w.status === 'nueva').length;

  const masteredRate = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // Level counts
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const levelCounts = levels.map((lvl) => ({
    level: lvl,
    count: words.filter((w) => w.level === lvl).length,
  }));

  const maxLevelCount = Math.max(...levelCounts.map((l) => l.count), 1);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <BarChart3 size={24} color={THEME.colors.crimsonLight} />
        </View>
        <View>
          <Text style={styles.title}>Progreso & Estadísticas</Text>
          <Text style={styles.subtitle}>Métricas de retención y evaluaciones completadas</Text>
        </View>
      </View>

      {/* Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Palabras</Text>
          <Text style={styles.metricValue}>{totalWords}</Text>
          <View style={styles.metricIconBox}>
            <BookOpen size={16} color={THEME.colors.crimsonLight} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Dominadas</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.emerald }]}>
            {masteredCount}
          </Text>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <CheckCircle size={16} color={THEME.colors.emerald} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>En Repaso</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.amber }]}>
            {reviewCount}
          </Text>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Clock size={16} color={THEME.colors.amber} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>% Dominio</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.cyan }]}>
            {masteredRate}%
          </Text>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
            <Flame size={16} color={THEME.colors.cyan} />
          </View>
        </View>
      </View>

      {/* Distribution by CEFR Level */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Distribución por Nivel MCER</Text>
        <View style={styles.levelsList}>
          {levelCounts.map((item) => (
            <View key={item.level} style={styles.levelRow}>
              <View style={styles.levelNameBadge}>
                <Text style={styles.levelNameText}>{item.level}</Text>
              </View>

              <View style={styles.levelBarTrack}>
                <View
                  style={[
                    styles.levelBarFill,
                    { width: `${(item.count / maxLevelCount) * 100}%` },
                  ]}
                />
              </View>

              <Text style={styles.levelCountText}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Tests History */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Historial de Evaluaciones</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>Aún no has completado ningún test.</Text>
        ) : (
          <View style={styles.historyList}>
            {history.slice(0, 10).map((test) => (
              <View key={test.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyTitle}>{test.title}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(test.timestamp || Date.now()).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.historyScoreBox}>
                  <Text style={styles.historyScoreText}>{test.scoreOutOfTen}/10</Text>
                  <Text style={styles.historyGrade}>{test.gradeLabel}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: THEME.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 46, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: 16,
    position: 'relative',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  metricIconBox: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 46, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 14,
  },
  levelsList: {
    gap: 12,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelNameBadge: {
    width: 32,
    alignItems: 'center',
  },
  levelNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.crimsonLight,
  },
  levelBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.crimson,
    borderRadius: 4,
  },
  levelCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    width: 24,
    textAlign: 'right',
  },
  emptyHistory: {
    color: THEME.colors.textSubtle,
    fontSize: 13,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.radius.md,
    padding: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  historyDate: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 2,
  },
  historyScoreBox: {
    alignItems: 'flex-end',
  },
  historyScoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.emerald,
  },
  historyGrade: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
});
