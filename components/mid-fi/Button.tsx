import React from "react";
import { Text, TouchableOpacity, View, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: "primary" | "secondary";
};

export function Button({ children, onPress, icon, style, textStyle, variant = "primary" }: Props) {
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        style
      ]}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={[styles.label, isPrimary ? styles.primaryText : styles.secondaryText, textStyle]}>
        {children as string}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#2563EB" },
  secondary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  label: { fontSize: 16, fontWeight: "600" },
  primaryText: { color: "#FFFFFF" },
  secondaryText: { color: "#111827" },
});