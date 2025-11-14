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
  GamificationState,
} from "../lib/gamification";

type SessionsState = {
  sessions: Session[];
  loading: boolean;
  error: string | null;
};

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

  const refreshSessions = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const loaded = await getSessions();
      dispatch({ type: "LOAD_SUCCESS", payload: loaded });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load study sessions at this time.";
      dispatch({ type: "LOAD_FAILURE", payload: message });
    }
  }, []);

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

  const addSession = useCallback(
    async (session: Session) => {
      dispatch({ type: "ADD_SESSION", payload: session });
      try {
        await saveSession(session);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save the new study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions]
  );

  const updateSession = useCallback(
    async (id: string, patch: Partial<Session>) => {
      dispatch({ type: "UPDATE_SESSION", payload: { id, patch } });
      try {
        await persistUpdateSession(id, patch);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update the study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      dispatch({ type: "DELETE_SESSION", payload: id });
      try {
        await persistDeleteSession(id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete the study session.";
        dispatch({ type: "LOAD_FAILURE", payload: message });
        await refreshSessions();
      }
    },
    [refreshSessions]
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

      try {
        const g = await recordSessionCompleted();
        setGamification(g);

        try {
          const latestSessions = await getSessions();
          updatedSession = latestSessions.find((s) => s.id === id);
          dispatch({ type: "LOAD_SUCCESS", payload: latestSessions });
        } catch (e) {
          console.warn("Warning: failed to reload sessions after completion", e);
        }

        return { gamification: g, session: updatedSession };
      } catch (e) {
        console.error("recordSessionCompleted failed", e);
        try {
          const latestSessions = await getSessions();
          updatedSession = latestSessions.find((s) => s.id === id);
          dispatch({ type: "LOAD_SUCCESS", payload: latestSessions });
        } catch (err) {
          console.warn("Failed to fetch sessions after gamification failure", err);
        }
        return { gamification: null, session: updatedSession };
      }
    },
    [refreshSessions]
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
      completeSession,
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
