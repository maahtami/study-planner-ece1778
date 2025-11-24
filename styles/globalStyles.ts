import { StyleSheet } from "react-native";
import { useTheme } from "../lib/ThemeContext";

export const useGlobalStyles = () => {
  const { theme } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerText: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 16,
    },
    headerCard: {
      paddingTop: 16,
      // paddingBottom: 12,
      marginBottom: -16,
      paddingHorizontal: 20,
    },
  });
};

export const DOTS = {
  holiday: { key: "holiday", color: "#FACC15" },
  session: { key: "session", color: "#3B82F6" },
} as const;
