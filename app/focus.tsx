import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSessions } from '../lib/SessionsContext';
import { useTheme } from '../lib/ThemeContext';
import { useGlobalStyles } from '../styles/globalStyles';
import { Button } from '../components/mid-fi/Button';
import { Check, X } from 'lucide-react-native';

export default function FocusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);

  const { sessions, completeSession } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();

  const session = useMemo(() => sessions.find((s) => s.id === safeId), [sessions, safeId]);

  const [remainingTime, setRemainingTime] = useState(session ? session.duration * 60 : 0);
  const [updateCompletion, setUpdateCompletion] = useState(false);

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

  const handleComplete = async () => {
    if (!safeId) return;
    setUpdateCompletion(true);
    await completeSession(safeId);
    setTimeout(() => {
      router.back();
    }, 500);
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
});
