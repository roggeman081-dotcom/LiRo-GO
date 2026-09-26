import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Polygon } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

type Props = {
  size?: number;
  color?: string;
  animate?: boolean;
  ringDurationMs?: number;
  boltDurationMs?: number;
};

export function OpeningLogo({
  size = 120,
  color = "#FFFFFF",
  animate = true,
  ringDurationMs = 900,
  boltDurationMs = 450,
}: Props) {
  const stroke = size * 0.08;
  const r = size / 2 - stroke;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  const ringProgress = useSharedValue(animate ? 0 : 1);
  const boltOpacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    ringProgress.value = withTiming(1, { duration: ringDurationMs, easing: Easing.out(Easing.cubic) });
    boltOpacity.value = withDelay(
      ringDurationMs,
      withTiming(1, { duration: boltDurationMs, easing: Easing.out(Easing.ease) })
    );
    // ringProgress/boltOpacity are stable shared values; only re-run when animation params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, ringDurationMs, boltDurationMs]);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - ringProgress.value),
  }));

  const boltAnimatedProps = useAnimatedProps(() => ({
    opacity: boltOpacity.value,
  }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <AnimatedCircle
        cx={c}
        cy={c}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={ringAnimatedProps}
        rotation={-90}
        origin={`${c}, ${c}`}
      />
      <AnimatedPolygon
        points={`${c + size * 0.06},${c - size * 0.22} ${c - size * 0.12},${c + size * 0.02} ${c},${c + size * 0.02} ${c - size * 0.06},${c + size * 0.22} ${c + size * 0.12},${c - size * 0.02} ${c},${c - size * 0.02}`}
        fill={color}
        animatedProps={boltAnimatedProps}
      />
    </Svg>
  );
}
