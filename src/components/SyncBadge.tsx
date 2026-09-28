import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing } from "@/theme";
import { SyncState } from "@/sync/useSyncStatus";

export function SyncBadge({ state }: { state: SyncState }) {
  const label = state === "syncing" ? "Synkar…" : state === "synced" ? "Synkad" : "Offline, sparas lokalt";
  const dotColor = state === "offline" ? colors.textSecondary : colors.priorityLow;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
