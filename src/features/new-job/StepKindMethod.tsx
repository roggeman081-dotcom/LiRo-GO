import { StyleSheet, View } from "react-native";
import { Camera, Keyboard, Mic } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { SelectTile } from "@/components/SelectTile";
import { colors, spacing } from "@/theme";
import { JobKind } from "@/data/types";
import { CreationMethod, NewJobDraft } from "./types";

type Props = {
  draft: NewJobDraft;
  onSelectKind: (kind: JobKind) => void;
  onSelectMethod: (method: CreationMethod) => void;
};

export function StepKindMethod({ draft, onSelectKind, onSelectMethod }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Vad gäller det?
        </AppText>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SelectTile
              label="Kundjobb"
              selected={draft.kind === "customer_job"}
              onPress={() => onSelectKind("customer_job")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectTile
              label="Projekt"
              selected={draft.kind === "project"}
              onPress={() => onSelectKind("project")}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Hur vill du skapa uppdraget?
        </AppText>

        <View style={{ gap: spacing.sm }}>
          <SelectTile
            label="Skapa manuellt"
            layout="row"
            selected={draft.method === "manual"}
            disabled={!draft.kind}
            icon={<Keyboard size={22} color={colors.text} />}
            onPress={() => onSelectMethod("manual")}
            style={styles.methodTile}
          />
          <SelectTile
            label="Fotografera"
            subLabel="Kommer snart"
            layout="row"
            selected={false}
            disabled
            icon={<Camera size={22} color={colors.textSecondary} />}
            style={styles.methodTile}
          />
          <SelectTile
            label="Diktera med röst"
            subLabel="Kommer snart"
            layout="row"
            selected={false}
            disabled
            icon={<Mic size={22} color={colors.textSecondary} />}
            style={styles.methodTile}
          />
        </View>
      </View>

      <Card style={styles.tip}>
        <AppText variant="caption" color={colors.textSecondary}>
          Tips: Du kan alltid ändra uppgifterna senare inne i uppdraget.
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  methodTile: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tip: {
    marginTop: spacing.lg,
  },
});
