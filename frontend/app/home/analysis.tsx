import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  BounceIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
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

  const scoreScale = useSharedValue(0);
  const starScale = useSharedValue(0);

  useEffect(() => {
    // Celebration animation on mount
    scoreScale.value = withDelay(300, withSpring(1, { damping: 10 }));
    starScale.value = withSequence(
      withDelay(800, withSpring(1.3)),
      withSpring(1)
    );
  }, []);

  const scoreAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scoreScale.value }],
    };
  });

  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: starScale.value }],
    };
  });

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

  const scoreEmoji = '';

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with XP Badge */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>Analysis Complete</Text>
          <Animated.View entering={BounceIn.delay(400).duration(800)} style={starAnimatedStyle}>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={24} color={COLORS.warning} />
              <Text style={styles.xpText}>+{xpEarned} XP</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Technique Score - Big Reveal */}
        <Animated.View entering={ZoomIn.delay(200).duration(800)}>
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Technique Score</Text>
            <Animated.View style={scoreAnimatedStyle}>
              <View style={styles.scoreCircle}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>
                  {analysis.technique_score}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </Animated.View>
            <View style={styles.progressRing}>
              <Animated.View
                entering={FadeInUp.delay(600).duration(1000)}
                style={[
                  styles.progressRingFill,
                  {
                    width: `${analysis.technique_score}%`,
                    backgroundColor: scoreColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreMessage}>
              {analysis.technique_score >= 90 ? 'Outstanding' :
               analysis.technique_score >= 80 ? 'Excellent' :
               analysis.technique_score >= 70 ? 'Great' :
               analysis.technique_score >= 60 ? 'Good' :
               'Keep practicing'}
            </Text>
          </Card>
        </Animated.View>

        {/* Balance Rating */}
        <Animated.View entering={FadeIn.delay(800).duration(600)}>
          <Card style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="fitness" size={28} color={COLORS.accentBlue} />
              <Text style={styles.balanceTitle}>Balance Rating</Text>
            </View>
            <View style={styles.balanceStars}>
              {[...Array(10)].map((_, i) => (
                <Animated.View
                  key={i}
                  entering={ZoomIn.delay(900 + i * 50).duration(400)}
                >
                  <Ionicons
                    name={i < analysis.balance_rating ? 'star' : 'star-outline'}
                    size={32}
                    color={i < analysis.balance_rating ? COLORS.warning : COLORS.gray}
                  />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.balanceValue}>
              {analysis.balance_rating}/10
            </Text>
          </Card>
        </Animated.View>

        {/* Feedback Sections */}
        <Animated.View entering={FadeInUp.delay(1000).duration(600)}>
          <Card style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="walk" size={24} color={COLORS.accent} />
              <Text style={styles.feedbackTitle}>Footwork</Text>
            </View>
            <Text style={styles.feedbackText}>{analysis.footwork_feedback}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(1100).duration(600)}>
          <Card style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="time" size={24} color={COLORS.accentBlue} />
              <Text style={styles.feedbackTitle}>Swing Timing</Text>
            </View>
            <Text style={styles.feedbackText}>{analysis.swing_timing}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(1200).duration(600)}>
          <Card style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="hand-left" size={24} color={COLORS.accent} />
              <Text style={styles.feedbackTitle}>Contact Point</Text>
            </View>
            <Text style={styles.feedbackText}>{analysis.contact_point}</Text>
          </Card>
        </Animated.View>

        {/* Suggested Fixes */}
        <Animated.View entering={FadeInUp.delay(1300).duration(600)}>
          <Card style={styles.fixesCard}>
            <View style={styles.fixesHeader}>
              <Ionicons name="bulb" size={28} color={COLORS.warning} />
              <Text style={styles.fixesTitle}>Key Improvements</Text>
            </View>
            {analysis.suggested_fixes.map((fix, index) => (
              <Animated.View
                key={index}
                entering={FadeInUp.delay(1400 + index * 100).duration(500)}
                style={styles.fixItem}
              >
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.fixText}>{fix}</Text>
              </Animated.View>
            ))}
          </Card>
        </Animated.View>

        {/* Pro Comparison */}
        <Animated.View entering={FadeIn.delay(1600).duration(600)}>
          <Card style={styles.proCard}>
            <View style={styles.proHeader}>
              <Ionicons name="trophy" size={28} color={COLORS.accentBlue} />
              <Text style={styles.proTitle}>Pro Comparison</Text>
            </View>
            <Text style={styles.proText}>{analysis.pro_comparison}</Text>
          </Card>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.delay(1800).duration(600)} style={styles.actions}>
          <Button
            title="Upload Another"
            onPress={() => router.push('/home/upload')}
            variant="primary"
            size="large"
          />
          <Button
            title="Get Training Plan"
            onPress={() => router.push('/home/training')}
            variant="secondary"
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
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxl },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
  errorText: { fontSize: FONT_SIZES.lg, color: COLORS.error },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZES.xxxl, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginBottom: SPACING.md },
  xpBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: 30, gap: SPACING.sm, borderWidth: 2, borderColor: COLORS.warning },
  xpText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.warning },
  scoreCard: { alignItems: 'center', marginBottom: SPACING.lg, padding: SPACING.xl, backgroundColor: 'rgba(26, 26, 26, 0.8)' },
  scoreLabel: { fontSize: FONT_SIZES.xl, color: COLORS.lightGray, marginBottom: SPACING.lg, fontWeight: '600' },
  scoreCircle: { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.lg },
  scoreValue: { fontSize: 80, fontWeight: '900', textShadowColor: COLORS.accent, textShadowRadius: 20 },
  scoreMax: { fontSize: FONT_SIZES.xxl, color: COLORS.gray, marginLeft: SPACING.xs },
  progressRing: { width: '100%', height: 16, backgroundColor: COLORS.darkGray, borderRadius: 8, overflow: 'hidden', marginBottom: SPACING.md },
  progressRingFill: { height: '100%' },
  scoreMessage: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.accent, textAlign: 'center' },
  balanceCard: { marginBottom: SPACING.lg },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  balanceTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  balanceStars: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.md, gap: SPACING.xs },
  balanceValue: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.warning, textAlign: 'center' },
  feedbackCard: { marginBottom: SPACING.md },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  feedbackTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  feedbackText: { fontSize: FONT_SIZES.md, color: COLORS.lightGray, lineHeight: 24 },
  fixesCard: { marginBottom: SPACING.md },
  fixesHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  fixesTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  fixItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md, padding: SPACING.sm, backgroundColor: 'rgba(57, 255, 20, 0.05)', borderRadius: 12 },
  fixText: { fontSize: FONT_SIZES.md, color: COLORS.lightGray, flex: 1, lineHeight: 22 },
  proCard: { marginBottom: SPACING.lg },
  proHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  proTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  proText: { fontSize: FONT_SIZES.md, color: COLORS.lightGray, lineHeight: 24 },
  actions: { marginTop: SPACING.lg },
});