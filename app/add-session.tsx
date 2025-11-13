import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Switch,
  Platform,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import uuid from "react-native-uuid";
import { Calendar, ArrowLeft } from "lucide-react-native";
import { useGlobalStyles } from "../styles/globalStyles";
import { Button } from "../components/mid-fi/Button";
import { useSessions } from "../lib/SessionsContext";
import { useTheme } from "../lib/ThemeContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function AddSession() {
  const { edit, id } = useLocalSearchParams();
  const safeId = useMemo(
    () => (Array.isArray(id) ? (id.length > 0 ? id[0] : undefined) : (id as string | undefined)),
    [id]
  );
  const isEditing = edit === "true";

  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const { sessions, addSession, updateSession } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  // Load session when editing
  useEffect(() => {
    if (!isEditing || !safeId) return;

    const existing = sessions.find((session) => session.id === safeId);
    if (existing) {
      setSubject(existing.subject);
      setDuration(String(existing.duration));
      setNotes(existing.notes || "");
      setDate(existing.date ? new Date(existing.date) : null);
      setRepeat(existing.repeat || false);
    }
  }, [isEditing, safeId, sessions]);

  const handleSave = async () => {
    if (!subject || !duration) {
      Alert.alert("Missing info", "Please enter subject and duration.");
      return;
    }

    if (isEditing && safeId) {
      await updateSession(safeId, {
        subject,
        duration: Number(duration),
        notes,
        date: date ? date.toISOString() : null,
        repeat,
      });
    } else {
      const newSession = {
        id: String(uuid.v4()),
        subject,
        duration: Number(duration),
        notes,
        date: date ? date.toISOString() : null,
        repeat,
      };
      await addSession(newSession);
    }

    router.back(); // go home
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[globalStyles.container]}>
        <View style={[globalStyles.headerCard, { marginBottom: 12}]}>
          <Text style={[globalStyles.headerText]}>
            {isEditing ? "Edit Session" : "Add Session"}
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
        <ScrollView contentContainerStyle={[styles.scrollContent]}>
          <View
            style={[
              styles.contentCard,
              {
                backgroundColor: theme.background
              },
            ]}
          >
            {/* Subject */}
            <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={theme.secondaryText}
            />

            {/* Duration */}
            <Text style={[styles.label, { color: theme.text }]}>Duration (mins)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Duration (mins)"
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              placeholderTextColor={theme.secondaryText}
            />

            {/* Notes */}
            <Text style={[styles.label, { color: theme.text }]}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.input,
                { height: 100, backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Notes (optional)"
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={theme.secondaryText}
            />

            {/* Date & Time */}
            <Text style={[styles.label, { color: theme.text }]}>Date & Time</Text>
            <TouchableOpacity
              style={[
                styles.datePicker,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setShowPicker(true)}
            >
              <Text style={[styles.dateText, { color: theme.secondaryText }]}>
                {date ? date.toLocaleString() : "Select date and time"}
              </Text>
              <Calendar size={20} color={theme.primaryText}/>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date || new Date()}
                mode="datetime"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateChange}
              />
            )}

            {/* Repeat weekly toggle */}
            <View
              style={[
                styles.repeatContainer,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.repeatLabel, { color: theme.text }]}>Repeat weekly</Text>
              <Switch
                value={repeat}
                onValueChange={setRepeat}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={repeat ? theme.background : theme.card}
              />
            </View>

            <Button
              onPress={handleSave}
              style={{ backgroundColor: theme.primary, marginTop: 12 }}
              textStyle={{ color: theme.primaryText }}
            >
              {isEditing ? "Update Session" : "Save Session"}
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 0,
  },
  contentCard: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
  },
  repeatContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  repeatLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  headingSpacing: {
    marginBottom: 24,
  },
});