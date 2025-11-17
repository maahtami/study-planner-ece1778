import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

type StoredAuthUser = {
  uid: string;
  email: string | null;
};

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  cachedUser: StoredAuthUser | null;
  initializing: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const STORAGE_KEY = "@studyplanner/auth-user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function serializeUser(user: FirebaseAuthTypes.User): StoredAuthUser {
  return {
    uid: user.uid,
    email: user.email ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [cachedUser, setCachedUser] = useState<StoredAuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: StoredAuthUser = JSON.parse(stored);
          setCachedUser(parsed);
        }
      } catch (error) {
        console.warn("Failed to restore auth cache", error);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);

      if (firebaseUser) {
        const data = serializeUser(firebaseUser);
        setCachedUser(data);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((error) => {
          console.warn("Failed to persist auth cache", error);
        });
      } else {
        setCachedUser(null);
        AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
          console.warn("Failed to clear auth cache", error);
        });
      }
    });

    return unsubscribe;
  }, [hydrated]);

  const signIn = useCallback(async (email: string, password: string) => {
    await auth().signInWithEmailAndPassword(email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return await auth().createUserWithEmailAndPassword(email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await auth().signOut();
  }, []);

  const refreshUser = useCallback(async () => {
    const current = auth().currentUser;
    if (current) {
      await current.reload();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      cachedUser,
      initializing: initializing || !hydrated,
      isSignedIn: Boolean(user || cachedUser),
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, cachedUser, initializing, hydrated, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

