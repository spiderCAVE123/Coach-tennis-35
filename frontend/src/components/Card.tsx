import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  animated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, animated = true }) => {
  if (animated) {
    return (
      <Animated.View
        entering={FadeIn.duration(400).springify()}
        style={[styles.card, style]}
      >
        {children}
      </Animated.View>
    );
  }
  
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.1)',
  },
});