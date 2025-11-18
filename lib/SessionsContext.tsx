// contexts/SessionsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  getSessions,
  saveSession,
  updateSession as persistUpdateSession,
  deleteSession as persistDeleteSession,
} from "./sessions";
import { Session } from "../types";

// --- gamification imports ---
import {
  loadState as loadGamificationState,
  recordSessionCompleted,
  recordSessionUncompleted,
  resetGamification,
} from "../lib/gamification";
import {
  scheduleSessionReminder,
  cancelReminder as cancelSessionReminder,
  ensureNotificationPermissions,
} from "../lib/notifications";
import {
  saveSessionToFirestore,
  updateSessionInFirestore,
  deleteSessionFromFirestore,
  saveGamificationToFirestore,
} from "./firestoreData";
import { useAuth } from "./AuthContext";
import { GamificationState, SessionsState } from "../types";
import { Alert } from "react-native";

type SessionsAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; payload: Session[] }
  | { type: "LOAD_FAILURE"; payload: string }
  | { type: "ADD_SESSION"; payload: Session }
  | { type: "UPDATE_SESSION"; payload: { id: string; patch: Partial<Session> } }
  | { type: "DELETE_SESSION"; payload: string };

type SessionsContextValue = {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refreshSessions: () => Promise<void>;
  addSession: (session: Session) => Promise<void>;
  updateSession: (id: string, patch: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  restartSession: (id: string) => Promise<void>;
  clearSessions: () => Promise<void>;
  rateSession: (id: string, rating: number) => Promise<void>;

  // gamification API
  completeSession: (id: string) => Promise<{ gamification: GamificationState | null; session?: Session }>;
  refreshGamification: () => Promise<void>;
  gamification: GamificationState | null;
};

const SessionsContext = createContext<SessionsContextValue | undefined>(undefined);

const initialState: SessionsState = {
  sessions: [],
  loading: false,
  error: null,
};

function sessionsReducer(state: SessionsState, action: SessionsAction): SessionsState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { sessions: action.payload, loading: false, error: null };
    case "LOAD_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };
    case "UPDATE_SESSION":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.payload.id ? { ...session, ...action.payload.patch } : session
        ),
      };
    case "DELETE_SESSION":
      return {
        ...state,
        sessions: state.sessions.filter((session) => session.id !== action.payload),
      };
    default:
      return state;
  }
}

type ProviderProps = {
  children: React.ReactNode;
};

