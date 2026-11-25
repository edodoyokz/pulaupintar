import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { colors, fonts, radius, spacing } from "./theme";

type BigButtonProps = {
  label: string;
  onPress: () => void;
  color?: string;
  shadow?: string;
  disabled?: boolean;
};

// The chunky call-to-action used on every screen: big, with a solid "press" shadow.
export const BigButton = ({ label, onPress, color = colors.orange, shadow = colors.orangeDark, disabled }: BigButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    style={[styles.bigButton, { backgroundColor: color, borderBottomColor: shadow }, disabled && styles.disabled]}
  >
    <Text style={styles.bigButtonText}>{label}</Text>
  </Pressable>
);

export const CircleButton = ({
  label,
  onPress,
  children,
  style,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    style={[styles.circle, style]}
  >
    {children}
  </Pressable>
);

export const BackButton = ({ icon = "back" as "back" | "close" }) => (
  <CircleButton label="Kembali" onPress={() => router.back()}>
    <Icon name={icon} size={20} color={colors.inkBody} />
  </CircleButton>
);

export const ProgressDashes = ({ done, total, color }: { done: number; total: number; color: string }) => (
  <View style={styles.dashes} accessibilityLabel={`${done} dari ${total}`}>
    {Array.from({ length: total }, (_, index) => (
      <View key={index} style={[styles.dash, { backgroundColor: index < done ? color : colors.trackOrange }]} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  bigButton: {
    minHeight: 64,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  bigButtonText: { fontFamily: fonts.display, fontSize: 23, color: colors.white },
  disabled: { opacity: 0.4 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dashes: { flexDirection: "row", gap: spacing.sm },
  dash: { width: 30, height: 10, borderRadius: 5 },
});
