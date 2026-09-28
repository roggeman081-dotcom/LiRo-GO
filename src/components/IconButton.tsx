import { Pressable, PressableProps, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, minTouchSize } from "@/theme";

type Props = PressableProps & {
  children: React.ReactNode;
  size?: number;
  variant?: "filled" | "outline" | "plain";
};

export function IconButton({ children, size = minTouchSize, variant = "outline", style, onPress, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === "filled" && styles.filled,
        variant === "outline" && styles.outline,
        pressed && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  filled: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
});
