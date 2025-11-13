export type Session = {
    id: string;
    subject: string;
    duration: number;         // minutes
    notes?: string;
    date?: string | null;     // ISO string (e.g. "2025-11-10T14:30:00.000Z")
    repeat?: boolean;         // repeat weekly
  };