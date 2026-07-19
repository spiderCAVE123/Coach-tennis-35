import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  BounceIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { XPToken } from '../../src/components/XPToken';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import {
  playTimerStartSound,
  playTimerEndSound,
  playDrillCompleteSound,
  playVictorySound,
  playCountdownTick,
} from '../../src/utils/sounds';

const { width } = Dimensions.get('window');

interface Drill {
  name: string;
  description: string;
  reps: number;
  duration: string;
}

type WorkoutState = 'ready' | 'exercise' | 'rest' | 'complete';

export default function WorkoutSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const plan = params.plan ? JSON.parse(params.plan as string) : null;
  const drills: Drill[] = plan?.daily_drills || [];
  
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [workoutState, setWorkoutState] = useState<WorkoutState>('ready');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [restTime, setRestTime] = useState(15); // 15 second rest
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [completedDrills, setCompletedDrills] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<any>(null);
  const totalTimerRef = useRef<any>(null);
  
  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const currentDrill = drills[currentDrillIndex];
  const totalDrills = drills.length;
  const progress = (currentDrillIndex / totalDrills) * 100;

  useEffect(() => {
    if (workoutState === 'exercise' || workoutState === 'rest') {
      // Pulse animation for active drill
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Start timer
      if (!isPaused) {
        timerRef.current = setInterval(() => {
          if (workoutState === 'exercise') {
            setTimeElapsed((prev) => prev + 1);
          } else if (workoutState === 'rest') {
            setRestTime((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                startNextDrill();
                return 15;
              }
              // Play countdown tick for last 3 seconds
              if (prev <= 4) {
                playCountdownTick();
              }
              return prev - 1;
            });
          }
        }, 1000);
      }
    }

    // Total workout timer
    if (workoutState !== 'ready' && workoutState !== 'complete') {
      totalTimerRef.current = setInterval(() => {
        setTotalTimeSpent((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [workoutState, isPaused]);

  useEffect(() => {
    progressWidth.value = withSpring(progress);
  }, [currentDrillIndex]);

  const startWorkout = () => {
    playTimerStartSound();
    setWorkoutState('exercise');
    setTimeElapsed(0);
  };

  const completeDrill = () => {
    playDrillCompleteSound();
    setCompletedDrills([...completedDrills, currentDrillIndex]);
    
    if (currentDrillIndex >= totalDrills - 1) {
      // Workout complete
      finishWorkout();
    } else {
      // Move to rest
      playTimerEndSound();
      setWorkoutState('rest');
      setRestTime(15);
      setTimeElapsed(0);
    }
  };

  const startNextDrill = () => {
    playTimerStartSound();
    setCurrentDrillIndex((prev) => prev + 1);
    setWorkoutState('exercise');
    setTimeElapsed(0);
  };

  const skipRest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    startNextDrill();
  };

  const skipDrill = () => {
    Alert.alert(
      'Skip Drill?',
      'Are you sure you want to skip this drill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            if (currentDrillIndex >= totalDrills - 1) {
              finishWorkout();
            } else {
              startNextDrill();
            }
          },
        },
      ]
    );
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
  };

  const exitWorkout = () => {
    Alert.alert(
      'Exit Workout?',
      'Your progress will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
            router.back();
          },
        },
      ]
    );
  };

  const finishWorkout = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setWorkoutState('complete');

    // Play victory sound
    setTimeout(() => {
      playVictorySound();
    }, 300);

    // Award XP for completing workout
    try {
      // Complete challenges/award XP through the backend
      // We can call the challenges endpoint to complete workout challenges
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Ready Screen
  if (workoutState === 'ready') {
    return (
      <LinearGradient
        colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.readyContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={exitWorkout}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(600)} style={styles.readyHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="fitness" size={80} color={COLORS.accent} />
            </View>
            <Text style={styles.readyTitle}>Ready to Train</Text>
            <Text style={styles.readySubtitle}>{plan?.goal}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <Card style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Workout Overview</Text>
              <View style={styles.overviewStats}>
                <View style={styles.overviewStat}>
                  <Text style={styles.overviewValue}>{totalDrills}</Text>
                  <Text style={styles.overviewLabel}>Drills</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Text style={styles.overviewValue}>
                    ~{totalDrills * 3}m
                  </Text>
                  <Text style={styles.overviewLabel}>Duration</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Text style={styles.overviewValue}>+150</Text>
                  <Text style={styles.overviewLabel}>XP</Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)}>
            <Text style={styles.drillsListTitle}>Today's Drills</Text>
            {drills.map((drill, index) => (
              <Animated.View
                key={index}
                entering={FadeInUp.delay(500 + index * 100).duration(500)}
              >
                <Card style={styles.drillPreviewCard}>
                  <View style={styles.drillNumber}>
                    <Text style={styles.drillNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.drillPreviewContent}>
                    <Text style={styles.drillPreviewName}>{drill.name}</Text>
                    <Text style={styles.drillPreviewMeta}>
                      {drill.reps} reps • {drill.duration}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.startButtonContainer}>
            <Button
              title="Start Workout"
              onPress={startWorkout}
              variant="primary"
              size="large"
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Complete Screen
  if (workoutState === 'complete') {
    return (
      <LinearGradient
        colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.completeContainer}>
          <Animated.View entering={ZoomIn.duration(800)} style={styles.completeHeader}>
            <View style={styles.trophyContainer}>
              <Ionicons name="trophy" size={100} color={COLORS.warning} />
            </View>
            <Text style={styles.completeTitle}>Workout Complete</Text>
            <Text style={styles.completeSubtitle}>Great work today</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)}>
            <Card style={styles.statsCard}>
              <Text style={styles.statsTitle}>Session Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                  <Text style={styles.statValue}>{completedDrills.length}</Text>
                  <Text style={styles.statLabel}>Drills Done</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="time" size={32} color={COLORS.accentBlue} />
                  <Text style={styles.statValue}>{formatTime(totalTimeSpent)}</Text>
                  <Text style={styles.statLabel}>Total Time</Text>
                </View>
                <View style={styles.statBox}>
                  <XPToken amount={150} animated size="small" />
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600).duration(600)}>
            <Card style={styles.motivationCard}>
              <Ionicons name="ribbon" size={60} color={COLORS.accent} style={styles.motivationIcon} />
              <Text style={styles.motivationText}>
                Consistency is key. Keep training regularly to see improvement.
              </Text>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.completeActions}>
            <Button
              title="Back to Training"
              onPress={() => router.push('/home/training')}
              variant="primary"
              size="large"
            />
            <Button
              title="View Progress"
              onPress={() => router.push('/home')}
              variant="outline"
              size="large"
              style={{ marginTop: SPACING.md }}
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Rest Screen
  if (workoutState === 'rest') {
    return (
      <LinearGradient
        colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
        style={styles.container}
      >
        <TouchableOpacity style={styles.closeButton} onPress={exitWorkout}>
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.restContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.restContent}>
            <Text style={styles.restLabel}>REST</Text>
            <Animated.View style={pulseAnimatedStyle}>
              <View style={styles.restTimerCircle}>
                <Text style={styles.restTimer}>{restTime}</Text>
                <Text style={styles.restTimerLabel}>seconds</Text>
              </View>
            </Animated.View>

            <Text style={styles.nextUpLabel}>Coming up next</Text>
            {drills[currentDrillIndex + 1] && (
              <Card style={styles.nextDrillCard}>
                <Text style={styles.nextDrillName}>
                  {drills[currentDrillIndex + 1].name}
                </Text>
                <Text style={styles.nextDrillMeta}>
                  {drills[currentDrillIndex + 1].reps} reps · {drills[currentDrillIndex + 1].duration}
                </Text>
              </Card>
            )}

            <Button
              title="Skip Rest"
              onPress={skipRest}
              variant="outline"
              size="large"
              style={styles.skipRestButton}
            />
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  // Exercise Screen (Active workout)
  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={exitWorkout} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Drill {currentDrillIndex + 1}/{totalDrills}
          </Text>
        </View>

        <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBarFill, progressAnimatedStyle]} />
      </View>

      <ScrollView contentContainerStyle={styles.exerciseContent}>
        {/* Current Exercise */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Card style={styles.exerciseCard}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>#{currentDrillIndex + 1}</Text>
            </View>
            
            <Text style={styles.exerciseName}>{currentDrill.name}</Text>
            <Text style={styles.exerciseDescription}>{currentDrill.description}</Text>

            <View style={styles.exerciseMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="repeat" size={24} color={COLORS.accent} />
                <Text style={styles.metaValue}>{currentDrill.reps}</Text>
                <Text style={styles.metaLabel}>Reps</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={24} color={COLORS.accentBlue} />
                <Text style={styles.metaValue}>{currentDrill.duration}</Text>
                <Text style={styles.metaLabel}>Duration</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Timer */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Card style={styles.timerCard}>
            <Text style={styles.timerLabel}>Time Elapsed</Text>
            <Text style={styles.timerValue}>{formatTime(timeElapsed)}</Text>
            <Text style={styles.timerHint}>
              {isPaused ? 'Paused' : 'Recording'}
            </Text>
          </Card>
        </Animated.View>

        {/* Instructions */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Card style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to do it</Text>
            <Text style={styles.instructionsText}>{currentDrill.description}</Text>
            
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.tipText}>Focus on proper form</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.tipText}>Maintain a steady pace</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.tipText}>Breathe consistently</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.exerciseActions}>
          <TouchableOpacity onPress={skipDrill} style={styles.skipButton}>
            <Ionicons name="play-skip-forward" size={20} color={COLORS.gray} />
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <Button
            title="Done"
            onPress={completeDrill}
            variant="primary"
            size="large"
            style={styles.doneButton}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeButton: {
    position: 'absolute',
    top: SPACING.xxl,
    right: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Ready Screen
  readyContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xxl,
  },
  readyHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  readyTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  readySubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  overviewCard: { marginBottom: SPACING.lg },
  overviewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  overviewStats: { flexDirection: 'row', justifyContent: 'space-around' },
  overviewStat: { alignItems: 'center' },
  overviewValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.accent,
  },
  overviewLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  drillsListTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  drillPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  drillNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillNumberText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  drillPreviewContent: { flex: 1 },
  drillPreviewName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  drillPreviewMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  startButtonContainer: { marginTop: SPACING.xl },
  
  // Exercise Screen
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.md,
  },
  progressInfo: { alignItems: 'center' },
  progressText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.darkGray,
    marginHorizontal: SPACING.lg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  exerciseContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  exerciseCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.xl,
  },
  exerciseNumber: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginBottom: SPACING.md,
  },
  exerciseNumberText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.primary,
  },
  exerciseName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  exerciseDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: SPACING.xxl,
    marginTop: SPACING.md,
  },
  metaItem: { alignItems: 'center' },
  metaValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  metaLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  timerCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(57, 255, 20, 0.05)',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  timerLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  timerValue: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.accent,
    textShadowColor: COLORS.accent,
    textShadowRadius: 20,
  },
  timerHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    marginTop: SPACING.sm,
  },
  instructionsCard: { marginBottom: SPACING.lg },
  instructionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  instructionsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  tipsList: { gap: SPACING.sm },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  skipButton: {
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.darkGray,
    minWidth: 80,
  },
  skipButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  doneButton: { flex: 1 },
  
  // Rest Screen
  restContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  restContent: { alignItems: 'center', width: '100%' },
  restLabel: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '900',
    color: COLORS.accentBlue,
    letterSpacing: 8,
    marginBottom: SPACING.xl,
  },
  restTimerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 4,
    borderColor: COLORS.accentBlue,
  },
  restTimer: {
    fontSize: 100,
    fontWeight: '900',
    color: COLORS.accentBlue,
  },
  restTimerLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
  },
  nextUpLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  nextDrillCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    minWidth: 250,
  },
  nextDrillName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  nextDrillMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  skipRestButton: { minWidth: 200 },

  // Complete Screen
  completeContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xxl,
  },
  completeHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  trophyContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 4,
    borderColor: COLORS.warning,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  completeTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.lightGray,
  },
  statsCard: { marginBottom: SPACING.lg },
  statsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center' },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  motivationCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  motivationIcon: {
    marginBottom: SPACING.md,
  },
  motivationText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 24,
  },
  completeActions: {
    marginTop: SPACING.lg,
  },
});
