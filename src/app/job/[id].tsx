import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { IconButton } from "@/components/IconButton";
import { colors, spacing } from "@/theme";

// Placeholder job-detail screen — full detail view is a later step.
export default function JobDetailPlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Tillbaka" onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </IconButton>
      </View>
      <View style={styles.body}>
        <AppText variant="title">Uppdrag</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Detaljvy för uppdrag {id} byggs i ett senare steg.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
});
