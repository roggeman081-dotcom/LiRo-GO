import { Pressable, StyleSheet, View } from "react-native";
import { ArrowRight, Clock, MapPin, Wrench } from "lucide-react-native";
import { AppText } from "./AppText";
import { Card } from "./Card";
import { StatusPill } from "./StatusPill";
import { colors, radius, spacing } from "@/theme";
import { JobWithCustomer, WorkType } from "@/data/types";

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  service: "Service/felsökning",
  new_install: "Nyinstallation",
  measurement: "Mätteknik",
  switchboard: "Elcentral",
  charging: "Laddbox",
  lighting: "Belysning",
};

function formatTimeRange(plannedAt: string | null): string {
  if (!plannedAt) return "Ingen tid vald";
  const start = new Date(plannedAt);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function statusLabel(status: JobWithCustomer["status"]): { label: string; tone: "accent" | "muted" } {
  switch (status) {
    case "ongoing":
      return { label: "Pågår", tone: "accent" };
    case "tomorrow":
      return { label: "Imorgon", tone: "muted" };
    case "done":
      return { label: "Klart", tone: "muted" };
    default:
      return { label: "Senare", tone: "muted" };
  }
}

type Props = {
  job: JobWithCustomer;
  width: number;
  onPress: () => void;
};

export function JobCard({ job, width, onPress }: Props) {
  const status = statusLabel(job.status);

  return (
    <Card style={{ width, gap: spacing.md }}>
      <View style={styles.row}>
        <View style={styles.rowStart}>
          <Clock size={16} color={colors.textSecondary} />
          <AppText variant="label" color={colors.textSecondary}>
            {formatTimeRange(job.plannedAt)}
          </AppText>
        </View>
        <StatusPill label={status.label} tone={status.tone} />
      </View>

      <View style={styles.rowStart}>
        <View style={styles.iconCircle}>
          <Wrench size={20} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.textSecondary}>
            {job.workType ? WORK_TYPE_LABEL[job.workType] : "Uppdrag"}
          </AppText>
          <AppText variant="title">{job.title}</AppText>
        </View>
      </View>

      {!!job.customerAddress && (
        <View style={styles.rowStart}>
          <MapPin size={16} color={colors.textSecondary} />
          <AppText variant="body" color={colors.textSecondary}>
            {job.customerAddress}
          </AppText>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.footer}
      >
        <AppText variant="label" color={colors.textSecondary}>
          Tryck för detaljer
        </AppText>
        <View style={styles.arrowButton}>
          <ArrowRight size={18} color={colors.accentText} />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
