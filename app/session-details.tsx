import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ProgressBarAndroid,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSessions } from "../lib/sessions";
import { Button } from "../components/mid-fi/Button";
import { ArrowLeft, Trash2, Edit3, Play, RotateCcw } from "lucide-react-native";

export default function SessionDetails() {
  const params = useLocalSearchParams();
  // ❗ normalize id -> string
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const [session, setSession] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeId]);

  const loadSession = async () => {
    if (!safeId) {
      Alert.alert("Error", "Missing session id");
      router.back();
      return;
    }
    const sessions = await getSessions();
    const found = sessions.find((s: any) => s.id === safeId);
    if (!found) {
      Alert.alert("Error", "Session not found");
      router.back();
      return;
    }
    setSession(found);
  };

  const handleDelete = async () => {
    if (!safeId) return;

    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const sessions = await getSessions();
            const next = sessions.filter((s: any) => s.id !== safeId);
            await AsyncStorage.setItem("sessions", JSON.stringify(next));
            // Navigate back to Home and re-mount the screen
            router.replace("/");
          } catch (e) {
            Alert.alert("Error", "Could not delete the session.");
          }
        },
      },
    ]);
  };

  const handleStart = () => {
    setProgress((prev) => (prev < 100 ? Math.min(prev + 25, 100) : 0));
  };

  const handleEdit = () => {
    if (!safeId) return;
    router.push({ pathname: "/add-session", params: { edit: "true", id: safeId } });
  };

  if (!session) return null;

  const formattedDate = session.date
    ? new Date(session.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Not set";

  return (
    <View style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Session Details</Text>

        <Text style={styles.label}>Subject</Text>
        <Text style={styles.value}>{session.subject}</Text>

        <Text style={styles.label}>Duration</Text>
        <Text style={styles.value}>{session.duration} minutes</Text>

        <Text style={styles.label}>Date & Time</Text>
        <Text style={styles.value}>{formattedDate}</Text>

        {session.notes ? (
          <>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{session.notes}</Text>
          </>
        ) : null}

        {session.repeat ? (
          <>
            <Text style={styles.label}>Repeat</Text>
            <Text style={styles.value}>Repeats weekly</Text>
          </>
        ) : null}

        <Text style={styles.label}>Progress</Text>
        {Platform.OS === "ios" ? (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        ) : (
          <ProgressBarAndroid
            styleAttr="Horizontal"
            indeterminate={false}
            progress={progress / 100}
            color="#2563EB"
          />
        )}
        <Text style={styles.progressText}>{progress}% complete</Text>

        <View style={styles.buttonRow}>
          <Button
            icon={progress === 100 ? <RotateCcw size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
            onPress={handleStart}
          >
            {progress === 100 ? "Restart Session" : "Start Session"}
          </Button>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color="#111827" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Edit3 size={18} color="#2563EB" />
          <Text style={styles.editText}>Edit Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: { marginTop: 80 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, color: "#111827" },
  label: { fontSize: 14, color: "#6B7280", marginTop: 12 },
  value: { fontSize: 16, color: "#111827", fontWeight: "500" },
  progressBar: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 5, marginTop: 8 },
  progressFill: { height: 10, backgroundColor: "#2563EB", borderRadius: 5 },
  progressText: { color: "#6B7280", fontSize: 13, marginTop: 4 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  deleteText: { color: "#111827", fontWeight: "600" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  editText: { color: "#2563EB", fontWeight: "600", fontSize: 16 },
});