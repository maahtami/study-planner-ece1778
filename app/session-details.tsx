import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ProgressBarAndroid,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/mid-fi/Button";
import { ArrowLeft, Trash2, Edit3, Play, RotateCcw, Star } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useSessions } from "../lib/SessionsContext";
import { useTheme } from "../lib/ThemeContext";
import { useGlobalStyles } from "../styles/globalStyles";
// import { SessionCompleteAnimation } from "../components/mid-fi/SessionCompleteAnimation";
import { Quote } from "../types";
import LottieView from "lottie-react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Dimensions } from "react-native";

export default function SessionDetails() {
  const params = useLocalSearchParams();
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const { sessions, deleteSession, loading, completeSession, gamification, restartSession, rateSession } = useSessions();
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

  // ✅ Sync progress with persisted completion state
  const [progress, setProgress] = useState(0);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (session?.completed) {
      setProgress(100);
    }
  }, [session]);

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
          router.navigate("/");
        },
      },
    ]);
  };

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const response = await fetch(
        "https://zenquotes.io/api/quotes/"
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setQuote({ content: data[0].q, author: data[0].a || "Unknown" });
      }
    } catch (error) {
      console.error("Failed to fetch quote:", error);
      // Fallback quote
      setQuote({
        content: "The secret of getting ahead is getting started.",
        author: "Mark Twain",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleStart = async () => {
    setProgress((prev) => {
      // restart session if progress is 100
      if (prev === 100 && safeId && session?.completed === true) {
        setSelectedRating(-1);
        restartSession(safeId);
        return 0;
      }
      const next = prev < 100 ? Math.min(prev + 25, 100) : 0;

      // ✅ Complete session automatically when progress reaches 100%
      if (next === 100 && safeId && !session?.completed) {
        fetchQuote().then(() => {
          setShowQuoteModal(true);
          completeSession(safeId)
          .then(() => {
            // Show completion animation when session is successfully completed
            setShowCompletionAnimation(true);
          })
          .catch((e) => {
            console.error("Failed to complete session:", e);
            router.back(); // Go back even if quote fails
          });
        });
      }

      return next;
    });
  };

  const handleEdit = () => {
    if (!safeId) return;
    router.push({ pathname: "/add-session", params: { edit: "true", id: safeId } });
  };

  const handleRateSession = async (rating: number) => {
    if (!safeId) return;
    setSelectedRating(rating);
    await rateSession(safeId, rating);
    setTimeout(() => {
      // setShowQuoteModal(false);
      // We don't need to navigate away, the main screen will update
    }, 500);
  };

  if (!session) return null;

  const formattedDate = session.date
    ? new Date(session.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Not set";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[globalStyles.container]}>
        {/*  Fireworks Animation */}
        {showFireworks && (
          <LottieView
            source={require("../assets/lottie/fireworks.json")}
            autoPlay
            loop={false}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              zIndex: 999,
              pointerEvents: "none",
            }}
            onAnimationFinish={() => setShowFireworks(false)}
          />
        )}

        {/* Confetti Animation */}
        {showConfetti && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 999,
            }}
          >
            <ConfettiCannon
              count={100}
              origin={{
                x: 0.5 * Dimensions.get("window").width,
                y: 0.5 * Dimensions.get("window").height,
              }}
              fadeOut
              autoStart
              fallSpeed={1000} // lower = slower fall
              onAnimationEnd={() => setShowConfetti(false)}
            />
          </View>
        )}
        
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
          {Platform.OS === "ios" ? (
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
            </View>
          ) : (
            <ProgressBarAndroid styleAttr="Horizontal" indeterminate={false} progress={progress / 100} color={theme.primary} />
          )}
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>{progress}% complete</Text>
          {session.completed && session.completedAt && (
            <>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Completed At</Text>
              <Text style={[styles.value, { color: theme.text }]}>{new Date(session.completedAt).toLocaleString()}</Text>
            </>
          )}

          {session.completed && session.rating && session.rating > 0 && (
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

        {/* Completion Animation */}

        <Modal visible={showQuoteModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Session Complete!</Text>
              {quoteLoading ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : (
                quote && (
                  <>
                    <Text style={[styles.quoteText, { color: theme.text }]}>"{quote.content}"</Text>
                    {quote.author && (
                      <Text style={[styles.authorText, { color: theme.secondaryText }]}>- {quote.author}</Text>
                    )}
                    <View style={[styles.ratingContainer, { borderColor: theme.border }]}>
                      <Text style={[styles.ratingPrompt, { color: theme.text }]}>Rate your focus:</Text>
                      <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => handleRateSession(star)}>
                            <Star
                              size={32}
                              color={star <= selectedRating ? theme.primary : theme.border}
                              fill={star <= selectedRating ? theme.primary : "transparent"}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowQuoteModal(false);
                  setTimeout(() => {
                    setShowFireworks(true);
                    setShowConfetti(true);
                  }, 300);
                  // After rating (or not), user can close modal. If they rated, it's already saved.
                  // If they came back to the page later, the modal will show again if not rated.
                  // Maybe don't navigate back automatically. Let's see.
                  // router.back();
                }}
              >
                <Text style={[styles.closeButtonText, { color: theme.primaryText }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
