// components/mid-fi/TabBar.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Home, User } from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "../../lib/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
type TabProps = {
  activeTab: "home" | "profile";
};

export function TabBar({ activeTab }: TabProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const handleTabPress = (tab: "home" | "profile") => {
    if (tab === "home") router.push("/");
    else router.push("/profile");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingBottom: Math.min(insets.bottom, 2),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleTabPress("home")}
      >
        <Home
          size={22}
          color={activeTab === "home" ? theme.primary : theme.secondaryText}
        />
        <Text
          style={[
            styles.label,
            { color: theme.secondaryText },
            activeTab === "home" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleTabPress("profile")}
      >
        <User
          size={22}
          color={activeTab === "profile" ? theme.primary : theme.secondaryText}
        />
        <Text
          style={[
            styles.label,
            { color: theme.secondaryText },
            activeTab === "profile" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});