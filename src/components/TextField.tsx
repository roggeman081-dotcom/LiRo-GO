import { useState } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/theme";

type Props = TextInputProps & {
  label: string;
  required?: boolean;
  error?: string;
};

export function TextField({ label, required, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={colors.textSecondary}>
        {label}
        {required ? " *" : ""}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {!!error && (
        <AppText variant="caption" color={colors.priorityHigh}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xxs,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: "Barlow_400Regular",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.priorityHigh,
  },
});
