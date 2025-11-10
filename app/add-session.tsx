import { useEffect, useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { Calendar, ArrowLeft } from "lucide-react-native";

import { Button } from "../components/mid-fi/Button";
import { saveSession, getSessions } from "../lib/sessions";

export default function AddSession() {
  const { edit, id } = useLocalSearchParams();
  const isEditing = edit === "true";

  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Load session when editing
  useEffect(() => {
    if (isEditing && id) {
      loadSessionForEdit();
    }
  }, [isEditing, id]);

  const loadSessionForEdit = async () => {
    try {
      const sessions = await getSessions();
      const found = sessions.find((s: any) => s.id === id);
      if (found) {
        setSubject(found.subject);
        setDuration(String(found.duration));
        setNotes(found.notes || "");
        setDate(found.date ? new Date(found.date) : null);
        setRepeat(found.repeat || false);
      }
    } catch (error) {
      console.error("Error loading session for edit:", error);
    }
  };

  const handleSave = async () => {
    if (!subject || !duration) {
      Alert.alert("Missing info", "Please enter subject and duration.");
      return;
    }

    try {
      const sessions = await getSessions();

      if (isEditing && id) {
        // update existing
        const updated = sessions.map((s: any) =>
          s.id === id
            ? {
                ...s,
                subject,
                duration: Number(duration),
                notes,
                date: date ? date.toISOString() : null,
                repeat,
              }
            : s
        );
        await AsyncStorage.setItem("sessions", JSON.stringify(updated));
      } else {
        // create new
        const newSession = {
          id: String(uuid.v4()),
          subject,
          duration: Number(duration),
          notes,
          date: date ? date.toISOString() : null,
          repeat,
        };
        await saveSession(newSession);
      }

      router.replace("/"); // go home
    } catch (error) {
      console.error("Error saving session:", error);
      Alert.alert("Error", "Failed to save session. Please try again.");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>

      <View style={{ marginTop: 60 }}>
        <Text style={styles.header}>
          {isEditing ? "Edit Session" : "Add Session"}
        </Text>

        {/* Subject */}
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />

        {/* Duration */}
        <TextInput
          style={styles.input}
          placeholder="Duration (mins)"
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
        />

        {/* Notes */}
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Notes (optional)"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Date & Time */}
        <Text style={styles.label}>Date & Time</Text>
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.dateText}>
            {date ? date.toLocaleString() : "Select date and time"}
          </Text>
          <Calendar size={20} color="#6B7280" />
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
        <View style={styles.repeatContainer}>
          <Text style={styles.repeatLabel}>Repeat weekly</Text>
          <Switch value={repeat} onValueChange={setRepeat} />
        </View>

        <Button onPress={handleSave}>
          {isEditing ? "Update Session" : "Save Session"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
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
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: "#6B7280",
  },
  repeatContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  repeatLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
});