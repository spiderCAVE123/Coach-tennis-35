import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { TrainingPlan } from '../../src/types';

export default function TrainingScreen() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    goal: '',
    skill_level: 'intermediate',
    weakness: '',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/training/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!formData.goal || !formData.weakness) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post('/training/generate', formData);
      setPlans([response.data.plan, ...plans]);
      setShowForm(false);
      setFormData({ goal: '', skill_level: 'intermediate', weakness: '' });
      Alert.alert('Success', 'Training plan generated!');
    } catch (error) {
      console.error('Failed to generate plan:', error);
      Alert.alert('Error', 'Failed to generate training plan');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Training Plans</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons
              name={showForm ? 'close' : 'add'}
              size={28}
              color={COLORS.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Generate Plan Form */}
        {showForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Generate Custom Plan</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Goal</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Improve serve consistency"
                placeholderTextColor={COLORS.gray}
                value={formData.goal}
                onChangeText={(text) => setFormData({ ...formData, goal: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Skill Level</Text>
              <View style={styles.skillButtons}>
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.skillButton,
                      formData.skill_level === level && styles.skillButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, skill_level: level })}
                  >
                    <Text
                      style={[
                        styles.skillButtonText,
                        formData.skill_level === level && styles.skillButtonTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Main Weakness</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Footwork, backhand"
                placeholderTextColor={COLORS.gray}
                value={formData.weakness}
                onChangeText={(text) => setFormData({ ...formData, weakness: text })}
              />
            </View>

            <Button
              title="Generate Plan"
              onPress={generatePlan}
              loading={generating}
              variant="primary"
              size="large"
            />
          </Card>
        )}

        {/* Existing Plans */}
        {plans.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No training plans yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first personalized training plan
            </Text>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.plan_id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planGoal}>{plan.goal}</Text>
                  <Text style={styles.planMeta}>
                    {plan.skill_level} • Focus: {plan.weakness}
                  </Text>
                </View>
                <View style={styles.planBadge}>
                  <Ionicons name="fitness" size={24} color={COLORS.accentBlue} />
                </View>
              </View>

              {/* Daily Drills */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Drills</Text>
                {plan.daily_drills.slice(0, 3).map((drill, index) => (
                  <View key={index} style={styles.drillItem}>
                    <View style={styles.drillIcon}>
                      <Text style={styles.drillNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.drillContent}>
                      <Text style={styles.drillName}>{drill.name}</Text>
                      <Text style={styles.drillDescription}>{drill.description}</Text>
                      <View style={styles.drillMeta}>
                        <Text style={styles.drillMetaText}>
                          {drill.reps} reps • {drill.duration}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                {plan.daily_drills.length > 3 && (
                  <Text style={styles.moreText}>
                    +{plan.daily_drills.length - 3} more drills
                  </Text>
                )}
              </View>

              {/* Weekly Schedule */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Schedule</Text>
                <View style={styles.weeklyGrid}>
                  {plan.weekly_schedule.slice(0, 7).map((day, index) => (
                    <View key={index} style={styles.dayCard}>
                      <Text style={styles.dayName}>{day.day.substring(0, 3)}</Text>
                      <Text style={styles.dayFocus}>{day.focus}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Button
                title="Start Training"
                onPress={() => Alert.alert('Training', 'Start your training session!')}
                variant="primary"
                size="medium"
              />
            </Card>
          ))
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  skillButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  skillButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.darkGray,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.darkGray,
  },
  skillButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  skillButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  skillButtonTextActive: {
    color: COLORS.primary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  planCard: {
    marginBottom: SPACING.lg,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  planInfo: {
    flex: 1,
  },
  planGoal: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  planMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  planBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  drillItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  drillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  drillContent: {
    flex: 1,
  },
  drillName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  drillDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    marginBottom: SPACING.xs,
  },
  drillMeta: {
    flexDirection: 'row',
  },
  drillMetaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentBlue,
  },
  moreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  dayName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  dayFocus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
});