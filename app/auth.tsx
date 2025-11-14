import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";

import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { useGlobalStyles } from "../styles/globalStyles";
import { ArrowLeft } from "lucide-react-native";
import { useSessions } from "../lib/SessionsContext";

type AuthMode = "signIn" | "signUp";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as FirebaseAuthTypes.NativeFirebaseAuthError).code;
    switch (code) {
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-not-found":
      case "auth/invalid-credential":
        return "No account found for that email.";
      case "auth/wrong-password":
        return "Incorrect password. Try again.";
      case "auth/email-already-in-use":
        return "An account already exists with that email.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        break;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function AuthScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const { user, cachedUser, initializing, signIn, signUp, signOut } = useAuth();
  const { refreshSessions, clearSessions } = useSessions();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeTitle = mode === "signIn" ? "Sign in" : "Create account";
  const displayEmail = useMemo(
    () => user?.email ?? cachedUser?.email ?? "",
    [user, cachedUser]
  );

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "signIn") {
        await signIn(trimmedEmail, password);
        await refreshSessions();
      } else {
        await signUp(trimmedEmail, password);
        await refreshSessions();
      }
      setEmail("");
      setPassword("");
      router.replace("/profile");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const uid = user?.uid ?? cachedUser?.uid;
      if (uid) {
        await clearSessions();
      }

      await signOut();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const goBackToProfile = () => {
    router.replace("/profile");
  };

  if (initializing) {
    return (
      <SafeAreaView style={[globalStyles.container, styles.center]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isSignedIn = Boolean(user);

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <TouchableOpacity
            style={[
                styles.backButton,
                { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={() => router.replace("/profile")}
            >
            <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              {isSignedIn ? "You're signed in" : activeTitle}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              {isSignedIn
                ? "You're all set. Manage your account or sign out below."
                : "Use your email and password to access your study planner securely."}
            </Text>

            {isSignedIn ? (
              <View style={styles.signedInWrapper}>
                <Text style={[styles.statusText, { color: theme.text }]}>
                  Signed in as
                </Text>
                <Text style={[styles.emailText, { color: theme.text }]}>
                  {displayEmail || "Unknown user"}
                </Text>
                {error && (
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {error}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.outlineButton,
                    { borderColor: theme.border, backgroundColor: theme.primary },
                  ]}
                  onPress={handleSignOut}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text
                      style={[styles.outlineButtonText, { color: theme.primaryText }]}
                    >
                      Sign out
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={theme.secondaryText}
                    value={email}
                    onChangeText={setEmail}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text,
                      },
                    ]}
                    editable={!busy}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Password
                  </Text>
                  <TextInput
                    secureTextEntry
                    placeholder="Enter your password"
                    placeholderTextColor={theme.secondaryText}
                    value={password}
                    onChangeText={setPassword}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text,
                      },
                    ]}
                    editable={!busy}
                  />
                  <Text style={[styles.helperText, { color: theme.secondaryText }]}>
                    Password must be at least 6 characters.
                  </Text>
                </View>
                {error && (
                  <Text style={[styles.errorText, { color: "#DC2626" }]}>
                    {error}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSubmit}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.primaryText} />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: theme.primaryText },
                      ]}
                    >
                      {mode === "signIn" ? "Sign in" : "Create account"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchWrapper}
                  onPress={() => {
                    setMode((prev) => (prev === "signIn" ? "signUp" : "signIn"));
                    setError(null);
                  }}
                  disabled={busy}
                >
                  <Text style={[styles.switchText, { color: theme.text }]}>
                    {mode === "signIn"
                      ? "Need an account? Tap to create one."
                      : "Already have an account? Tap to sign in."}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 0,
    marginTop: -10,
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  switchWrapper: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  signedInWrapper: {
    gap: 16,
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emailText: {
    fontSize: 18,
    fontWeight: "700",
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

