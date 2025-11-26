import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Device from "expo-device";

const REMINDER_CHANNEL_ID = "study-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Study Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    description: "Daily reminders to keep you on track with study sessions.",
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  await ensureAndroidChannel();
  return true;
}

export async function scheduleDailyReminder(
  isoTime: string,
  existingId?: string | null
): Promise<string | null> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch (error) {
      console.warn("Failed to cancel existing notification:", error);
    }
  }

  const [hourString, minuteString] = isoTime.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  const trigger: Notifications.DailyTriggerInput & { channelId?: string } = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };

  if (Platform.OS === "android") {
    trigger.channelId = REMINDER_CHANNEL_ID;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study Reminder",
        body: "Time to review your study plan and stay on track.",
        data: { screen: "/" },
        sound: "default",
      },
      trigger,
    });
    return id;
  } catch (error) {
    console.error("Failed to schedule reminder:", error);
    return null;
  }
}

export async function scheduleSessionReminder(session: {
  id: string;
  subject: string;
  date?: string | null;
}): Promise<string | null> {
  if (!session.date) return null;

  const sessionTime = new Date(session.date);
  const now = new Date();

  // If session is in the past, don't schedule
  if (sessionTime.getTime() <= now.getTime()) {
    return null;
  }

  // Default trigger: 5 minutes before
  let triggerDate = new Date(sessionTime);
  triggerDate.setMinutes(triggerDate.getMinutes() - 5);


  if (triggerDate.getTime() < now.getTime()) {
    // If less than 5 mins remaining, notify 10 seconds from now
    triggerDate = new Date(now.getTime() + 10 * 1000); 
    
    // Safety check: if even 5 seconds from now is after session start, just skip
    if (triggerDate.getTime() > sessionTime.getTime()) {
       return null; 
    }
  }

  const secondsUntilTrigger = (triggerDate.getTime() - now.getTime()) / 1000;
  console.log("Scheduling reminder for", session.subject, "in", secondsUntilTrigger, "seconds");

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study Session Reminder",
        body: `Your study session for "${session.subject}" is starting soon.`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger > 0 ? secondsUntilTrigger : 1,
      },
    });
    return notificationId;
  } catch (error) {
    console.error("Failed to schedule session reminder:", error);
    return null;
  }
}

export async function cancelReminder(identifier?: string | null) {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn("Failed to cancel reminder:", error);
  }
}

export function registerNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function registerNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

