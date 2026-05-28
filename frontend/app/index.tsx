import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/contexts/AuthContext';
import { Button } from '../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Index() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/home');
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="tennisball" size={60} color={COLORS.accent} />
          </View>
          
          <Text style={styles.heroTitle}>Train Smarter.</Text>
          <Text style={styles.heroTitle}>Play Better.</Text>
          
          <Text style={styles.heroSubtitle}>
            AI-powered tennis coaching in your pocket
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Start Training"
              onPress={login}
              variant="primary"
              size="large"
              style={styles.ctaButton}
            />
            <Button
              title="Upload Your Swing"
              onPress={login}
              variant="outline"
              size="large"
              style={styles.ctaButton}
            />
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Powered by AI Technology</Text>
          
          <View style={styles.featureCard}>
            <Ionicons name="videocam" size={40} color={COLORS.accentBlue} />
            <Text style={styles.featureTitle}>Video Analysis</Text>
            <Text style={styles.featureDescription}>
              Upload your strokes and get instant AI feedback on technique, footwork, and timing
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="fitness" size={40} color={COLORS.accent} />
            <Text style={styles.featureTitle}>Training Plans</Text>
            <Text style={styles.featureDescription}>
              Get personalized practice routines based on your goals and weaknesses
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="chatbubbles" size={40} color={COLORS.accentBlue} />
            <Text style={styles.featureTitle}>AI Coach</Text>
            <Text style={styles.featureDescription}>
              Chat with your virtual tennis coach anytime for tips and motivation
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="trophy" size={40} color={COLORS.accent} />
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureDescription}>
              Monitor improvement with detailed analytics and earn achievements
            </Text>
          </View>
        </View>

        {/* Demo Section */}
        <View style={styles.demoSection}>
          <Text style={styles.sectionTitle}>See It In Action</Text>
          <View style={styles.demoCard}>
            <View style={styles.demoImagePlaceholder}>
              <Ionicons name="play-circle" size={80} color={COLORS.accent} />
              <Text style={styles.demoText}>Sample Serve Analysis</Text>
            </View>
            <View style={styles.demoStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>85</Text>
                <Text style={styles.statLabel}>Technique Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>9/10</Text>
                <Text style={styles.statLabel}>Balance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Good</Text>
                <Text style={styles.statLabel}>Timing</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pro Players Section */}
        <View style={styles.proSection}>
          <Text style={styles.sectionTitle}>Learn from the Pros</Text>
          <Text style={styles.proSubtitle}>
            Get insights inspired by the best players in the world
          </Text>
          <View style={styles.proGrid}>
            {[
              { name: 'Carlos Alcaraz', style: 'All-Court Aggression' },
              { name: 'Jannik Sinner', style: 'Power Baseline' },
              { name: 'Novak Djokovic', style: 'Defensive Excellence' },
              { name: 'Roger Federer', style: 'Classic Elegance' },
            ].map((player, index) => (
              <View key={index} style={styles.proCard}>
                <View style={styles.proIcon}>
                  <Ionicons name="person" size={30} color={COLORS.accent} />
                </View>
                <Text style={styles.proName}>{player.name}</Text>
                <Text style={styles.proStyle}>{player.style}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCTA}>
          <Text style={styles.ctaTitle}>Ready to Elevate Your Game?</Text>
          <Button
            title="Get Started Free"
            onPress={login}
            variant="primary"
            size="large"
            style={styles.finalButton}
          />
          <Text style={styles.ctaFooter}>
            3 free video analyses • No credit card required
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    paddingVertical: SPACING.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.secondary,
    borderRadius: 100,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  ctaButton: {
    width: '100%',
  },
  featuresSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  featureCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  featureTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  featureDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  demoSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  demoCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  demoImagePlaceholder: {
    height: 200,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  demoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
  proSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  proSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  proGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  proCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  proIcon: {
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
    textAlign: 'center',
  },
  finalCTA: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  ctaTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  finalButton: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  ctaFooter: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'center',
  },
  demoSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});