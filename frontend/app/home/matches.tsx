import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { format } from 'date-fns';

interface Match {
  match_id: string;
  opponent_name: string;
  match_date: string;
  result: string;
  score: string;
  duration_minutes: number;
  aces: number;
  double_faults: number;
  winners: number;
  unforced_errors: number;
  first_serve_percentage: number;
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    opponent_name: '',
    match_date: new Date().toISOString(),
    result: 'won',
    score: '',
    duration_minutes: 90,
    aces: 0,
    double_faults: 0,
    winners: 0,
    unforced_errors: 0,
    first_serve_percentage: 0,
    break_points_won: 0,
    break_points_total: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matchesRes, statsRes] = await Promise.all([
        api.get('/matches/list'),
        api.get('/matches/stats'),
      ]);
      setMatches(matchesRes.data.matches || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMatch = async () => {
    if (!formData.opponent_name || !formData.score) {
      Alert.alert('Missing Info', 'Please fill in opponent name and score');
      return;
    }

    try {
      await api.post('/matches/create', formData);
      setShowAddModal(false);
      setFormData({
        opponent_name: '',
        match_date: new Date().toISOString(),
        result: 'won',
        score: '',
        duration_minutes: 90,
        aces: 0,
        double_faults: 0,
        winners: 0,
        unforced_errors: 0,
        first_serve_percentage: 0,
        break_points_won: 0,
        break_points_total: 0,
        notes: '',
      });
      await loadData();
      Alert.alert('Success', 'Match added!');
    } catch (error) {
      console.error('Failed to add match:', error);
      Alert.alert('Error', 'Failed to add match');
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Match History</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={28} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        {stats && (
          <Card style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.total_matches}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {stats.wins}
                </Text>
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {stats.losses}
                </Text>
                <Text style={styles.statLabel}>Losses</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.win_percentage}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
            </View>
            <View style={styles.additionalStats}>
              <View style={styles.additionalStat}>
                <Ionicons name="time" size={20} color={COLORS.accentBlue} />
                <Text style={styles.additionalStatText}>
                  {stats.total_hours}h total
                </Text>
              </View>
              <View style={styles.additionalStat}>
                <Ionicons name="flash" size={20} color={COLORS.accent} />
                <Text style={styles.additionalStatText}>
                  {stats.avg_aces} avg aces
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Matches List */}
        {matches.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="tennisball" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No matches recorded yet</Text>
            <Text style={styles.emptySubtext}>Track your matches to analyze performance</Text>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.match_id} style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <View
                  style={[
                    styles.resultBadge,
                    match.result === 'won' ? styles.wonBadge : styles.lostBadge,
                  ]}
                >
                  <Text style={styles.resultText}>
                    {match.result === 'won' ? 'W' : 'L'}
                  </Text>
                </View>
                <View style={styles.matchInfo}>
                  <Text style={styles.opponentName}>vs {match.opponent_name}</Text>
                  <Text style={styles.matchDate}>
                    {format(new Date(match.match_date), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Text style={styles.score}>{match.score}</Text>
              </View>
              <View style={styles.matchStats}>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatLabel}>Aces</Text>
                  <Text style={styles.matchStatValue}>{match.aces}</Text>
                </View>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatLabel}>Winners</Text>
                  <Text style={styles.matchStatValue}>{match.winners}</Text>
                </View>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatLabel}>1st Serve</Text>
                  <Text style={styles.matchStatValue}>
                    {match.first_serve_percentage}%
                  </Text>
                </View>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatLabel}>Duration</Text>
                  <Text style={styles.matchStatValue}>{match.duration_minutes}m</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Match Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Match</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Opponent Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter opponent name"
                  placeholderTextColor={COLORS.gray}
                  value={formData.opponent_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, opponent_name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Result</Text>
                <View style={styles.resultButtons}>
                  <TouchableOpacity
                    style={[
                      styles.resultButton,
                      formData.result === 'won' && styles.resultButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, result: 'won' })}
                  >
                    <Text
                      style={[
                        styles.resultButtonText,
                        formData.result === 'won' && styles.resultButtonTextActive,
                      ]}
                    >
                      Won
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.resultButton,
                      formData.result === 'lost' && styles.resultButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, result: 'lost' })}
                  >
                    <Text
                      style={[
                        styles.resultButtonText,
                        formData.result === 'lost' && styles.resultButtonTextActive,
                      ]}
                    >
                      Lost
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Score</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 6-4, 6-3"
                  placeholderTextColor={COLORS.gray}
                  value={formData.score}
                  onChangeText={(text) => setFormData({ ...formData, score: text })}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.sm }]}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.duration_minutes.toString()}
                    onChangeText={(text) =>
                      setFormData({ ...formData, duration_minutes: parseInt(text) || 0 })
                    }
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Aces</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.aces.toString()}
                    onChangeText={(text) =>
                      setFormData({ ...formData, aces: parseInt(text) || 0 })
                    }
                  />
                </View>
              </View>

              <Button
                title="Add Match"
                onPress={addMatch}
                variant="primary"
                size="large"
                style={styles.addMatchButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.white },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  statsCard: { marginBottom: SPACING.lg },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.accent },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray, marginTop: SPACING.xs },
  additionalStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.darkGray },
  additionalStat: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  additionalStatText: { fontSize: FONT_SIZES.sm, color: COLORS.lightGray },
  emptyCard: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.white, marginTop: SPACING.md },
  emptySubtext: { fontSize: FONT_SIZES.md, color: COLORS.gray, marginTop: SPACING.xs },
  matchCard: { marginBottom: SPACING.md },
  matchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: SPACING.md },
  resultBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  wonBadge: { backgroundColor: COLORS.success },
  lostBadge: { backgroundColor: COLORS.error },
  resultText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  matchInfo: { flex: 1 },
  opponentName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.white },
  matchDate: { fontSize: FONT_SIZES.xs, color: COLORS.gray, marginTop: SPACING.xs },
  score: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.accent },
  matchStats: { flexDirection: 'row', justifyContent: 'space-between' },
  matchStat: { alignItems: 'center' },
  matchStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray },
  matchStatValue: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.white, marginTop: SPACING.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.secondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.white, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.darkGray, borderRadius: 12, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.white },
  resultButtons: { flexDirection: 'row', gap: SPACING.sm },
  resultButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: 12, backgroundColor: COLORS.darkGray, alignItems: 'center', borderWidth: 2, borderColor: COLORS.darkGray },
  resultButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  resultButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.white },
  resultButtonTextActive: { color: COLORS.primary },
  inputRow: { flexDirection: 'row' },
  addMatchButton: { marginTop: SPACING.md },
});