import AsyncStorage from "@react-native-async-storage/async-storage";

export interface GamificationState {
  streak: number;                  // current consecutive day streak
  sessionStreak: number;           // current consecutive session streak
  badges: string[];                // unlocked badges
  totalSessionsCompleted: number;  // total sessions completed
  lastCompletedAt?: string;        // ISO string of last completed session
  sessionsToday: number;           // number of sessions completed today
}

// Key used for AsyncStorage
const STORAGE_KEY = "@gamification_state";

/**
 * loadState
 * Loads the gamification state from storage.
 */
export async function loadState(): Promise<GamificationState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // default state
      return {
        streak: 0,
        sessionStreak: 0,
        badges: [],
        totalSessionsCompleted: 0,
        sessionsToday: 0,
      };
    }
    return JSON.parse(raw) as GamificationState;
  } catch (e) {
    console.warn("Failed to load gamification state", e);
    return {
      streak: 0,
      sessionStreak: 0,
      badges: [],
      totalSessionsCompleted: 0,
      sessionsToday: 0,
    };
  }
}

/**
 * saveState
 * Persists the gamification state to storage.
 */
export async function saveState(state: GamificationState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save gamification state", e);
  }
}

/**
 * recordSessionCompleted
 * Call this whenever a session is completed.
 * Updates streaks, session streak, badges, sessionsToday, and total sessions.
 */
export async function recordSessionCompleted(): Promise<GamificationState> {
  const state = await loadState();
  const now = new Date();

  // Reset sessionsToday if last completed session was on a different day
  if (state.lastCompletedAt) {
    const last = new Date(state.lastCompletedAt);
    if (
      last.getFullYear() !== now.getFullYear() ||
      last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate()
    ) {
      state.sessionsToday = 0;
    }
  }

  // Increment sessionsToday
  state.sessionsToday = (state.sessionsToday ?? 0) + 1;

  // Calculate day streak
  if (state.lastCompletedAt) {
    const last = new Date(state.lastCompletedAt);
    const diffDays = Math.floor(
      (now.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      state.streak += 1; // continue streak
    } else if (diffDays > 1) {
      state.streak = 1; // reset streak
    }
    // diffDays === 0 => same day, streak unchanged
  } else {
    state.streak = 1; // first session ever
  }

  // Update session streak (increment every session, reset if last session was more than 24h ago)
  if (state.lastCompletedAt) {
    const last = new Date(state.lastCompletedAt);
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 24) {
      state.sessionStreak += 1; // continue session streak
    } else {
      state.sessionStreak = 1; // reset session streak
    }
  } else {
    state.sessionStreak = 1; // first session ever
  }

  // Update last completed date
  state.lastCompletedAt = now.toISOString();

  // Increment total sessions
  state.totalSessionsCompleted += 1;

  // Award badges
  const newBadges: string[] = [];

  if (state.streak === 7 && !state.badges.includes("7-Day Streak 🔥")) {
    newBadges.push("7-Day Streak 🔥");
  }

  //if (state.totalSessionsCompleted === 10 && !state.badges.includes("10 Sessions Completed 🏆")) {
  //  newBadges.push("10 Sessions Completed 🏆");
  //}

  if (newBadges.length > 0) {
    state.badges.push(...newBadges);
  }

  // Persist state
  await saveState(state);

  return state;
}

/**
 * recordSessionUncompleted
 * Call this whenever a session is "un-completed" (e.g. restarted).
 * Decrements session counters. Does not currently adjust streaks or badges.
 */
export async function recordSessionUncompleted(): Promise<GamificationState> {
  const state = await loadState();
  const now = new Date();

  // Decrement total sessions, ensuring it doesn't go below zero
  state.totalSessionsCompleted = Math.max(0, state.totalSessionsCompleted - 1);

  // Check if the last completion was today and decrement if so
  if (state.lastCompletedAt) {
    const last = new Date(state.lastCompletedAt);
    if (
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate()
    ) {
      state.sessionsToday = Math.max(0, (state.sessionsToday ?? 0) - 1);
    }
  }

  // Note: This logic does not reverse streak calculation, as it can be complex.
  // For this app's purpose, we'll just decrement the counters.

  await saveState(state);
  return state;
}

/**
 * resetGamification
 * Clears gamification state (useful for testing or logout)
 */
export async function resetGamification(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to reset gamification state", e);
  }
}
