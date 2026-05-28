import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LeaderboardEntry } from '../../src/types';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [premiumStatus, setPremiumStatus] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'profile' | 'leaderboard' | 'premium'>('profile');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leaderboardRes, premiumRes] = await Promise.all([
        api.get('/gamification/leaderboard'),
        api.get('/premium/status'),
      ]);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setPremiumStatus(premiumRes.data);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleUpgradePremium = async () => {
    try {
      await api.post('/premium/upgrade');
      await refreshUser();
      Alert.alert('Success', 'Upgraded to Premium!');
    } catch (error) {
      console.error('Premium upgrade failed:', error);
      Alert.alert('Error', 'Failed to upgrade to premium');
    }
  };

  const renderProfile = () => (
    <>
      {/* User Info */}
      <Card style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={COLORS.accent} />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.premiumBadge}>
              {user?.premium ? (
                <>
                  <Ionicons name="star" size={16} color={COLORS.warning} />
                  <Text style={styles.premiumText}>Premium Member</Text>
                </>
              ) : (
                <Text style={styles.freeText}>Free Tier</Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.streak_days}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      </Card>

      {/* Pro Players Inspiration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learn from the Pros</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { name: 'Carlos Alcaraz', style: 'All-Court', signature: 'Explosive Power' },
            { name: 'Jannik Sinner', style: 'Baseline', signature: 'Precise Groundstrokes' },
            { name: 'Novak Djokovic', style: 'Defense', signature: 'Return of Serve' },
            { name: 'Roger Federer', style: 'All-Court', signature: 'One-Handed Backhand' },
          ].map((player, index) => (
            <Card key={index} style={styles.proCard}>
              <View style={styles.proAvatar}>
                <Ionicons name="tennisball" size={32} color={COLORS.accentBlue} />
              </View>
              <Text style={styles.proName}>{player.name}</Text>
              <Text style={styles.proStyle}>{player.style}</Text>
              <Text style={styles.proSignature}>{player.signature}</Text>
            </Card>
          ))}
        </ScrollView>
      </View>

      {/* Future Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <Card style={styles.featuresList}>
          {[
            { icon: 'watch', title: 'Live Swing Analysis', description: 'Real-time feedback' },
            { icon: 'fitness', title: 'Smartwatch Integration', description: 'Track workouts' },
            { icon: 'stats-chart', title: 'Match Statistics', description: 'Detailed analytics' },
            { icon: 'people', title: 'Player Matchmaking', description: 'Find local partners' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name={feature.icon as any} size={24} color={COLORS.accentBlue} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>

      {/* Logout Button */}
      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        size="large"
        style={styles.logoutButton}
      />
    </>
  );

  const renderLeaderboard = () => (
    <>
      <View style={styles.leaderboardHeader}>
        <Ionicons name="trophy" size={32} color={COLORS.accent} />
        <Text style={styles.leaderboardTitle}>Global Leaderboard</Text>
      </View>

      {leaderboard.slice(0, 10).map((entry, index) => (
        <Card key={index} style={styles.leaderboardCard}>
          <View style={styles.leaderboardRank}>
            <Text style={styles.rankNumber}>#{index + 1}</Text>
          </View>
          <View style={styles.leaderboardInfo}>
            <Text style={styles.leaderboardName}>{entry.name}</Text>
            <Text style={styles.leaderboardLevel}>Level {entry.level}</Text>
          </View>
          <View style={styles.leaderboardXP}>
            <Text style={styles.xpValue}>{entry.xp}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </Card>
      ))}
    </>
  );

  const renderPremium = () => (
    <>
      <View style={styles.premiumHeader}>
        <Ionicons name="star" size={48} color={COLORS.warning} />
        <Text style={styles.premiumTitle}>
          {user?.premium ? 'Premium Active' : 'Upgrade to Premium'}
        </Text>
        <Text style={styles.premiumSubtitle}>
          {user?.premium
            ? 'You have access to all premium features'
            : 'Unlock unlimited potential'}
        </Text>
      </View>

      {!user?.premium && premiumStatus && (
        <>
          <Card style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Premium Membership</Text>
            <Text style={styles.pricingPrice}>$9.99/month</Text>
            <Button
              title="Upgrade Now"
              onPress={handleUpgradePremium}
              variant="primary"
              size="large"
              style={styles.upgradeButton}
            />
          </Card>

          <Card style={styles.featuresComparisonCard}>
            <Text style={styles.comparisonTitle}>Features Comparison</Text>
            
            <View style={styles.comparisonSection}>
              <Text style={styles.tierTitle}>Free Tier</Text>
              {premiumStatus.features.free.map((feature: string, index: number) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.gray} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.comparisonSection}>
              <Text style={styles.tierTitlePremium}>Premium</Text>
              {premiumStatus.features.premium.map((feature: string, index: number) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {user?.premium && (
        <Card style={styles.premiumActiveCard}>
          <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
          <Text style={styles.premiumActiveTitle}>You're all set!</Text>
          <Text style={styles.premiumActiveText}>
            Enjoy unlimited uploads, advanced analytics, and personalized coaching.
          </Text>
        </Card>
      )}
    </>
  );

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'profile' && styles.tabActive]}
          onPress={() => setSelectedTab('profile')}
        >
          <Text style={[styles.tabText, selectedTab === 'profile' && styles.tabTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setSelectedTab('leaderboard')}
        >
          <Text style={[styles.tabText, selectedTab === 'leaderboard' && styles.tabTextActive]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'premium' && styles.tabActive]}
          onPress={() => setSelectedTab('premium')}
        >
          <Text style={[styles.tabText, selectedTab === 'premium' && styles.tabTextActive]}>
            Premium
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedTab === 'profile' && renderProfile()}
        {selectedTab === 'leaderboard' && renderLeaderboard()}
        {selectedTab === 'premium' && renderPremium()}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  userCard: {
    marginBottom: SPACING.lg,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  premiumText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warning,
  },
  freeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.darkGray,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.accent,
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
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  proCard: {
    width: 150,
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  proAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  proName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  proStyle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentBlue,
    marginBottom: SPACING.xs,
  },
  proSignature: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    textAlign: 'center',
  },
  featuresList: {},
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  logoutButton: {
    marginTop: SPACING.lg,
  },
  leaderboardHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  leaderboardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  leaderboardRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.accent,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  leaderboardLevel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
  },
  leaderboardXP: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.accent,
  },
  xpLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  premiumTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  premiumSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
  },
  pricingCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  pricingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  pricingPrice: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: SPACING.lg,
  },
  upgradeButton: {
    width: '100%',
  },
  featuresComparisonCard: {
    marginBottom: SPACING.lg,
  },
  comparisonTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  comparisonSection: {
    marginBottom: SPACING.lg,
  },
  tierTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  tierTitlePremium: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  premiumActiveCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  premiumActiveTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  premiumActiveText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
});
