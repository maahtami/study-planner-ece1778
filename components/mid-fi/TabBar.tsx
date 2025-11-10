// components/mid-fi/TabBar.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Home, User } from "lucide-react-native";
import { router } from "expo-router";

type TabProps = {
  activeTab: "home" | "profile";
};

export function TabBar({ activeTab }: TabProps) {
  const handleTabPress = (tab: "home" | "profile") => {
    if (tab === "home") router.push("/");
    else router.push("/profile");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleTabPress("home")}
      >
        <Home
          size={22}
          color={activeTab === "home" ? "#2563EB" : "#9CA3AF"}
        />
        <Text
          style={[
            styles.label,
            activeTab === "home" && { color: "#2563EB", fontWeight: "600" },
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
          color={activeTab === "profile" ? "#2563EB" : "#9CA3AF"}
        />
        <Text
          style={[
            styles.label,
            activeTab === "profile" && { color: "#2563EB", fontWeight: "600" },
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});