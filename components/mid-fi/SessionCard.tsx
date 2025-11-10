import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Clock } from "lucide-react-native";
import { router } from "expo-router";

type Props = {
  id: string;
  subject: string;
  duration: number;
  notes?: string;
};

export function SessionCard({ id, subject, duration, notes }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/session-details", params: { id } })}
      style={styles.card}
    >
      <Text style={styles.title}>{subject}</Text>
      <View style={styles.metaRow}>
        <Clock size={16} color="#6B7280" />
        <Text style={styles.metaText}>{duration} mins</Text>
      </View>
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 12
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  metaText: { color: "#6B7280", fontSize: 14 },
  notes: { color: "#374151", fontSize: 15 }
});