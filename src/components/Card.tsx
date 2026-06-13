import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";

export const Card = ({ children }: PropsWithChildren) => <View style={styles.card}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
});
