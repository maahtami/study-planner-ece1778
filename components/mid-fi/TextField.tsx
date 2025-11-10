import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

interface TextFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  error?: string;
  onChangeText?: (text: string) => void;
}

export function TextField({
  label,
  placeholder,
  value,
  required,
  multiline,
  keyboardType = "default",
  error,
  onChangeText,
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: "#DC2626" }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.errorBorder,
        ]}
        placeholder={placeholder}
        value={value}
        multiline={multiline}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#9CA3AF"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
  errorBorder: {
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
});