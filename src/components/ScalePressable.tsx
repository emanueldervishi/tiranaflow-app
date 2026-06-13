import type { PropsWithChildren } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Props = PropsWithChildren<Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}>;

export const ScalePressable = ({ children, disabled, onPressIn, onPressOut, scaleTo = 0.97, style, ...props }: Props) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 420 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 420 });
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
});
