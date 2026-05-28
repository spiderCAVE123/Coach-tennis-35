import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { VideoAnalysis } from '../../src/types';

export default function AnalysisScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const analysis: VideoAnalysis = params.analysis 
    ? JSON.parse(params.analysis as string)
    : null;
  const xpEarned = params.xpEarned ? parseInt(params.xpEarned as string) : 0;

  if (!analysis) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analysis data found</Text>
      </View>
    );
  }

  const scoreColor =
    analysis.technique_score >= 80
      ? COLORS.success
      : analysis.technique_score >= 60
      ? COLORS.warning
      : COLORS.error;

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analysis Complete!</Text>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={20} color={COLORS.accent} />
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
          </View>
        </View>

        {/* Technique Score */}
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Technique Score</Text>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {analysis.technique_score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.progressRing}>
            <View
              style={[
                styles.progressRingFill,
                {
                  width: `${analysis.technique_score}%`,
                  backgroundColor: scoreColor,
                },
              ]}
            />
          </View>
        </Card>

        {/* Balance Rating */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="fitness" size={24} color={COLORS.accentBlue} />
            <Text style={styles.balanceTitle}>Balance Rating</Text>
          </View>
          <View style={styles.balanceStars}>
            {[...Array(10)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < analysis.balance_rating ? 'star' : 'star-outline'}
                size={28}
                color={i < analysis.balance_rating ? COLORS.accent : COLORS.gray}
              />
            ))}
          </View>
          <Text style={styles.balanceValue}>
            {analysis.balance_rating}/10
          </Text>
        </Card>

        {/* Feedback Sections */}
        <Card style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <Ionicons name="walk" size={24} color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Footwork</Text>
          </View>
          <Text style={styles.feedbackText}>{analysis.footwork_feedback}</Text>
        </Card>

        <Card style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <Ionicons name="time" size={24} color={COLORS.accentBlue} />
            <Text style={styles.feedbackTitle}>Swing Timing</Text>
          </View>
          <Text style={styles.feedbackText}>{analysis.swing_timing}</Text>
        </Card>

        <Card style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <Ionicons name="hand-left" size={24} color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Contact Point</Text>
          </View>
          <Text style={styles.feedbackText}>{analysis.contact_point}</Text>
        </Card>

        {/* Suggested Fixes */}
        <Card style={styles.fixesCard}>
          <View style={styles.fixesHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.fixesTitle}>Suggested Improvements</Text>
          </View>
          {analysis.suggested_fixes.map((fix, index) => (
            <View key={index} style={styles.fixItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
              <Text style={styles.fixText}>{fix}</Text>
            </View>
          ))}
        </Card>

        {/* Pro Comparison */}
        <Card style={styles.proCard}>
          <View style={styles.proHeader}>
            <Ionicons name="trophy" size={24} color={COLORS.accentBlue} />
            <Text style={styles.proTitle}>Pro Comparison</Text>
          </View>
          <Text style={styles.proText}>{analysis.pro_comparison}</Text>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Upload Another"
            onPress={() => router.push('/home/upload')}
            variant="primary"
            size="large"
          />
          <Button
            title="Get Training Plan"
            onPress={() => router.push('/home/training')}
            variant="outline"
            size="large"
            style={{ marginTop: SPACING.md }}
          />
          <Button
            title="Back to Dashboard"
            onPress={() => router.push('/home')}
            variant="outline"
            size="medium"
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.error,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  xpText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.accent,
  },
  scoreCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
  },
  scoreLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  progressRing: {
    width: '100%',
    height: 12,
    backgroundColor: COLORS.darkGray,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressRingFill: {
    height: '100%',
  },
  balanceCard: {
    marginBottom: SPACING.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  balanceTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  balanceStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  balanceValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
  },
  feedbackCard: {
    marginBottom: SPACING.md,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  feedbackTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  feedbackText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    lineHeight: 22,
  },
  fixesCard: {
    marginBottom: SPACING.md,
  },
  fixesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  fixesTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  fixItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fixText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    flex: 1,
    lineHeight: 22,
  },
  proCard: {
    marginBottom: SPACING.lg,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  proTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  proText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    lineHeight: 22,
  },
  actions: {
    marginTop: SPACING.lg,
  },
});