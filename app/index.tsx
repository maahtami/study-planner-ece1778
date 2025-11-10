import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Plus, Clock } from "lucide-react-native";
import { Button } from "../components/mid-fi/Button";
import { SessionCard } from "../components/mid-fi/SessionCard";
import { TabBar } from "../components/mid-fi/TabBar";
import { router, useFocusEffect } from "expo-router";
import { getSessions, Session } from "../lib/sessions";

export default function HomeScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"today" | "week">("today");

  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessions();
    setSessions(data);
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSessions();
    }, [])
  );

  const handleAddSession = () => router.push("/add-session");
  const handleOpenSession = (session: Session) =>
    router.push({ pathname: "/session-details", params: { id: session.id } });

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSessions} />
        }
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.header}>Home</Text>

        {/* Filter buttons */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === "today" && styles.activeFilter,
            ]}
            onPress={() => setActiveFilter("today")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "today" && styles.activeFilterText,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === "week" && styles.activeFilter,
            ]}
            onPress={() => setActiveFilter("week")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "week" && styles.activeFilterText,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#2563EB" />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first study session to get started
            </Text>
            <Button onPress={handleAddSession} icon={<Plus size={18} color="#FFF" />}>
              Create First Session
            </Button>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => handleOpenSession(session)}
            >
              <SessionCard
                id={session.id}
                subject={session.subject}
                duration={session.duration}
                notes={session.notes}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Bottom add button */}
      <View style={styles.bottomBar}>
        <Button icon={<Plus size={18} color="#FFF" />} onPress={handleAddSession}>
          Add Session
        </Button>
      </View>

      {/* ✅ Fixed: no onTabChange needed */}
      <TabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { padding: 16 },
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
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    alignItems: "center",
  },
  activeFilter: { backgroundColor: "#2563EB" },
  filterText: { color: "#111827", fontSize: 16, fontWeight: "500" },
  activeFilterText: { color: "#FFF" },
  emptyContainer: { alignItems: "center", marginTop: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  bottomBar: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});