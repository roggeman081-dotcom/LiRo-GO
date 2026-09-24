import Svg, { Circle, Polygon } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

/**
 * Placeholder mark: a ring (the "O" in LIRO) with a bolt inside.
 * Swap for the real LIRO SVG when it's available — geometry here
 * (ring stroke + bolt polygon) is what the splash animation draws.
 */
export function LiroLogo({ size = 96, color = "#FFFFFF" }: Props) {
  const stroke = size * 0.08;
  const r = size / 2 - stroke;
  const c = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none" />
      <Polygon
        points={`${c + size * 0.06},${c - size * 0.22} ${c - size * 0.12},${c + size * 0.02} ${c},${c + size * 0.02} ${c - size * 0.06},${c + size * 0.22} ${c + size * 0.12},${c - size * 0.02} ${c},${c - size * 0.02}`}
        fill={color}
      />
    </Svg>
  );
}
