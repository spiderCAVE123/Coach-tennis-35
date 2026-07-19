import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

interface XPTokenProps {
  amount: number;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const XPToken: React.FC<XPTokenProps> = ({
  amount,
  animated = true,
  size = 'medium',
  style,
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    if (animated) {
      // Entrance animation
      scale.value = withSpring(1, { damping: 8, stiffness: 100 });
      
      // Continuous rotation
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );

      // Glow pulse
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.5, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [animated]);

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateY: `${rotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const sizeConfig = {
    small: {
      container: 48,
      icon: 20,
      fontSize: FONT_SIZES.sm,
    },
    medium: {
      container: 72,
      icon: 28,
      fontSize: FONT_SIZES.md,
    },
    large: {
      container: 100,
      icon: 40,
      fontSize: FONT_SIZES.lg,
    },
  };

  const config = sizeConfig[size];

  return (
    <Animated.View style={[styles.container, coinAnimatedStyle, style]}>
      <Animated.View
        style={[
          styles.glow,
          glowAnimatedStyle,
          {
            width: config.container + 20,
            height: config.container + 20,
            borderRadius: (config.container + 20) / 2,
          },
        ]}
      />
      <View
        style={[
          styles.coin,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
          },
        ]}
      >
        <View
          style={[
            styles.innerCoin,
            {
              width: config.container - 12,
              height: config.container - 12,
              borderRadius: (config.container - 12) / 2,
            },
          ]}
        >
          <Ionicons name="flash" size={config.icon} color={COLORS.primary} />
          <Text style={[styles.amount, { fontSize: config.fontSize }]}>
            {amount > 0 ? `+${amount}` : amount}
          </Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  coin: {
    backgroundColor: '#FFD700', // Gold outer
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFA500', // Orange border for depth
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  innerCoin: {
    backgroundColor: '#FFC107', // Slightly darker gold
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  amount: {
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
});
