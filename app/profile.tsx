// app/profile.tsx
import React, { useCallback, useMemo, useState } from "react";
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
import { useTheme } from "../lib/ThemeContext";
import { TabBar } from "../components/mid-fi/TabBar";
import { useGlobalStyles } from "../styles/globalStyles";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useSessions } from "../lib/SessionsContext";
import {
  ensureNotificationPermissions,
  scheduleDailyReminder,
  cancelReminder,
} from "../lib/notifications";
import { saveSettings } from "../lib/settings";

// helper functions
function isoToDateAtToday(isoHM: string) {
  const [h, m] = isoHM.split(":").map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(h || 9, m || 0, 0);
  return d;
}
function dateToISOHM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function Profile() {
  const { theme, settings, setSettings, toggleTheme } = useTheme();
  const globalStyles = useGlobalStyles();
  const { gamification } = useSessions(); // ✅ use gamification state

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [draftReminderDate, setDraftReminderDate] = useState<Date | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);

  const streak = gamification?.streak ?? 0;

  const badges = useMemo(() => {
    const builtIn = [
      { id: 1, name: "Beginner", unlocked: streak >= 1 },
      { id: 2, name: "Consistent", unlocked: streak >= 3 },
      { id: 3, name: "Expert", unlocked: streak >= 7 },
    ];
    /*const extraBadges = (gamification?.badges ?? []).map((name, index) => ({
      id: 100 + index,
      name,
      unlocked: true,
    }));*/
    return [...builtIn];
  }, [streak, gamification]);

  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (!settings) return;

      setNotificationBusy(true);
      try {
        if (enabled) {
          const granted = await ensureNotificationPermissions();
          if (!granted) {
            Alert.alert(
              "Permission needed",
              "Enable notifications in your device settings to receive reminders."
            );
            return;
          }
          const scheduledId = await scheduleDailyReminder(
            settings.reminderISOTime,
            settings.scheduledNotificationId
          );
          if (!scheduledId) {
            Alert.alert("Error", "Could not schedule the reminder. Please try again.");
            return;
          }
          const updated = {
            ...settings,
            notificationsEnabled: true,
            scheduledNotificationId: scheduledId,
          };
          setSettings(updated);
          await saveSettings(updated);
        } else {
          await cancelReminder(settings.scheduledNotificationId);
          const updated = {
            ...settings,
            notificationsEnabled: false,
            scheduledNotificationId: null,
          };
          setSettings(updated);
          await saveSettings(updated);
        }
      } catch (error) {
        console.error("Failed to toggle reminders:", error);
        Alert.alert("Error", "Unable to update reminder settings right now.");
      } finally {
        setNotificationBusy(false);
      }
    },
    [settings, setSettings]
  );

  const applyReminderTime = useCallback(
    async (selected: Date) => {
      if (!settings) return;

      const iso = dateToISOHM(selected);

      setNotificationBusy(true);
      try {
        let scheduledId = settings.scheduledNotificationId ?? null;
        if (settings.notificationsEnabled) {
          scheduledId = await scheduleDailyReminder(iso, settings.scheduledNotificationId);
          if (!scheduledId) {
            Alert.alert("Error", "Could not update the reminder time. Please try again.");
            return;
          }
        }
        const updated = { ...settings, reminderISOTime: iso, scheduledNotificationId: scheduledId };
        setSettings(updated);
        await saveSettings(updated);
      } catch (error) {
        console.error("Failed to reschedule reminder:", error);
        Alert.alert("Error", "Unable to update the reminder time right now.");
      } finally {
        setNotificationBusy(false);
      }
    },
    [settings, setSettings]
  );

  if (!settings) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={globalStyles.container}>
          <View style={styles.loadingContainer}>
            <Text style={{ color: theme.text }}>Loading…</Text>
          </View>
          <TabBar activeTab="profile" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const reminderDate = isoToDateAtToday(settings.reminderISOTime);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={globalStyles.container}>
        {/* Header */}
        <View
          style={[
            globalStyles.headerCard,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[globalStyles.headerText]}>Profile</Text>
        </View>

        <ScrollView style={styles.body}>
          {/* Notifications */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Bell size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Notifications</Text>
              <View style={{ flex: 1 }} />
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(v) => void handleNotificationToggle(v)}
                disabled={notificationBusy}
                trackColor={{ true: theme.primary, false: "#D1D5DB" }}
                thumbColor={settings.notificationsEnabled ? "#fff" : "#f4f4f5"}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Clock size={16} color={theme.secondaryText} />
                <Text style={[styles.labelRow, { color: theme.text }]}>Reminder time</Text>
              </View>

              <TouchableOpacity
                disabled={!settings.notificationsEnabled || notificationBusy}
                onPress={() => {
                  setDraftReminderDate(reminderDate);
                  setShowTimePicker(true);
                }}
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
                  {reminderDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <>
                <DateTimePicker
                  value={draftReminderDate ?? reminderDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    if (Platform.OS === "android") {
                      if (d) void applyReminderTime(d);
                      setShowTimePicker(false);
                    } else if (d) setDraftReminderDate(d);
                  }}
                />
                {Platform.OS === "ios" && (
                  <View style={styles.pickerActions}>
                    <TouchableOpacity
                      style={[styles.pickerButton, { backgroundColor: theme.card }]}
                      onPress={() => {
                        setShowTimePicker(false);
                        setDraftReminderDate(null);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        if (draftReminderDate) void applyReminderTime(draftReminderDate);
                        setShowTimePicker(false);
                        setDraftReminderDate(null);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, { color: theme.background }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Theme */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                    backgroundColor: settings.theme === "light" ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: settings.theme === "light" ? "#fff" : theme.text,
                      fontWeight: settings.theme === "light" ? "700" : "500",
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
                    backgroundColor: settings.theme === "dark" ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: settings.theme === "dark" ? "#fff" : theme.text,
                      fontWeight: settings.theme === "dark" ? "700" : "500",
                    },
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sessions */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Flame size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Sessions</Text>
            </View>

            <View style={{ marginTop: 10 }}>
              {/* Today's Sessions Completed */}
              <View style={styles.streakBanner}>
                <View>
                  <Text style={styles.streakLabel}>Today</Text>
                  <Text style={styles.streakValue}>
                    {gamification?.sessionsToday ?? 0} {gamification?.sessionsToday === 1 ? "session" : "sessions"} ✅
                  </Text>
                </View>
                <View style={styles.streakIcon}>
                  <Flame size={24} color="#fff" />
                </View>
              </View>
            </View>
          </View>

          {/* Streaks & Badges */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Trophy size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Streaks & Badges</Text>
            </View>

            <View style={{ marginTop: 10 }}>
              {/* Days Streak */}
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
            </View>

            <Text style={[styles.sectionLabel, { color: theme.text }]}>Earned Badges</Text>
            <View style={styles.badgesRow}>
              {badges.map((b) => (
                <View key={b.id} style={styles.badgeItem}>
                  <View
                    style={[
                      styles.badgeCircle,
                      b.unlocked
                        ? { borderColor: theme.primary, backgroundColor: "#EEF2FF" }
                        : { borderStyle: "dashed", borderColor: theme.border, backgroundColor: theme.background, opacity: 0.5 },
                    ]}
                  >
                    <Trophy size={26} color={b.unlocked ? theme.primary : theme.secondaryText} />
                  </View>
                  <Text style={[styles.badgeName, { color: b.unlocked ? theme.text : theme.secondaryText }]}>
                    {b.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <TabBar activeTab="profile" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  labelRow: { fontSize: 16 },
  pill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pillText: { fontSize: 14 },
  segmentRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  segmentText: { fontSize: 16 },
  streakBanner: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, alignItems: "center", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#FCD34D", backgroundColor: "#FEF3C7" },
  streakLabel: { fontSize: 14, color: "#92400E", fontWeight: "600" },
  streakValue: { fontSize: 28, fontWeight: "800", color: "#78350F", marginTop: 6 },
  streakIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 16, fontWeight: "700", marginTop: 10 },
  badgesRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 12 },
  badgeItem: { alignItems: "center" },
  badgeCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  badgeName: { fontSize: 12, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  pickerActions: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 12, paddingHorizontal: 4 },
  pickerButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  pickerButtonText: { fontWeight: "600", fontSize: 16 },
});
