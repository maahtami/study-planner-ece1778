import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Clock } from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "../../lib/ThemeContext";

type Props = {
  id: string;
  subject: string;
  duration: number;
  notes?: string;
  date?: string | null;
};

function formatSessionDate(date?: string | null) {
  if (!date) return null;
  const formatted = new Date(date);
  if (Number.isNaN(formatted.getTime())) return null;
  return formatted.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function SessionCard({ id, subject, duration, notes, date }: Props) {
  const { theme } = useTheme();
  const scheduledTime = formatSessionDate(date);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/session-details", params: { id } })}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>{subject}</Text>
      <View style={styles.metaRow}>
        <Clock size={16} color={theme.secondaryText} />
        <Text style={[styles.metaText, { color: theme.secondaryText }]}>
          {duration} mins{scheduledTime ? ` · ${scheduledTime}` : ""}
        </Text>
      </View>
      {notes ? <Text style={[styles.notes, { color: theme.text }]}>{notes}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  metaText: { fontSize: 14 },
  notes: { fontSize: 15 },
});