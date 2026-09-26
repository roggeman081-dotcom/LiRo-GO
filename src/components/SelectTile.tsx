import { Pressable, PressableProps, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "./AppText";
import { colors, minTouchSize, radius, spacing } from "@/theme";

type Props = PressableProps & {
  label: string;
  selected: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  subLabel?: string;
  layout?: "column" | "row";
};

export function SelectTile({
  label,
  selected,
  icon,
  disabled,
  subLabel,
  layout = "column",
  style,
  onPress,
  ...rest
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        if (disabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      <View style={[styles.content, layout === "row" && styles.contentRow]}>
        {icon}
        <View style={layout === "row" ? styles.rowText : undefined}>
          <AppText
            variant="label"
            color={disabled ? colors.textSecondary : colors.text}
            style={layout === "column" && styles.label}
          >
            {label}
          </AppText>
          {!!subLabel && (
            <AppText variant="caption" color={colors.textSecondary}>
              {subLabel}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: minTouchSize,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  rowText: {
    flex: 1,
  },
  label: {
    textAlign: "center",
  },
  selected: {
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
