import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Mic, Wrench, Zap, Gauge, PanelsTopLeft, BatteryCharging, Lightbulb } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { IconButton } from "@/components/IconButton";
import { SelectTile } from "@/components/SelectTile";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/theme";
import { Priority, WorkType } from "@/data/types";
import { NewJobDraft } from "./types";

const WORK_TYPES: { value: WorkType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { value: "service", label: "Service/felsökning", icon: Wrench },
  { value: "new_install", label: "Nyinstallation", icon: Zap },
  { value: "measurement", label: "Mätteknik", icon: Gauge },
  { value: "switchboard", label: "Elcentral", icon: PanelsTopLeft },
  { value: "charging", label: "Laddbox", icon: BatteryCharging },
  { value: "lighting", label: "Belysning", icon: Lightbulb },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "Hög" },
  { value: "urgent", label: "Akut" },
];

type Props = {
  draft: NewJobDraft;
  onChange: (patch: Partial<NewJobDraft>) => void;
};

function formatDateTime(date: Date | null): string {
  if (!date) return "Ingen tid vald";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${day}/${month} ${time}`;
}

export function StepDetails({ draft, onChange }: Props) {
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  const openPicker = (mode: "date" | "time") => setPickerMode(mode);

  const handlePickerChange = (_: unknown, selected?: Date) => {
    const wasAndroid = Platform.OS === "android";
    if (wasAndroid) setPickerMode(null);
    if (!selected) return;

    const base = draft.plannedAt ?? new Date();
    const next = new Date(base);
    if (pickerMode === "date") {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes());
    }
    onChange({ plannedAt: next });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        label="Namn på uppdrag"
        required
        value={draft.title}
        onChangeText={(title) => onChange({ title })}
        placeholder="T.ex. Felsökning elcentral"
      />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.textSecondary}>
          Typ av arbete
        </AppText>
        <View style={styles.grid}>
          {WORK_TYPES.map(({ value, label, icon: Icon }) => (
            <View key={value} style={styles.gridItem}>
              <SelectTile
                label={label}
                selected={draft.workType === value}
                icon={<Icon size={20} color={draft.workType === value ? colors.accent : colors.text} />}
                onPress={() => onChange({ workType: value })}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.xxs }}>
        <AppText variant="label" color={colors.textSecondary}>
          Beskrivning
        </AppText>
        <View style={styles.descriptionWrapper}>
          <TextField
            label=""
            value={draft.description}
            onChangeText={(description) => onChange({ description })}
            placeholder="Kort beskrivning av uppdraget…"
            multiline
            numberOfLines={3}
            style={styles.descriptionInput}
          />
          <View style={styles.micButton}>
            <IconButton accessibilityLabel="Diktera beskrivning" size={36}>
              <Mic size={16} color={colors.text} />
            </IconButton>
          </View>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.textSecondary}>
          Planerad tid
        </AppText>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SelectTile
              label={draft.plannedAt ? formatDateTime(draft.plannedAt).split(" ")[0] : "Välj datum"}
              layout="row"
              selected={false}
              icon={<Calendar size={18} color={colors.text} />}
              onPress={() => openPicker("date")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectTile
              label={draft.plannedAt ? formatDateTime(draft.plannedAt).split(" ")[1] : "Välj tid"}
              layout="row"
              selected={false}
              onPress={() => openPicker("time")}
            />
          </View>
        </View>
        {pickerMode && (
          <DateTimePicker
            value={draft.plannedAt ?? new Date()}
            mode={pickerMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handlePickerChange}
            themeVariant="dark"
          />
        )}
        {Platform.OS === "ios" && pickerMode && (
          <AppText variant="label" color={colors.accent} onPress={() => setPickerMode(null)} style={styles.doneLink}>
            Klar
          </AppText>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.textSecondary}>
          Prioritet
        </AppText>
        <View style={styles.row}>
          {PRIORITIES.map((p) => (
            <View key={p.value} style={{ flex: 1 }}>
              <SelectTile
                label={p.label}
                selected={draft.priority === p.value}
                onPress={() => onChange({ priority: p.value })}
              />
            </View>
          ))}
        </View>
      </View>
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
    gap: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "31%",
  },
  descriptionWrapper: {
    position: "relative",
  },
  descriptionInput: {
    minHeight: 88,
    textAlignVertical: "top",
    paddingTop: spacing.sm,
    paddingRight: spacing.xl + spacing.md,
  },
  micButton: {
    position: "absolute",
    right: spacing.xs,
    bottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  doneLink: {
    alignSelf: "flex-end",
  },
});
