import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { VictoryLine, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, challengesRes] = await Promise.all([
        api.get('/progress/stats'),
        api.get('/gamification/challenges'),
      ]);
      setStats(statsRes.data);
      setChallenges(challengesRes.data.challenges || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadData()]);
    setRefreshing(false);
  };

  const xpToNextLevel = (user?.level || 1) * 500;
  const xpProgress = ((user?.xp || 0) % 500) / 500;

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Player'}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Ionicons name="trophy" size={24} color={COLORS.accent} />
            <Text style={styles.levelText}>Lv {user?.level || 1}</Text>
          </View>
        </View>

        {/* XP Progress */}
        <Card style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpTitle}>Your Progress</Text>
            <Text style={styles.xpValue}>{user?.xp || 0} XP</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpProgress * 100}%` }]} />
          </View>
          <Text style={styles.xpSubtext}>
            {xpToNextLevel - ((user?.xp || 0) % 500)} XP to Level {(user?.level || 1) + 1}
          </Text>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="flame" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.streak_days || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="videocam" size={32} color={COLORS.accentBlue} />
            <Text style={styles.statValue}>
              {stats?.progress_history?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Videos</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="star" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats?.achievements?.length || 0}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </Card>
        </View>

        {/* Daily Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Challenges</Text>
          {challenges.slice(0, 3).map((challenge, index) => (
            <Card key={index} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Ionicons
                  name={challenge.completed ? 'checkmark-circle' : 'radio-button-off'}
                  size={24}
                  color={challenge.completed ? COLORS.success : COLORS.gray}
                />
                <View style={styles.challengeContent}>
                  <Text style={styles.challengeText}>{challenge.description}</Text>
                  <View style={styles.challengeProgress}>
                    <View style={styles.challengeProgressBar}>
                      <View
                        style={[
                          styles.challengeProgressFill,
                          { width: `${(challenge.progress / challenge.target) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.challengeXP}>+{challenge.reward_xp} XP</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Recent Performance */}
        {stats?.progress_history && stats.progress_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Performance</Text>
            <Card style={styles.chartCard}>
              <VictoryChart
                width={width - SPACING.lg * 2 - SPACING.lg * 2}
                height={200}
                theme={VictoryTheme.material}
                padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
              >
                <VictoryAxis
                  style={{
                    axis: { stroke: COLORS.darkGray },
                    tickLabels: { fill: COLORS.gray, fontSize: 10 },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    axis: { stroke: COLORS.darkGray },
                    tickLabels: { fill: COLORS.gray, fontSize: 10 },
                  }}
                />
                <VictoryLine
                  data={stats.progress_history.slice(-10).map((p: any, i: number) => ({
                    x: i + 1,
                    y: p.score,
                  }))}
                  style={{
                    data: { stroke: COLORS.accent, strokeWidth: 3 },
                  }}
                />
              </VictoryChart>
            </Card>
          </View>
        )}

        {/* Shot Type Performance */}
        {stats?.stats_by_shot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance by Shot</Text>
            {Object.entries(stats.stats_by_shot).map(([shotType, shotStats]: [string, any]) => (
              <Card key={shotType} style={styles.shotCard}>
                <View style={styles.shotHeader}>
                  <Text style={styles.shotType}>
                    {shotType.charAt(0).toUpperCase() + shotType.slice(1)}
                  </Text>
                  <Text style={styles.shotScore}>
                    {Math.round(shotStats.average_score) || 0}
                  </Text>
                </View>
                <View style={styles.shotStats}>
                  <View style={styles.shotStat}>
                    <Text style={styles.shotStatLabel}>Best</Text>
                    <Text style={styles.shotStatValue}>{shotStats.best_score}</Text>
                  </View>
                  <View style={styles.shotStat}>
                    <Text style={styles.shotStatLabel}>Attempts</Text>
                    <Text style={styles.shotStatValue}>{shotStats.total_attempts}</Text>
                  </View>
                  <View style={styles.shotStat}>
                    <Text style={styles.shotStatLabel}>Improvement</Text>
                    <Text
                      style={[
                        styles.shotStatValue,
                        { color: shotStats.improvement >= 0 ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {shotStats.improvement >= 0 ? '+' : ''}
                      {Math.round(shotStats.improvement)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionSection}>
          <Button
            title="Upload New Video"
            onPress={() => router.push('/home/upload')}
            variant="primary"
            size="large"
          />
          <Button
            title="Chat with Coach"
            onPress={() => router.push('/home/coach')}
            variant="outline"
            size="large"
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
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  levelText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  xpCard: {
    marginBottom: SPACING.lg,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  xpTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  xpValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.accent,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.darkGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  xpSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  challengeCard: {
    marginBottom: SPACING.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  challengeContent: {
    flex: 1,
  },
  challengeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  challengeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  challengeProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.darkGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accentBlue,
  },
  challengeXP: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
    fontWeight: '600',
  },
  chartCard: {
    padding: SPACING.sm,
  },
  shotCard: {
    marginBottom: SPACING.sm,
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  shotType: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  shotScore: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  shotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shotStat: {
    alignItems: 'center',
  },
  shotStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    marginBottom: SPACING.xs,
  },
  shotStatValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionSection: {
    marginTop: SPACING.lg,
  },
});