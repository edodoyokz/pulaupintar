import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "./theme";

type TutorAvatarProps = { speaking: boolean; listening: boolean };

// Placeholder for Kak Pinta until the character art is ready.
export const TutorAvatar = ({ speaking, listening }: TutorAvatarProps) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (speaking) {
      scale.value = withRepeat(withTiming(1.08, { duration: 260 }), -1, true);
    } else {
      cancelAnimation(scale);
      scale.value = withSpring(listening ? 1.04 : 1);
    }
  }, [speaking, listening, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.avatar, listening && styles.listening, animatedStyle]}>
      <Text style={styles.face}>🦜</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 150,
    height: 150,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.accent,
  },
  listening: { borderColor: colors.listening },
  face: { fontSize: 84 },
});
