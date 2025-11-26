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
  Modal,
  Pressable,
  GestureResponderEvent,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar as CalendarView } from "react-native-calendars";
import uuid from "react-native-uuid";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react-native";
import { useGlobalStyles } from "../styles/globalStyles";
import { Button } from "../components/mid-fi/Button";
import { useSessions } from "../lib/SessionsContext";
import { useTheme } from "../lib/ThemeContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/AuthContext";
import { DOTS } from "../styles/globalStyles";
import { CalendarMarkedDates, HolidayMap, CalendarDay, NagerHoliday } from "../types";

const HOLIDAY_API = "https://date.nager.at/api/v3/publicholidays/2025/CA";

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AddSession() {
  const { edit, id } = useLocalSearchParams();
  const { user } = useAuth();
  const userId = user?.uid;
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
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [repeat, setRepeat] = useState(false);
  const [rating, setRating] = useState<number | null>(-1);
  const [holidayMap, setHolidayMap] = useState<HolidayMap>({});
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
  const [showHolidayLoading, setShowHolidayLoading] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isFetchingHolidays) {
      timer = setTimeout(() => {
        setShowHolidayLoading(true);
      }, 1000);
    } else {
      setShowHolidayLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isFetchingHolidays]);
  const { sessions, addSession, updateSession } = useSessions();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();

  const filteredSessions = useMemo(() => {
    if (!isEditing || !safeId) return sessions;
    return sessions.filter((s) => s.id !== safeId);
  }, [sessions, isEditing, safeId]);

  const sessionMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    filteredSessions.forEach((session) => {
      if (!session.date || !session.subject) return;
      const key = formatDateKey(new Date(session.date));
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(session.subject);
    });
    return map;
  }, [filteredSessions]);

  const selectedHolidayNames = date ? holidayMap[formatDateKey(date)] : undefined;
  const tempHolidayNames = holidayMap[formatDateKey(tempDate)] ?? [];
  const selectedSessionNames = date ? sessionMap[formatDateKey(date)] : undefined;
  const tempSessionNames = sessionMap[formatDateKey(tempDate)] ?? [];
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
      setRating(existing.rating || -1);
    }
  }, [isEditing, safeId, sessions]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadHolidays = async () => {
      setIsFetchingHolidays(true);
      try {
        const response = await fetch(HOLIDAY_API, { 
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Holiday request failed with ${response.status}`);
        }
        const data = (await response.json()) as NagerHoliday[];
        if (!isMounted) return;
        const map: HolidayMap = {};
        data.forEach((holiday) => {
          if (!holiday.date || !holiday.name) return;
          if (!map[holiday.date]) {
            map[holiday.date] = [];
          }
          map[holiday.date].push(holiday.name);
        });
        setHolidayMap(map);
        setHolidayError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.warn("Failed to fetch holidays", err);
        if (isMounted) {
          setHolidayError("Unable to load national holidays right now.");
        }
      } finally {
        if (isMounted) {
          setIsFetchingHolidays(false);
        }
      }
    };

    loadHolidays();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const [showTimePickerAndroid, setShowTimePickerAndroid] = useState(false);

  const handleSave = async () => {
    if (!subject || !duration) {
      Alert.alert("Missing info", "Please enter subject and duration.");
      return;
    }
    if (!date){
      Alert.alert("Missing info", "Please select a date and time.");
      return;
    }

    const savePromise = isEditing && safeId
      ? updateSession(safeId, {
          userId,
          subject,
          duration: Number(duration),
          notes,
          date: date ? date.toISOString() : null,
          repeat,
          completed: false,
          completedAt: null,
          rating,
        })
      : addSession({
          id: String(uuid.v4()),
          userId,
          subject,
          duration: Number(duration),
          notes,
          date: date ? date.toISOString() : null,
          repeat,
          completed: false,
          completedAt: null,
          rating,
        });

    router.back(); // go home

    try {
      await savePromise;
    } catch (err) {
      console.warn("Failed to persist session", err);
    }
  };

  const showDatePicker = () => {
    setTempDate(date || new Date());
    setShowPicker(true);
  };

  const closePicker = () => setShowPicker(false);

  const applySelectedDate = () => {
    setDate(tempDate);
    setShowPicker(false);
  };

  const handleCalendarDayPress = (day: CalendarDay) => {
    setTempDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(day.year, day.month - 1, day.day);
      return next;
    });
  };

  const handleTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePickerAndroid(false);
    }
    
    if (event?.type === "dismissed") {
      return;
    }
    if (selectedDate) {
      setTempDate((prev) => {
        const next = new Date(prev);
        next.setHours(selectedDate.getHours());
        next.setMinutes(selectedDate.getMinutes());
        return next;
      });
    }
  };

  const baseMarkedDates = useMemo<CalendarMarkedDates>(() => {
    const marks: CalendarMarkedDates = {};
    Object.keys(holidayMap).forEach((holidayDate) => {
      if (!marks[holidayDate]) {
        marks[holidayDate] = { dots: [] };
      }
      const hasHolidayDot = marks[holidayDate].dots.some((dot) => dot.key === DOTS.holiday.key);
      marks[holidayDate].dots = hasHolidayDot
        ? marks[holidayDate].dots
        : [...marks[holidayDate].dots, DOTS.holiday];
      marks[holidayDate].marked = true;
    });
    filteredSessions.forEach((session) => {
      if (!session.date) return;
      const key = formatDateKey(new Date(session.date));
      const existingDots = marks[key]?.dots ?? [];
      const hasSessionDot = existingDots.some((dot) => dot.key === DOTS.session.key);
      const dots = hasSessionDot ? existingDots : [...existingDots, DOTS.session];
      marks[key] = {
        ...(marks[key] ?? { marked: true }),
        dots,
      };
    });
    return marks;
  }, [holidayMap, filteredSessions]);

  const markedDates = useMemo<CalendarMarkedDates>(() => {
    const key = formatDateKey(tempDate);
    const merged = { ...baseMarkedDates };
    const dots = merged[key]?.dots ?? [];
    merged[key] = {
      ...(merged[key] ?? { dots }),
      dots,
      marked: true,
      selected: true,
      selectedColor: theme.primary,
      selectedTextColor: theme.primaryText,
    };
    return merged;
  }, [baseMarkedDates, tempDate, theme.primary, theme.primaryText]);

  const handleInnerPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
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
              onPress={showDatePicker}
            >
              <Text style={[styles.dateText, { color: theme.secondaryText }]}>
                {date ? date.toLocaleString() : "Select date and time"}
              </Text>
              <CalendarIcon size={20} color={theme.primaryText}/>
            </TouchableOpacity>

            {selectedHolidayNames?.length ? (
              <Text style={styles.holidayPill}>{selectedHolidayNames.join(", ")}</Text>
            ) : null}

            {selectedSessionNames?.length ? (
              <Text style={styles.sessionPill}>Sessions: {selectedSessionNames.join(", ")}</Text>
            ) : null}

            <Modal
              transparent
              visible={showPicker}
              animationType="fade"
              onRequestClose={closePicker}
            >
              <Pressable style={styles.modalBackdrop} onPress={closePicker}>
                <Pressable
                  onPress={handleInnerPress}
                  style={[styles.pickerContainer, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.pickerHeading, { color: theme.text }]}>Select date</Text>
                  <View style={styles.dotLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: DOTS.holiday.color }]} />
                      <Text style={[styles.legendText, { color: theme.secondaryText }]}>
                        National holiday
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: DOTS.session.color }]} />
                      <Text style={[styles.legendText, { color: theme.secondaryText }]}>
                        Existing session
                      </Text>
                    </View>
                  </View>
                  {!!tempHolidayNames.length && (
                    <View style={styles.modalHolidayBadge}>
                      <Text style={[styles.legendText, styles.modalHolidayText]}>
                        {tempHolidayNames.join(", ")}
                      </Text>
                    </View>
                  )}
                  {!!tempSessionNames.length && (
                    <View style={styles.modalSessionBadge}>
                      <Text style={[styles.legendText, styles.modalSessionText]}>
                        Sessions: {tempSessionNames.join(", ")}
                      </Text>
                    </View>
                  )}
                  <CalendarView
                    initialDate={formatDateKey(tempDate)}
                    markedDates={markedDates}
                    markingType="multi-dot"
                    onDayPress={handleCalendarDayPress}
                    enableSwipeMonths
                    theme={{
                      calendarBackground: theme.card,
                      textSectionTitleColor: theme.secondaryText,
                      todayTextColor: theme.primary,
                      dayTextColor: theme.text,
                      monthTextColor: theme.text,
                      arrowColor: theme.primary,
                      selectedDayBackgroundColor: theme.primary,
                      selectedDayTextColor: theme.primaryText,
                      textDisabledColor: theme.secondaryText,
                    }}
                  />
                  <View style={styles.timePickerWrapper}>
                    <Text style={[styles.pickerHeading, { color: theme.text }]}>Select time</Text>
                    
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={tempDate}
                        mode="time"
                        display="spinner"
                        onChange={handleTimePickerChange}
                        textColor={theme.text}
                      />
                    ) : (
                      <>
                        <TouchableOpacity 
                          onPress={() => setShowTimePickerAndroid(true)}
                          style={{
                            padding: 12,
                            backgroundColor: theme.background,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ fontSize: 18, color: theme.text }}>
                            {tempDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </TouchableOpacity>
                        {showTimePickerAndroid && (
                          <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="clock"
                            onChange={handleTimePickerChange}
                          />
                        )}
                      </>
                    )}
                  </View>
                  <Button
                    onPress={applySelectedDate}
                    style={{ backgroundColor: theme.primary, marginTop: 12 }}
                    textStyle={{ color: theme.primaryText }}
                  >
                    Save
                  </Button>
                </Pressable>
              </Pressable>
            </Modal>

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
            {!selectedHolidayNames?.length && showHolidayLoading && !holidayError && (
              <Text style={[styles.holidayStatusText, { color: theme.secondaryText }]}>
                Loading holidays…
              </Text>
            )}
            {holidayError && (
              <Text style={styles.holidayErrorText}>{holidayError}</Text>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <Button
            onPress={handleSave}
            style={{ backgroundColor: theme.primary }}
            textStyle={{ color: theme.primaryText }}
          >
            {isEditing ? "Update Session" : "Save Session"}
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100, // Add padding to avoid content being hidden behind footer
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  contentCard: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 8,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pickerContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  pickerHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  dotLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
  },
  timePickerWrapper: {
    marginTop: 16,
  },
  holidayPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 13,
    marginBottom: 12,
    color: DOTS.session.color,
    borderColor: DOTS.session.color,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  sessionPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 13,
    marginBottom: 12,
    color: DOTS.session.color,
    borderColor: DOTS.session.color,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  holidayErrorText: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 12,
  },
  modalHolidayBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
    borderColor: DOTS.session.color,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  modalSessionBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
    borderColor: DOTS.session.color,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  holidayStatusText: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalHolidayText: {
    color: DOTS.session.color,
  },
  modalSessionText: {
    color: DOTS.session.color,
  },
});