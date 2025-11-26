import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/mid-fi/Button";
import { ArrowLeft, Trash2, Edit3, Play, RotateCcw, Star } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useSessions } from "../lib/SessionsContext";
import { useTheme } from "../lib/ThemeContext";
import { useGlobalStyles } from "../styles/globalStyles";


export default function SessionDetails() {
  const params = useLocalSearchParams();
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const { sessions, deleteSession, loading, restartSession } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();

  const session = useMemo(
    () => sessions.find((current) => current.id === safeId),
    [sessions, safeId]
  );

  // Count total completed sessions
  const sessionsCompleted = useMemo(
    () => sessions.filter((s) => s.completed).length,
    [sessions]
  );

  const celebrate = params.celebrate === 'true';
  const [showFireworks, setShowFireworks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // ✅ Sync progress with persisted completion state
  const [progress, setProgress] = useState(0);
  const [deleted, setDeleted] = useState(false);
  
  useEffect(() => {
    if (session?.completed) {
      setProgress(100);
    }
  }, [session]);

  useEffect(() => {
    if (celebrate) {
      setShowFireworks(true);
      setShowConfetti(true);
    }
  }, [celebrate]);

  useEffect(() => {
    if (!safeId) {
      Alert.alert("Error", "Missing session id");
      router.back();
    }
  }, [safeId]);

  useEffect(() => {
    if (safeId && !loading && !session && !deleted) {
      Alert.alert("Error", "Session not found");
      router.back();
    }
  }, [safeId, loading, session, deleted]);

  const handleDelete = async () => {
    if (!safeId) return;

    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleted(true);
          await deleteSession(safeId);
          router.back();
        },
      },
    ]);
  };

  const handleStart = () => {
    if (!safeId) return;

    if (session?.completed) {
      // This is the "Restart Session" case
      restartSession(safeId);
      setProgress(0);
    } else {
      // This is the "Start Session" case
      router.push({ pathname: '/focus', params: { id: safeId } });
    }
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
        {/* Header */}
        <View style={[globalStyles.headerCard, { marginBottom: 12 }]}>
          <Text style={[globalStyles.headerText]}>Session Details</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>

            {/* Session Info */}
            <Text style={[styles.label, { color: theme.secondaryText }]}>Subject</Text>
            <Text style={[styles.value, { color: theme.text }]}>{session.subject}</Text>

            <Text style={[styles.label, { color: theme.secondaryText }]}>Duration</Text>
            <Text style={[styles.value, { color: theme.text }]}>{session.duration} minutes</Text>

            <Text style={[styles.label, { color: theme.secondaryText }]}>Date & Time</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formattedDate}</Text>

            {session.notes && (
              <>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Notes</Text>
                <Text style={[styles.value, { color: theme.text }]}>{session.notes}</Text>
              </>
            )}

            {session.repeat && (
              <>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Repeat</Text>
                <Text style={[styles.value, { color: theme.text }]}>{`Repeats weekly`}</Text>
              </>
            )}

            <Text style={[styles.label, { color: theme.secondaryText }]}>Progress</Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.secondaryText }]}>{progress}% complete</Text>
            {session.completed && session.completedAt && (
              <>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Completed At</Text>
                <Text style={[styles.value, { color: theme.text }]}>{new Date(session.completedAt).toLocaleString()}</Text>
              </>
            )}

            {session.completed && typeof session.rating === 'number' && session.rating >= 0 && (
              <>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Focus Rating</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      color={star <= (session.rating || 0) ? "#FFC700" : theme.border}
                      fill={star <= (session.rating || 0) ? "#FFC700" : "transparent"}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <View style={styles.buttonRow}>
            <Button
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              textStyle={{ color: theme.primaryText }}
              icon={progress === 100 ? <RotateCcw size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
              onPress={handleStart}
            >
              {progress === 100 ? "Restart Session" : "Start Session"}
            </Button>

            <TouchableOpacity style={[styles.deleteButton, { backgroundColor: "#EF4444" }]} onPress={handleDelete}>
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
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
  },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#f3f3f3", alignItems: "center" },
  statLabel: { fontSize: 14, fontWeight: "500" },
  statValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  label: { fontSize: 14, marginTop: 12 },
  value: { fontSize: 18, fontWeight: "500" },
  progressBar: { height: 16, borderRadius: 5, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },
  progressText: { fontSize: 16, marginTop: 8 },
  buttonRow: { flexDirection: "row", gap: 12 },
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
    marginTop: 12,
  },
  editText: { fontWeight: "600", fontSize: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 12,
  },
  authorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  ratingContainer: {
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  ratingPrompt: {
    fontSize: 16,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 8,
  },
  closeButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
