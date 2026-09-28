import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Pause, Play } from "lucide-react-native";
import { AppText } from "./AppText";
import { colors } from "@/theme";

type Props = {
  size?: number;
  progress: number; // 0..1
  hours: string;
  minutes: string;
  seconds: string;
  isRunning: boolean;
  onToggle: () => void;
};

export function TimeRing({ size = 260, progress, hours, minutes, seconds, isRunning, onToggle }: Props) {
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isRunning ? "Pausa tidräkning" : "Starta tidräkning"}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onToggle();
      }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={styles.timeRow}>
          <AppText variant="displayHuge">{hours}:{minutes}</AppText>
          <AppText variant="displayLarge" color={colors.textSecondary}>
            :{seconds}
          </AppText>
        </View>
        <View style={styles.toggle}>
          {isRunning ? (
            <Pause size={16} color={colors.accentText} fill={colors.accentText} />
          ) : (
            <Play size={16} color={colors.accentText} fill={colors.accentText} />
          )}
          <AppText variant="label" color={colors.accentText}>
            {isRunning ? "Pausa" : "Starta"}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 44,
  },
});
