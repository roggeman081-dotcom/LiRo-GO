import { Pressable, PressableProps, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "./AppText";
import { colors, minTouchSize, radius, spacing } from "@/theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function Button({ label, variant = "primary", disabled, icon, style, onPress, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {icon}
        <AppText
          variant="bodyBold"
          color={variant === "primary" ? colors.accentText : colors.text}
          style={disabled ? { color: colors.textSecondary } : undefined}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
