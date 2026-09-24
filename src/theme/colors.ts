export const colors = {
  background: "#000000",
  surface: "#121212",
  surfaceRaised: "#1A1A1A",
  text: "#F2F2F2",
  textSecondary: "#8C8C8C",
  accent: "#FFC21A",
  accentText: "#000000",
  divider: "#242424",
  priorityLow: "#3DBE6B",
  priorityMedium: "#FF9A3D",
  priorityHigh: "#FF4D4D",
} as const;

export type ColorToken = keyof typeof colors;
