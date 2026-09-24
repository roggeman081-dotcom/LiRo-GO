import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

export type Priority = "normal" | "high" | "urgent";

const priorityColor: Record<Priority, string> = {
  normal: colors.priorityLow,
  high: colors.priorityMedium,
  urgent: colors.priorityHigh,
};

export function PriorityDot({ priority }: { priority: Priority }) {
  return <View style={[styles.dot, { backgroundColor: priorityColor[priority] }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
