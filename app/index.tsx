import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Plus, Clock } from "lucide-react-native";
import { Button } from "../components/mid-fi/Button";
import { SessionCard } from "../components/mid-fi/SessionCard";
import { TabBar } from "../components/mid-fi/TabBar";
import { router } from "expo-router";
import { Session } from "../types";
import { useGlobalStyles } from "../styles/globalStyles";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/ThemeContext";
import { useSessions } from "../lib/SessionsContext";
export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState<"today" | "week">("today");
  const [refreshing, setRefreshing] = useState(false);
  const globalStyles = useGlobalStyles();
  const { theme } = useTheme();
  const { sessions, loading, refreshSessions } = useSessions();
  const filteredSessions = useMemo(
    () => sortSessions(filterSessionsByRange(sessions, activeFilter)),
    [sessions, activeFilter]
  );
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSessions();
    setRefreshing(false);
  }, [refreshSessions]);

  const handleAddSession = () => router.push("/add-session");
  const handleOpenSession = (session: Session) =>
    router.push({ pathname: "/session-details", params: { id: session.id } });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[globalStyles.container]}>
        <View style={styles.content}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
              />
            }
            contentContainerStyle={styles.scroll}
          >
            <View style={[globalStyles.headerCard, { backgroundColor: theme.background, marginBottom: 0, paddingTop: 0 }]}> 
              <Text style={globalStyles.headerText}>Home</Text>
            </View>
            {/* Filter buttons */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  activeFilter === "today" && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setActiveFilter("today")}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme.text },
                    activeFilter === "today" && { color: theme.background },
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  activeFilter === "week" && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setActiveFilter("week")}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme.text },
                    activeFilter === "week" && { color: theme.background },
                  ]}
                >
                  This Week
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Clock size={48} color={theme.primary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No sessions yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                  Create your first study session to get started
                </Text>
                <Button
                  onPress={handleAddSession}
                  icon={<Plus size={18} color={theme.primaryText} />}
                  style={{ backgroundColor: theme.primary }}
                  textStyle={{ color: theme.primaryText }}
                >
                  Create First Session
                </Button>
              </View>
            ) : (
              filteredSessions.map((session) => (
                <TouchableOpacity key={session.id} onPress={() => handleOpenSession(session)}>
                  <SessionCard
                    id={session.id}
                    subject={session.subject}
                    duration={session.duration}
                    notes={session.notes}
                    date={session.date}
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Bottom add button */}
        <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
          <Button
            icon={<Plus size={18} color={theme.primaryText} />}
            onPress={handleAddSession}
            style={{ backgroundColor: theme.primary }}
            textStyle={{ color: theme.primaryText }}
          >
            Add Session
          </Button>
        </View>

        {/* ✅ Fixed: no onTabChange needed */}
        <TabBar activeTab="home" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function filterSessionsByRange(sessions: Session[], range: "today" | "week"): Session[] {
  if (range === "week") return sessions;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return sessions.filter((session) => {
    if (!session.date) return false;
    const date = new Date(session.date);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return key === todayKey;
  });
}

function sortSessions(list: Session[]): Session[] {
  return [...list].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const dateB = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    if (dateA === dateB) return a.subject.localeCompare(b.subject);
    return dateA - dateB;
  });
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
  },
  filterText: { fontSize: 16, fontWeight: "500" },
  emptyContainer: { alignItems: "center", marginTop: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16, paddingBottom: 16 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 16, paddingBottom: 16 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});