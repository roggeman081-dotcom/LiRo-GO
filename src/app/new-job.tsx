import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { IconButton } from "@/components/IconButton";
import { colors, spacing } from "@/theme";

// Placeholder — replaced by the full "nytt uppdrag" flow (skärm 2–5) in step 3.
export default function NewJobPlaceholder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Stäng" onPress={() => router.back()}>
          <X size={20} color={colors.text} />
        </IconButton>
      </View>
      <View style={styles.body}>
        <AppText variant="title">Nytt uppdrag</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Flödet för att skapa uppdrag byggs i nästa steg.
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
