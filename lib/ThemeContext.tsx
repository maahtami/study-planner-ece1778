import React, { createContext, useContext, useEffect, useState } from "react";
import { LightTheme, DarkTheme } from "./theme";
import { getSettings, saveSettings, Settings } from "./settings";

type ThemeContextType = {
  theme: typeof LightTheme;
  settings: Settings | null;
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [theme, setTheme] = useState(LightTheme);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      if (s) {
        setSettings(s);
        setTheme(s.theme === "dark" ? DarkTheme : LightTheme);
      } else {
        // Default fallback if no settings found
        const defaultSettings: Settings = {
          theme: "light",
          notificationsEnabled: false,
          reminderISOTime: "09:00",
          scheduledNotificationId: null,
        };
        setSettings(defaultSettings);
        setTheme(LightTheme);
      }
    })();
  }, []);

  const toggleTheme = async () => {
    if (!settings) return;

    const newTheme: "light" | "dark" =
      settings.theme === "dark" ? "light" : "dark";

    // 👇 Ensure the updated object strictly matches Settings type
    const updated: Settings = {
      ...settings,
      theme: newTheme,
    };

    setSettings(updated);
    await saveSettings(updated);
    setTheme(newTheme === "dark" ? DarkTheme : LightTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, settings, setSettings, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};