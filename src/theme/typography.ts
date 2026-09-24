import { TextStyle } from "react-native";

export const fontFamily = {
  thin: "Barlow_100Thin",
  light: "Barlow_300Light",
  regular: "Barlow_400Regular",
  medium: "Barlow_500Medium",
  semiBold: "Barlow_600SemiBold",
  bold: "Barlow_700Bold",
} as const;

// Thin weights for big numbers (time), semibold/bold for headings, per design spec.
export const typography = {
  displayHuge: {
    fontFamily: fontFamily.thin,
    fontSize: 64,
    lineHeight: 68,
  } as TextStyle,
  displayLarge: {
    fontFamily: fontFamily.light,
    fontSize: 40,
    lineHeight: 44,
  } as TextStyle,
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 30,
  } as TextStyle,
  heading: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
  } as TextStyle,
  bodyBold: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
  spacedLabel: {
    fontFamily: fontFamily.light,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 4,
  } as TextStyle,
} as const;
