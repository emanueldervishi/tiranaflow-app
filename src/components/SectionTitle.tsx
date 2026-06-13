import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  title: string;
  subtitle?: string;
};

export const SectionTitle = ({ title, subtitle }: Props) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
});
