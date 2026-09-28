import { StyleSheet, View } from "react-native";
import { ChevronLeft, X } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { IconButton } from "@/components/IconButton";
import { StepIndicator } from "@/components/StepIndicator";
import { colors, spacing } from "@/theme";

type Props = {
  title: string;
  onBack: () => void;
  isFirstStep: boolean;
  step?: number; // 0-indexed, only for steps 1-3 (skärm 3-5)
  totalSteps?: number;
};

export function WizardHeader({ title, onBack, isFirstStep, step, totalSteps }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <IconButton accessibilityLabel={isFirstStep ? "Stäng" : "Tillbaka"} onPress={onBack}>
          {isFirstStep ? (
            <X size={20} color={colors.text} />
          ) : (
            <ChevronLeft size={20} color={colors.text} />
          )}
        </IconButton>
        <AppText variant="heading">{title}</AppText>
        <View style={{ width: 44 }} />
      </View>
      {typeof step === "number" && totalSteps && (
        <View style={styles.indicator}>
          <StepIndicator total={totalSteps} current={step} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  indicator: {
    paddingHorizontal: spacing.xxs,
  },
});
