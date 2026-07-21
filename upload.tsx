import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  BounceIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

export default function UploadScreen() {
  const router = useRouter();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [shotType, setShotType] = useState<string>('serve');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzeSeconds, setAnalyzeSeconds] = useState(0);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const shotTypes = [
    { value: 'serve', label: 'Serve', icon: 'arrow-up-circle', color: COLORS.accent },
    { value: 'forehand', label: 'Forehand', icon: 'arrow-forward-circle', color: COLORS.accentBlue },
    { value: 'backhand', label: 'Backhand', icon: 'arrow-back-circle', color: COLORS.warning },
    { value: 'volley', label: 'Volley', icon: 'flash', color: COLORS.success },
  ];

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload videos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0]);
        // Celebration animation
        scale.value = withSequence(
          withSpring(1.2),
          withSpring(1)
        );
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to record videos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0]);
        scale.value = withSequence(
          withSpring(1.2),
          withSpring(1)
        );
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const uploadAndAnalyze = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video', 'Please select a video first');
      return;
    }

    let analyzeTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setUploading(true);
      setUploadProgress(0);
      setAnalyzeSeconds(0);

      // Send the ACTUAL video file to the backend for real analysis,
      // tracking REAL upload progress (not a simulated fake bar)
      const formData = new FormData();
      formData.append('shot_type', shotType);
      formData.append('video', {
        uri: selectedVideo.uri,
        name: `swing_${Date.now()}.mp4`,
        type: 'video/mp4',
      } as any);

      const uploadRes = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(pct);
          }
        },
      });

      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setAnalyzing(true);
      }, 300);

      const videoId = uploadRes.data.video_id;

      // Pose analysis genuinely takes a few seconds (real per-frame processing,
      // not an instant mock), so show elapsed time instead of a fake spinner-only state
      rotation.value = withSequence(
        withTiming(360, { duration: 2000 }),
        withTiming(0, { duration: 0 })
      );
      analyzeTimer = setInterval(() => {
        setAnalyzeSeconds((s) => s + 1);
      }, 1000);

      const analysisRes = await api.post('/videos/analyze', {
        video_id: videoId,
      });

      if (analyzeTimer) clearInterval(analyzeTimer);
      setAnalyzing(false);

      // Navigate to results with celebration
      setTimeout(() => {
        router.push({
          pathname: '/home/analysis',
          params: {
            videoId,
            analysis: JSON.stringify(analysisRes.data.analysis),
            xpEarned: analysisRes.data.xp_earned,
          },
        });
      }, 500);
    } catch (error: any) {
      if (analyzeTimer) clearInterval(analyzeTimer);
      console.error('Upload/Analysis error:', error);
      setUploading(false);
      setAnalyzing(false);

      // Real, specific errors now surface here - e.g. "couldn't detect a person clearly"
      const message = error.response?.data?.detail || 'Failed to process video. Please try again.';
      Alert.alert('Analysis Error', message);
    }
  };

  const animatedVideoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedAnalyzingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>Upload Your Swing</Text>
          <Text style={styles.subtitle}>
            Get AI-powered feedback on your technique
          </Text>
        </Animated.View>

        {/* Video Selection */}
        <Animated.View entering={FadeIn.delay(200).duration(600)}>
          <Card style={styles.videoCard}>
            {selectedVideo ? (
              <Animated.View style={[styles.selectedVideo, animatedVideoStyle]}>
                <Animated.View entering={BounceIn.duration(800)}>
                  <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                </Animated.View>
                <Text style={styles.selectedText}>Video Ready</Text>
                <Text style={styles.selectedSubtext}>
                  Duration: {Math.round(selectedVideo.duration || 0)}s
                </Text>
                <Button
                  title="Change Video"
                  onPress={pickVideo}
                  variant="outline"
                  size="small"
                  style={styles.changeButton}
                />
              </Animated.View>
            ) : (
              <View style={styles.uploadOptions}>
                <TouchableOpacity style={styles.uploadOption} onPress={recordVideo}>
                  <Ionicons name="videocam" size={56} color={COLORS.accentBlue} />
                  <Text style={styles.optionText}>Record</Text>
                  <Text style={styles.optionSubtext}>Capture your swing</Text>
                </TouchableOpacity>
                
                <View style={styles.divider} />
                
                <TouchableOpacity style={styles.uploadOption} onPress={pickVideo}>
                  <Ionicons name="folder-open" size={56} color={COLORS.accent} />
                  <Text style={styles.optionText}>Upload</Text>
                  <Text style={styles.optionSubtext}>From gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Shot Type Selection */}
        <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Select Shot Type</Text>
          <View style={styles.shotGrid}>
            {shotTypes.map((shot, index) => (
              <Animated.View
                key={shot.value}
                entering={ZoomIn.delay(500 + index * 100).duration(500)}
              >
                <TouchableOpacity
                  style={[
                    styles.shotButton,
                    shotType === shot.value && styles.shotButtonActive,
                    { borderColor: shot.color }
                  ]}
                  onPress={() => setShotType(shot.value)}
                >
                  <Ionicons
                    name={shot.icon as any}
                    size={36}
                    color={shotType === shot.value ? COLORS.primary : shot.color}
                  />
                  <Text
                    style={[
                      styles.shotText,
                      shotType === shot.value && styles.shotTextActive,
                    ]}
                  >
                    {shot.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Upload Button */}
        <Animated.View entering={FadeIn.delay(800).duration(600)}>
          <Button
            title={
              uploading
                ? `Uploading ${uploadProgress}%`
                : analyzing
                ? 'Analyzing...'
                : 'Analyze My Swing'
            }
            onPress={uploadAndAnalyze}
            variant="primary"
            size="large"
            disabled={!selectedVideo || uploading || analyzing}
            loading={uploading || analyzing}
            style={styles.analyzeButton}
          />
        </Animated.View>

        {/* Loading States */}
        {(uploading || analyzing) && (
          <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(400)}
            style={styles.loadingInfo}
          >
            {analyzing && (
              <Animated.View style={animatedAnalyzingStyle}>
                <Ionicons name="tennisball" size={60} color={COLORS.accent} />
              </Animated.View>
            )}
            <Text style={styles.loadingText}>
              {uploading
                ? 'Uploading video...'
                : 'Tracking your body position frame by frame'}
            </Text>
            <Text style={styles.loadingSubtext}>
              {uploading
                ? `${uploadProgress}%`
                : `${analyzeSeconds}s elapsed — typically 5-20s depending on video length`}
            </Text>
            {uploading && (
              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${uploadProgress}%` }
                  ]}
                />
              </View>
            )}
          </Animated.View>
        )}

        {/* Tips */}
        <Animated.View entering={FadeIn.delay(1000).duration(600)}>
          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Recording Tips</Text>
            <View style={styles.tipItem}>
              <Ionicons name="videocam-outline" size={20} color={COLORS.accent} />
              <Text style={styles.tipText}>Film from the side angle</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="sunny-outline" size={20} color={COLORS.accent} />
              <Text style={styles.tipText}>Ensure good lighting</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="time-outline" size={20} color={COLORS.accent} />
              <Text style={styles.tipText}>Keep it 5-30 seconds</Text>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxl },
  header: { marginBottom: SPACING.xl, alignItems: 'center' },
  title: { fontSize: FONT_SIZES.xxxl, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.lightGray, textAlign: 'center', paddingHorizontal: SPACING.lg },
  videoCard: { marginBottom: SPACING.lg, minHeight: 220 },
  uploadOptions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: SPACING.lg },
  uploadOption: { flex: 1, alignItems: 'center', padding: SPACING.lg },
  optionText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.white, marginTop: SPACING.md, textAlign: 'center' },
  optionSubtext: { fontSize: FONT_SIZES.sm, color: COLORS.gray, marginTop: SPACING.xs, textAlign: 'center' },
  divider: { width: 1, height: 100, backgroundColor: COLORS.darkGray },
  selectedVideo: { alignItems: 'center', paddingVertical: SPACING.xl },
  selectedText: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white, marginTop: SPACING.md },
  selectedSubtext: { fontSize: FONT_SIZES.sm, color: COLORS.gray, marginTop: SPACING.xs, marginBottom: SPACING.md },
  changeButton: { marginTop: SPACING.md },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.md, textAlign: 'center' },
  shotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'center' },
  shotButton: { width: 150, backgroundColor: COLORS.secondary, borderRadius: 20, padding: SPACING.lg, alignItems: 'center', borderWidth: 3, borderColor: COLORS.darkGray },
  shotButtonActive: { backgroundColor: COLORS.accent, transform: [{ scale: 1.05 }] },
  shotText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.white, marginTop: SPACING.sm },
  shotTextActive: { color: COLORS.primary },
  analyzeButton: { marginBottom: SPACING.lg },
  loadingInfo: { alignItems: 'center', marginTop: SPACING.lg, padding: SPACING.xl },
  loadingText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginTop: SPACING.md },
  loadingSubtext: { fontSize: FONT_SIZES.md, color: COLORS.gray, marginTop: SPACING.xs, textAlign: 'center' },
  progressBarContainer: { width: '80%', height: 8, backgroundColor: COLORS.darkGray, borderRadius: 4, overflow: 'hidden', marginTop: SPACING.lg },
  progressBarFill: { height: '100%', backgroundColor: COLORS.accent },
  tipsCard: { backgroundColor: COLORS.secondary },
  tipsTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.md },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.md },
  tipText: { fontSize: FONT_SIZES.md, color: COLORS.lightGray },
});