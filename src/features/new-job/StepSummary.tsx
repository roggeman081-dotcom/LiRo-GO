import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { PriorityDot } from "@/components/PriorityDot";
import { colors, spacing } from "@/theme";
import { NewJobDraft, customerAddressLabel, customerLabel } from "./types";

const WORK_TYPE_LABEL: Record<string, string> = {
  service: "Service/felsökning",
  new_install: "Nyinstallation",
  measurement: "Mätteknik",
  switchboard: "Elcentral",
  charging: "Laddbox",
  lighting: "Belysning",
};

const PRIORITY_LABEL: Record<string, string> = {
  normal: "Normal",
  high: "Hög",
  urgent: "Akut",
};

function formatDateTime(date: Date | null): string {
  if (!date) return "Ingen tid vald";
  const days = ["sön", "mån", "tis", "ons", "tors", "fre", "lör"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${days[date.getDay()]} ${day}/${month} ${time}`;
}

type Row = { label: string; value: string };

type Props = {
  draft: NewJobDraft;
  onEditCustomer: () => void;
  onEditDetails: () => void;
};

function SummarySection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Row[];
  onEdit: () => void;
}) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="label" color={colors.accent} onPress={onEdit}>
          Ändra
        </AppText>
      </View>
      <View style={{ gap: spacing.xs }}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText variant="body" color={colors.textSecondary}>
              {row.label}
            </AppText>
            <AppText variant="body" style={styles.value}>
              {row.value || "—"}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function StepSummary({ draft, onEditCustomer, onEditDetails }: Props) {
  const customerRows: Row[] = [
    { label: "Namn", value: customerLabel(draft) },
    { label: "Adress", value: customerAddressLabel(draft) },
  ];
  if (!draft.existingCustomer && draft.newCustomer.phone) {
    customerRows.push({ label: "Telefon", value: draft.newCustomer.phone });
  }

  const jobRows: Row[] = [
    { label: "Uppdrag", value: draft.title },
    { label: "Typ", value: draft.workType ? WORK_TYPE_LABEL[draft.workType] : "" },
    { label: "Planerad tid", value: formatDateTime(draft.plannedAt) },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SummarySection title="Kunduppgifter" rows={customerRows} onEdit={onEditCustomer} />
      <SummarySection title="Arbetsinfo" rows={jobRows} onEdit={onEditDetails} />

      <Card style={styles.priorityCard}>
        <View style={styles.row}>
          <AppText variant="body" color={colors.textSecondary}>
            Prioritet
          </AppText>
          <View style={styles.priorityValue}>
            <PriorityDot priority={draft.priority} />
            <AppText variant="body">{PRIORITY_LABEL[draft.priority]}</AppText>
          </View>
        </View>
      </Card>

      {!!draft.description && (
        <Card style={{ gap: spacing.xxs }}>
          <AppText variant="label" color={colors.textSecondary}>
            Beskrivning
          </AppText>
          <AppText variant="body">{draft.description}</AppText>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
  },
  priorityCard: {},
  priorityValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
