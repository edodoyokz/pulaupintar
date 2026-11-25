import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { colors, fonts, radius, spacing } from "./theme";

export const webCursor = (disabled?: boolean): StyleProp<ViewStyle> =>
  Platform.OS === "web" ? ({ cursor: disabled ? "not-allowed" : "pointer" } as ViewStyle) : undefined;

type BigButtonProps = {
  label: string;
  onPress: () => void;
  color?: string;
  shadow?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  variant?: "primary" | "secondary";
};

// The chunky call-to-action used on every screen: big, with a solid "press" shadow.
export const BigButton = ({
  label,
  onPress,
  color = colors.orange,
  shadow = colors.orangeDark,
  disabled = false,
  loading = false,
  loadingLabel,
  variant = "primary",
}: BigButtonProps) => {
  const isDisabled = disabled || loading;
  const isSecondary = variant === "secondary";
  const textColor = isSecondary ? colors.ink : colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.bigButton,
        isSecondary
          ? styles.bigButtonSecondary
          : { backgroundColor: color, borderBottomColor: shadow },
        webCursor(isDisabled),
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.bigButtonPressed,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={textColor} size="small" />
          <Text style={[styles.bigButtonText, { color: textColor }]}>{loadingLabel ?? label}</Text>
        </View>
      ) : (
        <Text style={[styles.bigButtonText, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

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
    style={({ pressed }) => [
      styles.circle,
      style,
      webCursor(disabled),
      pressed && !disabled && styles.circlePressed,
    ]}
  >
    {children}
  </Pressable>
);

export const BackButton = ({
  icon = "back",
  onPress,
  label,
}: {
  icon?: "back" | "close";
  onPress?: () => void;
  label?: string;
}) => (
  <CircleButton
    label={label ?? (icon === "close" ? "Tutup pelajaran" : "Kembali")}
    onPress={onPress ?? (() => router.back())}
  >
    <Icon name={icon} size={20} color={colors.inkBody} />
  </CircleButton>
);

export const ProgressDashes = ({ done, total, color }: { done: number; total: number; color: string }) => (
  <View style={styles.dashes} accessibilityLabel={`${done} dari ${total}`}>
    {Array.from({ length: total }, (_, index) => {
      const filled = index < done;
      return (
        <View
          key={index}
          style={[
            styles.dash,
            filled
              ? { backgroundColor: color }
              : { backgroundColor: colors.trackOrange, borderWidth: 1.5, borderColor: colors.trackBorder },
          ]}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  bigButton: {
    minHeight: 60,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  bigButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.borderControl,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderControl,
  },
  bigButtonPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.94,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bigButtonText: { fontFamily: fonts.display, fontSize: 22, color: colors.white },
  disabled: { opacity: 0.45 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  circlePressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.88,
  },
  dashes: { flex: 1, maxWidth: 220, marginHorizontal: 12, flexDirection: "row", gap: 6 },
  dash: { flex: 1, height: 10, borderRadius: 5 },
});