export function SessionsProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(sessionsReducer, initialState);

  // gamification state
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const { user, cachedUser } = useAuth();

  const syncToFirestore = useCallback(
    async (operation: string, task: (uid: string) => Promise<void>) => {
      const uid = user?.uid ?? cachedUser?.uid ?? null;
      if (!uid) return;
      try {
        await task(uid);
      } catch (error) {
        console.warn(`Firestosre sync failed (${operation})`, error);
      }
    },
    [user, cachedUser]
  );

  const refreshSessions = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const uid = user?.uid ?? cachedUser?.uid ?? null;
      const loaded = await getSessions(uid);
      dispatch({ type: "LOAD_SUCCESS", payload: loaded });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load study sessions at this time.";
      dispatch({ type: "LOAD_FAILURE", payload: message });
    }
  }, [user, cachedUser]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    (async () => {
      try {
        const g = await loadGamificationState();
        setGamification(g);
      } catch (e) {
        console.warn("Failed to load gamification state", e);
      }
    })();
  }, []);

  // Effect to sync gamification state from Firestore when user logs in
  useEffect(() => {
    const syncGamification = async () => {
      const uid = user?.uid ?? cachedUser?.uid ?? null;
      if (uid) {
        try {
          const cloudState = await loadGamificationState(uid);
          setGamification(cloudState);
        } catch (e) {
          console.warn("Failed to sync gamification state on auth change", e);
        }
      } else {
        // User is signed out, reset local gamification state
        try {
          await resetGamification();
          const defaultState = await loadGamificationState();
          setGamification(defaultState);
        } catch (e) {
          console.warn("Failed to reset gamification state on sign out", e);
        }
      }
    };
    syncGamification();
  }, [user, cachedUser]);

  const addSession = useCallback(
    async (session: Session) => {
      // First, ask for notification permissions if adding a session with a future date
      if (session.date && new Date(session.date) > new Date()) {
        const granted = await ensureNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications to receive reminders for your sessions."
          );
        }
      }

      // Schedule notification
      const notificationId = await scheduleSessionReminder(session);
      const sessionWithNotification = { ...session, scheduledNotificationId: notificationId };

      dispatch({ type: "ADD_SESSION", payload: sessionWithNotification });
      try {
        await saveSession(sessionWithNotification);
        await syncToFirestore("add session", (cloudUid) => saveSessionToFirestore(sessionWithNotification, cloudUid));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save the new study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions, syncToFirestore]
  );

  const updateSession = useCallback(
    async (id: string, patch: Partial<Session>) => {
      // --- Notification Handling ---
      const originalSession = state.sessions.find((s) => s.id === id);

      // 1. Cancel previous notification if it exists
      if (originalSession?.scheduledNotificationId) {
        await cancelSessionReminder(originalSession.scheduledNotificationId);
      }

      // 2. Schedule a new one if there's a new date
      const updatedSessionData = { ...originalSession, ...patch };
      const newNotificationId = await scheduleSessionReminder(updatedSessionData as Session);
      const finalPatch = { ...patch, scheduledNotificationId: newNotificationId };
      // --- End Notification Handling ---

      dispatch({ type: "UPDATE_SESSION", payload: { id, patch: finalPatch } });
      try {
        await persistUpdateSession(id, finalPatch);
        await syncToFirestore("update session", (cloudUid) => updateSessionInFirestore(id, finalPatch, cloudUid));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update the study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions, syncToFirestore, state.sessions]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      // Cancel the notification associated with the session being deleted
      const sessionToDelete = state.sessions.find((s) => s.id === id);
      if (sessionToDelete?.scheduledNotificationId) {
        await cancelSessionReminder(sessionToDelete.scheduledNotificationId);
      }

      dispatch({ type: "DELETE_SESSION", payload: id });
      try {
        await persistDeleteSession(id);
        await syncToFirestore("delete session", (cloudUid) => deleteSessionFromFirestore(id, cloudUid));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete the study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions, syncToFirestore, state.sessions]
  );

  const restartSession = useCallback(
    async (id: string) => {
      // First, check if the session was previously completed to adjust gamification
      const sessionToRestart = state.sessions.find((s) => s.id === id);
      if (sessionToRestart?.completed) {
        try {
          const uid = user?.uid ?? cachedUser?.uid ?? null;
          const g = await recordSessionUncompleted(uid);
          setGamification(g);
          await syncToFirestore("update gamification", (cloudUid) => saveGamificationToFirestore(g, cloudUid));
        } catch (e) {
          console.warn("Failed to update gamification state on restart", e);
        }
      }

      if (sessionToRestart?.scheduledNotificationId) {
        await cancelSessionReminder(sessionToRestart.scheduledNotificationId);
      }

      const patch = { completed: false, completedAt: null, rating: -1, scheduledNotificationId: null };
      dispatch({ type: "UPDATE_SESSION", payload: { id, patch } });
      try {
        await persistUpdateSession(id, patch);
        await syncToFirestore("restart session", (cloudUid) => updateSessionInFirestore(id, patch, cloudUid));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to restart the study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions, syncToFirestore, state.sessions, user, cachedUser]
  );

  const rateSession = useCallback(
    async (id: string, rating: number) => {
      await updateSession(id, { rating });
    },
    [updateSession]
  );

  const clearSessions = useCallback(
    async () => {
      const uid = user?.uid ?? cachedUser?.uid ?? null;
      if (!uid) return;
      dispatch({ type: "LOAD_START" });
      const sessionsToDelete = state.sessions.filter((session) => session.userId === uid);
      for (const session of sessionsToDelete) {
        try {
          dispatch({ type: "DELETE_SESSION", payload: session.id });
          await persistDeleteSession(session.id);
        } catch (error) {
          console.warn("Failed to delete session", error);
        }
      }
      dispatch({ type: "LOAD_SUCCESS", payload: [] });
      await refreshSessions();
    },
    [refreshSessions, state.sessions, deleteSession, user, cachedUser]
  );

  const completeSession = useCallback(
    async (id: string) => {
      let updatedSession: Session | undefined;
      const completedAtIso = new Date().toISOString();

      dispatch({
        type: "UPDATE_SESSION",
        payload: { id, patch: { completed: true, completedAt: completedAtIso } as Partial<Session> },
      });

      try {
        await persistUpdateSession(id, { completed: true, completedAt: completedAtIso });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to persist session completion.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
        return { gamification: null, session: undefined };
      }

      await syncToFirestore("complete session", (cloudUid) =>
        updateSessionInFirestore(id, { completed: true, completedAt: completedAtIso }, cloudUid)
      );

      try {
        const uid = user?.uid ?? cachedUser?.uid ?? null;
        const g = await recordSessionCompleted(uid);
        setGamification(g);
        await syncToFirestore("update gamification", (cloudUid) => saveGamificationToFirestore(g, cloudUid));

        try {
          const latestSessions = await getSessions();
          updatedSession = latestSessions.find((s) => s.id === id);
        } catch (e) {
          console.warn("Warning: failed to reload sessions after completion", e);
        }

        return { gamification: g, session: updatedSession };
      } catch (e) {
        console.error("recordSessionCompleted failed", e);
        try {
          const latestSessions = await getSessions();
          updatedSession = latestSessions.find((s) => s.id === id);
        } catch (err) {
          console.warn("Failed to fetch sessions after gamification failure", err);
        }
        return { gamification: null, session: updatedSession };
      }
    },
    [refreshSessions, syncToFirestore, user, cachedUser]
  );

  const refreshGamification = useCallback(async () => {
    try {
      const g = await loadGamificationState();
      setGamification(g);
    } catch (e) {
      console.warn("Failed to refresh gamification", e);
    }
  }, []);

  const value = useMemo(
    () => ({
      sessions: state.sessions,
      loading: state.loading,
      error: state.error,
      refreshSessions,
      addSession,
      updateSession,
      deleteSession,
      clearSessions,
      completeSession,
      restartSession,
      rateSession,
      refreshGamification,
      gamification,
    }),
    [
      state.sessions,
      state.loading,
      state.error,
      refreshSessions,
      addSession,
      updateSession,
      deleteSession,
      completeSession,
      restartSession,
      rateSession,
      clearSessions,
      refreshGamification,
      gamification,
    ]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }
  return context;
}
