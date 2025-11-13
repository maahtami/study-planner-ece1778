// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { ThemeProvider } from "../lib/ThemeContext";
import { SessionsProvider } from "../lib/SessionsContext";
import { registerNotificationResponseListener } from "../lib/notifications";

function NotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    const responseSub = registerNotificationResponseListener((response) => {
      const targetScreen = response.notification.request.content.data?.screen;
      if (typeof targetScreen === "string") {
        router.push(targetScreen);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <SessionsProvider>
      <ThemeProvider>
        <NotificationBridge />
        <Stack screenOptions={{ headerShown: false, animation: "fade", animationDuration: 10 }} />
      </ThemeProvider>
    </SessionsProvider>
  );
}