import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, { runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText } from "@/components/AppText";
import { OpeningLogo } from "@/components/OpeningLogo";
import { colors, spacing } from "@/theme";

const RING_DURATION_MS = 900;
const BOLT_DURATION_MS = 450;
const FADE_OUT_DURATION_MS = 250;
const HOLD_AFTER_BOLT_MS = 150;

type Props = {
  onFinish: () => void;
};

export function OpeningScreen({ onFinish }: Props) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const opacity = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        if (!cancelled) setReduceMotion(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    const totalMs = reduceMotion ? 0 : RING_DURATION_MS + BOLT_DURATION_MS + HOLD_AFTER_BOLT_MS;
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_OUT_DURATION_MS }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, totalMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  if (reduceMotion === null) {
    return <View style={styles.container} />;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.center}>
        <OpeningLogo
          size={120}
          animate={!reduceMotion}
          ringDurationMs={RING_DURATION_MS}
          boltDurationMs={BOLT_DURATION_MS}
        />
        <AppText variant="spacedLabel" color={colors.text} style={styles.go}>
          GO
        </AppText>
      </View>
      <AppText variant="caption" color={colors.textSecondary} style={styles.footer}>
        LiRo Elteknik AB
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: spacing.md,
  },
  go: {
    letterSpacing: 6,
  },
  footer: {
    position: "absolute",
    bottom: spacing.xl,
  },
});
