export type Session = {
    id: string;
    userId: string | undefined;
    subject: string;
    duration: number;         // minutes
    notes?: string;
    date?: string | null;     // ISO string (e.g. "2025-11-10T14:30:00.000Z")
    repeat?: boolean;         // repeat weekly
    completed?: boolean;       // whether the session has been completed
    completedAt?: string | null; // ISO string (e.g. "2025-11-10T14:30:00.000Z")
    rating?: number | null;           // 1-5
    scheduledNotificationId?: string | null; // For the 5-min reminder
};

export type SessionsState = {
  sessions: Session[];
  loading: boolean;
  error: string | null;
};

export type Quote = {
    content: string;
    author: string;
};

export type GamificationState = {
    streak: number;                  // current consecutive day streak
    sessionStreak: number;           // current consecutive session streak
    badges: string[];                // unlocked badges
    totalSessionsCompleted: number;  // total sessions completed
    lastCompletedAt?: string;        // ISO string of last completed session
    sessionsToday: number;           // number of sessions completed today
}

export type CalendarMarkedDates = Record<
  string,
  {
    dots: { key: string; color: string }[];
    marked?: boolean;
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  }
>;

export type HolidayMap = Record<string, string[]>;

export type CalendarDay = {
  dateString: string;
  day: number;
  month: number;
  year: number;
};

export type HolidayResponse = {
  holidays?: Array<{
    date: string;
    nameEn: string;
  }>;
};