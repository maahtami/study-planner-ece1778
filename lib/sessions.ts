import AsyncStorage from "@react-native-async-storage/async-storage";

import { Session } from "../types";
import { fetchSessionsFromFirestore } from "./firestoreData";

const STORAGE_KEY = "study_sessions";
/** Load all sessions (safe fallback to []) */
export async function getSessions(uid: string | null = null): Promise<Session[]> {
  try {
    let sessions: Session[] = [];
    if (uid) {
      sessions = await fetchSessionsFromFirestore(uid);
    }
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      sessions = [...sessions, ...(JSON.parse(json) as Session[])];
    }
    return sessions;
  } catch (e) {
    console.error("getSessions failed:", e);
    return [];
  }
}

/** Save (append) a new session */
export async function saveSession(session: Session): Promise<void> {
  try {
    const all = await getSessions();
    const updated = [...all, session];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("saveSession failed:", e);
  }
}

/** Get one by id */
export async function getSessionById(id: string): Promise<Session | null> {
  const all = await getSessions();
  return all.find(s => s.id === id) ?? null;
}

/** Update one by id with a partial patch */
export async function updateSession(
  id: string,
  patch: Partial<Session>
): Promise<void> {
  const all = await getSessions();
  const updated = all.map(s => (s.id === id ? { ...s, ...patch } : s));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Delete one by id */
export async function deleteSession(id: string): Promise<void> {
  try {
    const all = await getSessions();
    const filtered = all.filter(s => s.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("deleteSession failed:", e);
  }
}

/** Remove all sessions */
export async function clearSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("clearSessions failed:", e);
  }
}

/** Compute consecutive-day streak ending today (local) */
export function computeStreak(sessions: Session[]): number {
  const dayKeys = new Set(
    sessions
      .filter(s => !!s.date)
      .map(s => {
        const d = new Date(s.date as string);
        // normalize to local date components
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  if (dayKeys.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // walk back day by day while we find activity
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (dayKeys.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}