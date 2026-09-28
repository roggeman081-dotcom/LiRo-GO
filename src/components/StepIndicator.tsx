import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/theme";

type Props = {
  total: number;
  current: number; // 0-indexed
};

export function StepIndicator({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dash, i === current ? styles.active : styles.inactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dash: {
    height: 4,
    flex: 1,
    borderRadius: radius.pill,
  },
  active: {
    backgroundColor: colors.accent,
  },
  inactive: {
    backgroundColor: colors.surfaceRaised,
  },
});
