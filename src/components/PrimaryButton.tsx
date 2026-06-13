import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export const PrimaryButton = ({ label, onPress, disabled }: Props) => (
  <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
