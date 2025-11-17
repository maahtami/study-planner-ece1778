import auth from "@react-native-firebase/auth";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

import { Session, GamificationState } from "../types";

const USERS_COLLECTION = "users";
const SESSIONS_SUBCOLLECTION = "sessions";
const META_SUBCOLLECTION = "meta";
const GAMIFICATION_DOC_ID = "gamification";

type SessionWritePayload = Omit<Session, "id">;

function ensureUserId(explicitUid?: string): string {
  const uid = explicitUid ?? auth().currentUser?.uid;
  if (!uid) {
    throw new Error("A signed-in user is required to access Firestore data.");
  }
  return uid;
}

function userDoc(uid: string) {
  return firestore().collection(USERS_COLLECTION).doc(uid);
}

function sessionsCollection(uid: string) {
  return userDoc(uid).collection(SESSIONS_SUBCOLLECTION);
}

function gamificationDoc(uid: string) {
  return userDoc(uid).collection(META_SUBCOLLECTION).doc(GAMIFICATION_DOC_ID);
}

function cleanData<T extends object>(data: T) {
  const cleaned: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

function isTimestamp(value: unknown): value is FirebaseFirestoreTypes.Timestamp {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as FirebaseFirestoreTypes.Timestamp).toDate === "function"
  );
}

function timestampToIso(value: unknown): string | undefined | null {
  if (value == null) {
    return value as null | undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }
  return value as string | undefined;
}

function mapSessionDoc(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
): Session {
  const data = doc.data();
  const { date, completedAt, ...rest } = data;

  return {
    ...(rest as Omit<Session, "id" | "date" | "completedAt">),
    id: doc.id,
    date: timestampToIso(date) ?? null,
    completedAt: timestampToIso(completedAt) ?? null,
  };
}

export async function fetchSessionsFromFirestore(uid: string): Promise<Session[]> {
  const userId = ensureUserId(uid);
  const snapshot = await sessionsCollection(userId).orderBy("date", "desc").get();
  return snapshot.docs.map((doc) => mapSessionDoc(doc));
}

export async function saveSessionToFirestore(session: Session, uid?: string): Promise<void> {
  const userId = ensureUserId(uid);
  const { id, ...rest } = session;
  const payload: SessionWritePayload = rest;
  await sessionsCollection(userId).doc(id).set(cleanData(payload));
}

export async function updateSessionInFirestore(
  id: string,
  patch: Partial<Session>,
  uid?: string
): Promise<void> {
  const userId = ensureUserId(uid);
  const { id: _ignored, ...rest } = patch;
  await sessionsCollection(userId).doc(id).set(cleanData(rest), { merge: true });
}

export async function deleteSessionFromFirestore(id: string, uid?: string): Promise<void> {
  const userId = ensureUserId(uid);
  await sessionsCollection(userId).doc(id).delete();
}

export async function fetchGamificationFromFirestore(uid?: string): Promise<GamificationState | null> {
  const userId = ensureUserId(uid);
  const snapshot = await gamificationDoc(userId).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  if (!data) {
    return null;
  }

  const { lastCompletedAt, ...rest } = data;
  return {
    ...(rest as Omit<GamificationState, "lastCompletedAt">),
    lastCompletedAt: timestampToIso(lastCompletedAt) ?? undefined,
  };
}

export async function saveGamificationToFirestore(
  state: GamificationState,
  uid?: string
): Promise<void> {
  const userId = ensureUserId(uid);
  await gamificationDoc(userId).set(cleanData(state), { merge: true });
}

export async function mergeGamificationInFirestore(
  patch: Partial<GamificationState>,
  uid?: string
): Promise<void> {
  const userId = ensureUserId(uid);
  await gamificationDoc(userId).set(cleanData(patch), { merge: true });
}

