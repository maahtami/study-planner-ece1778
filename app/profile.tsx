import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Bell, Palette, Flame, Trophy, Clock } from "lucide-react-native";
import { getSessions, computeStreak } from "../lib/sessions";
import { useTheme } from "../lib/ThemeContext"; // ✅ global theme context
import { TabBar } from "../components/mid-fi/TabBar";

// Notifications (optional dependency)
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

// helper functions
function isoToDateAtToday(isoHM: string) {
  const [h, m] = isoHM.split(":").map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(h || 9, m || 0, 0, 0);
  return d;
}
function dateToISOHM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function Profile() {
  const { theme, settings, setSettings, toggleTheme } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [streak, setStreak] = useState(0);

  const badges = useMemo(
    () => [
      { id: 1, name: "Beginner", unlocked: streak >= 1 },
      { id: 2, name: "Consistent", unlocked: streak >= 3 },
      { id: 3, name: "Expert", unlocked: streak >= 7 },
    ],
    [streak]
  );

  // load sessions for streak
  useEffect(() => {
    (async () => {
      const sessions = await getSessions();
      setStreak(computeStreak(sessions));
    })();
  }, []);

  if (!settings) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: theme.text }}>Loading…</Text>
      </View>
    );
  }

  const reminderDate = isoToDateAtToday(settings.reminderISOTime);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
      </View>

      <ScrollView style={styles.body}>
        {/* Notifications */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Bell size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Notifications
            </Text>
            <View style={{ flex: 1 }} />
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) =>
                setSettings((prev) =>
                  prev ? { ...prev, notificationsEnabled: v } : prev
                )
              }
              trackColor={{ true: theme.primary, false: "#D1D5DB" }}
              thumbColor={settings.notificationsEnabled ? "#fff" : "#f4f4f5"}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Clock size={16} color={theme.secondaryText} />
              <Text style={[styles.labelRow, { color: theme.text }]}>
                Reminder time
              </Text>
            </View>

            <TouchableOpacity
              disabled={!settings.notificationsEnabled}
              onPress={() => setShowTimePicker(true)}
              style={[
                styles.pill,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  opacity: settings.notificationsEnabled ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: theme.text }]}>
                {reminderDate.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={reminderDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, d) => {
                setShowTimePicker(false);
                if (d) {
                  const iso = dateToISOHM(d);
                  setSettings((prev) =>
                    prev ? { ...prev, reminderISOTime: iso } : prev
                  );
                }
              }}
            />
          )}
        </View>

        {/* Theme */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Palette size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Theme</Text>
          </View>

          <View style={styles.segmentRow}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    settings.theme === "light"
                      ? theme.primary
                      : theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      settings.theme === "light" ? "#fff" : theme.text,
                    fontWeight:
                      settings.theme === "light" ? "700" : "500",
                  },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    settings.theme === "dark"
                      ? theme.primary
                      : theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      settings.theme === "dark" ? "#fff" : theme.text,
                    fontWeight:
                      settings.theme === "dark" ? "700" : "500",
                  },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streaks & Badges */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Trophy size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Streaks & Badges
            </Text>
          </View>

          <View style={styles.streakBanner}>
            <View>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>
                {streak} {streak === 1 ? "day" : "days"} 🔥
              </Text>
            </View>
            <View style={styles.streakIcon}>
              <Flame size={24} color="#fff" />
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Earned Badges
          </Text>
          <View style={styles.badgesRow}>
            {badges.map((b) => (
              <View key={b.id} style={styles.badgeItem}>
                <View
                  style={[
                    styles.badgeCircle,
                    b.unlocked
                      ? {
                          borderColor: theme.primary,
                          backgroundColor: "#EEF2FF",
                        }
                      : {
                          borderStyle: "dashed",
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          opacity: 0.5,
                        },
                  ]}
                >
                  <Trophy
                    size={26}
                    color={b.unlocked ? theme.primary : theme.secondaryText}
                  />
                </View>
                <Text
                  style={[
                    styles.badgeName,
                    { color: b.unlocked ? theme.text : theme.secondaryText },
                  ]}
                >
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ✅ Fixed: no onTabChange needed */}
      <TabBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerCard: {
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  body: { padding: 16 },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  labelRow: { fontSize: 16 },
  pill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pillText: { fontSize: 14 },
  segmentRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentText: { fontSize: 16 },
  streakBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FEF3C7",
  },
  streakLabel: { fontSize: 14, color: "#92400E", fontWeight: "600" },
  streakValue: { fontSize: 28, fontWeight: "800", color: "#78350F", marginTop: 6 },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { fontSize: 16, fontWeight: "700", marginTop: 10 },
  badgesRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 12 },
  badgeItem: { alignItems: "center" },
  badgeCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeName: { fontSize: 12, fontWeight: "600" },
});