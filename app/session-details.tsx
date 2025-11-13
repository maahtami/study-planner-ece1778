import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, ProgressBarAndroid, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/mid-fi/Button";
import { ArrowLeft, Trash2, Edit3, Play, RotateCcw } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useSessions } from "../lib/SessionsContext";
import { useTheme } from "../lib/ThemeContext";
import { useGlobalStyles } from "../styles/globalStyles";

export default function SessionDetails() {
  const params = useLocalSearchParams();
  // ❗ normalize id -> string
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const [progress, setProgress] = useState(0);
  const { sessions, deleteSession, loading } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const session = useMemo(
    () => sessions.find((current) => current.id === safeId),
    [sessions, safeId]
  );

  useEffect(() => {
    if (!safeId) {
      Alert.alert("Error", "Missing session id");
      router.back();
    }
  }, [safeId]);

  useEffect(() => {
    if (safeId && !loading && !session) {
      Alert.alert("Error", "Session not found");
      router.back();
    }
  }, [safeId, loading, session]);

  const handleDelete = async () => {
    if (!safeId) return;

    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession(safeId);
          router.replace("/");
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
    <SafeAreaProvider>
      <SafeAreaView style={[globalStyles.container]}>
        <View style={[globalStyles.headerCard, { marginBottom: 12}]}>
            <Text style={[globalStyles.headerText]}>
              Session Details
            </Text>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

        <View style={styles.content}>

          <Text style={[styles.label, { color: theme.secondaryText }]}>Subject</Text>
          <Text style={[styles.value, { color: theme.text }]}>{session.subject}</Text>

          <Text style={[styles.label, { color: theme.secondaryText }]}>Duration</Text>
          <Text style={[styles.value, { color: theme.text }]}>{session.duration} minutes</Text>

          <Text style={[styles.label, { color: theme.secondaryText }]}>Date & Time</Text>
          <Text style={[styles.value, { color: theme.text }]}>{formattedDate}</Text>

          {session.notes ? (
            <>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Notes</Text>
              <Text style={[styles.value, { color: theme.text }]}>{session.notes}</Text>
            </>
          ) : null}

          {session.repeat ? (
            <>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Repeat</Text>
              <Text style={[styles.value, { color: theme.text }]}>Repeats weekly</Text>
            </>
          ) : null}

          <Text style={[styles.label, { color: theme.secondaryText }]}>Progress</Text>
          {Platform.OS === "ios" ? (
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
          ) : (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              indeterminate={false}
              progress={progress / 100}
              color={theme.primary}
            />
          )}
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>
            {progress}% complete
          </Text>

          <View style={styles.buttonRow}>
            <Button
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              textStyle={{ color: theme.primaryText }}
              icon={
                progress === 100 ? (
                  <RotateCcw size={18} color="#FFF" />
                ) : (
                  <Play size={18} color="#FFF" />
                )
              }
              onPress={handleStart}
            >
              {progress === 100 ? "Restart Session" : "Start Session"}
            </Button>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: "#EF4444" },
              ]}
              onPress={handleDelete}
            >
              <Trash2 size={18} color="#FFF" />
              <Text style={[styles.deleteText, { color: "#FFF" }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Edit3 size={18} color={theme.primary} />
            <Text style={[styles.editText, { color: theme.primary }]}>Edit Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  backButton: {
    position: "absolute",
    top: 12,
    left: 20,
    zIndex: 10,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    alignSelf: "flex-start",
  },
  content: { 
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
   },
  label: { fontSize: 14, marginTop: 12 },
  value: { fontSize: 18, fontWeight: "500" },
  progressBar: { height: 16, borderRadius: 5, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },
  progressText: { fontSize: 16, marginTop: 8 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  primaryButton: { flex: 1 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  deleteText: { fontWeight: "600" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  editText: { fontWeight: "600", fontSize: 16 },
});