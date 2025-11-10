import AsyncStorage from "@react-native-async-storage/async-storage";

export type Settings = {
  notificationsEnabled: boolean;
  reminderISOTime: string; // e.g. "09:00"
  theme: "light" | "dark";
  scheduledNotificationId?: string | null;
};

const SETTINGS_KEY = "app_settings";

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: false,
  reminderISOTime: "09:00",
  theme: "light",
  scheduledNotificationId: null,
};

export async function getSettings(): Promise<Settings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    const data = JSON.parse(json);
    return { ...DEFAULT_SETTINGS, ...data };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

export async function clearSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error("Failed to clear settings:", error);
  }
}