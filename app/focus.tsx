import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSessions } from '../lib/SessionsContext';
import { useTheme } from '../lib/ThemeContext';
import { useGlobalStyles } from '../styles/globalStyles';
import { Button } from '../components/mid-fi/Button';
import { Check, X, Star } from 'lucide-react-native';
import { Quote } from '../types';
import LottieView from "lottie-react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Dimensions } from "react-native";

export default function FocusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const { sessions, completeSession, rateSession } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();

  const session = useMemo(() => sessions.find((s) => s.id === safeId), [sessions, safeId]);

  const [remainingTime, setRemainingTime] = useState(session ? session.duration * 60 : 0);
  const [updateCompletion, setUpdateCompletion] = useState(false);
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const [showFireworks, setShowFireworks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);


  useEffect(() => {
    if (!session) {
      Alert.alert("Error", "Session not found.", [{ text: "OK", onPress: () => router.back() }]);
      return;
    }

    if (session.completed && !updateCompletion) {
      Alert.alert("Info", "This session is already completed.", [{ text: "OK", onPress: () => router.back() }]);
      return;
    }

    setRemainingTime(session.duration * 60);

    const timer = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleComplete(); // Auto-complete when timer finishes
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const response = await fetch("https://zenquotes.io/api/quotes/");
      const data = await response.json();
      if (data && data.length > 0) {
        setQuote({ content: data[0].q, author: data[0].a || "Unknown" });
      }
    } catch (error) {
      console.error("Failed to fetch quote:", error);
      setQuote({
        content: "The secret of getting ahead is getting started.",
        author: "Mark Twain",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleRateSession = async (rating: number) => {
    if (!safeId) return;
    setSelectedRating(rating);
    await rateSession(safeId, rating);
  };

  const handleComplete = async () => {
    if (!safeId) return;
    setUpdateCompletion(true);
    setShowFireworks(true);
    setShowConfetti(true);
    await fetchQuote();
    setShowQuoteModal(true);
    await completeSession(safeId);
  };

  const handleClose = () => {
    router.back();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!session) {
    return null; // Render nothing while redirecting
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[globalStyles.container, styles.container]}>
        <View style={styles.header}>
          <Text style={[styles.subject, { color: theme.text }]}>{session.subject}</Text>
        </View>

        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>
            {formatTime(remainingTime)}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            style={[styles.button, { backgroundColor: theme.danger, borderColor: theme.border }]}
            textStyle={{ color: theme.dangerText }}
            icon={<X size={18} color={theme.dangerText} />}
            onPress={handleClose}
          >
            Close
          </Button>
          <Button
            style={[styles.button, { backgroundColor: theme.primary }]}
            textStyle={{ color: theme.primaryText }}
            icon={<Check size={18} color={theme.primaryText} />}
            onPress={handleComplete}
          >
            Complete
          </Button>
        </View>

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
                              color={star <= selectedRating ? "#FFC700" : theme.border}
                              fill={star <= selectedRating ? "#FFC700" : "transparent"}
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

                  // Navigate back after a short delay (to enjoy the animations)
                  router.replace({
                    pathname: 'session-details',
                    params: { id: safeId, celebrate: 'true' }
                  });
                }}
              >
                <Text style={[styles.closeButtonText, { color: theme.primaryText }]}>Done</Text>
              </TouchableOpacity>
            </View>
             {/* Fireworks Animation */}
            {/* {showFireworks && (
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
                  zIndex: 999,
                  pointerEvents: "none",
                }}
                onAnimationFinish={() => setShowFireworks(false)}
              />
            )} */}

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
                    y: 5,
                  }}
                  fadeOut
                  autoStart
                  fallSpeed={1500} // lower = slower fall
                  onAnimationEnd={() => setShowConfetti(false)}
                />
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    alignItems: 'center',
  },
  subject: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 80,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
  },
  // Styles for Modal
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
