import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/theme";

type Props = {
  label: string;
  tone?: "accent" | "muted";
};

export function StatusPill({ label, tone = "muted" }: Props) {
  return (
    <View style={[styles.pill, tone === "accent" && styles.accent]}>
      <AppText variant="label" color={tone === "accent" ? colors.accentText : colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  accent: {
    backgroundColor: colors.accent,
  },
});
