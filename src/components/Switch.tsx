import { Switch as RNSwitch, SwitchProps } from "react-native";
import { colors } from "@/theme";

export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
      thumbColor={colors.text}
      ios_backgroundColor={colors.surfaceRaised}
      {...props}
    />
  );
}
