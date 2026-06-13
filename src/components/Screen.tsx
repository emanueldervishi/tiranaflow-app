import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export const Screen = ({ children, scroll = true, contentStyle }: Props) => {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>{content}</SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
});
