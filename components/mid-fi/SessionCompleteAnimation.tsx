// components/SessionCompleteAnimation.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import LottieView from "lottie-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSessions } from "../../lib/SessionsContext";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * SessionCompleteAnimation
 *
 * Shows a modal with a Lottie celebration animation and an animated progress bar
 * indicating the user's current streak / session completion progress.
 *
 * Works with the gamification state from SessionsContext.
 */
export const SessionCompleteAnimation = ({ visible, onClose }: Props) => {
  const { gamification } = useSessions();
  const [showModal, setShowModal] = useState(visible);

  // Reanimated shared value for progress bar
  const progress = useSharedValue(0);

  // Update modal visibility and progress when gamification changes
  useEffect(() => {
    setShowModal(visible);

    if (visible && gamification) {
      const percentProgress = Math.min(gamification.sessionStreak / 10, 1); // progress for session streak
      progress.value = withTiming(percentProgress, { duration: 800 });
    }
  }, [visible, gamification]);

  // Animated style for progress bar
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  // Auto-close modal after 2.5 seconds
  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => {
      setShowModal(false);
      onClose();
    }, 2500);
    return () => clearTimeout(timer);
  }, [showModal, onClose]);

  if (!showModal) return null;

  return (
    <Modal transparent animationType="fade" visible={showModal}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Lottie animation */}
          <LottieView
            source={require("../assets/lottie/session-complete.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
          />

          {/* Title */}
          <Text style={styles.title}>Session Completed!</Text>

          {/* Streak info */}
          <Text style={styles.streak}>
            Current Day Streak: {gamification?.streak ?? 0} {gamification?.streak === 1 ? "day" : "days"}
          </Text>
          <Text style={styles.streak}>
            Current Session Streak: {gamification?.sessionStreak ?? 0}{" "}
            {gamification?.sessionStreak === 1 ? "session" : "sessions"}
          </Text>

          {/* Animated progress bar */}
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, animatedStyle]} />
          </View>

          {/* Badges unlocked */}
          {gamification?.badges?.length ? (
            <View style={styles.badgesContainer}>
              {gamification.badges.map((badge, idx) => (
                <Text key={idx} style={styles.badge}>
                  {badge}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  lottie: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  streak: {
    fontSize: 16,
    marginTop: 5,
    fontWeight: "600",
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    marginTop: 15,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: 6,
  },
  badgesContainer: {
    marginTop: 15,
    alignItems: "center",
  },
  badge: {
    fontSize: 14,
    backgroundColor: "#ffd700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 5,
  },
});
