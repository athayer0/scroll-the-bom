import * as Notifications from 'expo-notifications';
import { addDays, dayKey, parseDay } from './dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const STREAK_ALERT = { hour: 20, minute: 30 };
const DAYS_AHEAD = 14;

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

type Options = {
  reminder: { hour: number; minute: number } | null;
  streakAlert: boolean;
  metToday: boolean;
  streak: number;
};

/**
 * Local notifications can't check "did you read today?" when they fire, so instead we schedule
 * one-off notifications for the next two weeks and skip today once the goal is met.
 * This runs on launch, on resume, and whenever the goal or settings change.
 */
export async function rescheduleReminders({ reminder, streakAlert, metToday, streak }: Options) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!reminder && !streakAlert) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    const now = new Date();
    const today = dayKey(now);
    for (let k = 0; k < DAYS_AHEAD; k++) {
      if (k === 0 && metToday) continue;
      const day = parseDay(addDays(today, k));
      const at = (h: number, m: number) => {
        const d = new Date(day);
        d.setHours(h, m, 0, 0);
        return d;
      };

      if (reminder) {
        const date = at(reminder.hour, reminder.minute);
        if (date > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Time to scroll scripture', body: 'Swipe through today’s chapters and close your ring.' },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
          });
        }
      }

      if (streakAlert) {
        const date = at(STREAK_ALERT.hour, STREAK_ALERT.minute);
        // Today we know the streak; on future days we assume it's still alive.
        const alive = k === 0 ? streak > 0 : true;
        if (date > now && alive) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: k === 0 ? `Your ${streak}-day streak is at risk 🔥` : 'Keep your streak alive 🔥',
              body: 'You haven’t hit today’s goal yet. A few minutes of scrolling will do it.',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
          });
        }
      }
    }
  } catch {
    // Notifications are best-effort; never crash the app over them.
  }
}
