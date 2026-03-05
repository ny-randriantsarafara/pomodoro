export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isNotificationSupported()) return null;
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function sendTimerCompleteNotification(task: string): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  new Notification("Focus Complete", {
    body: `"${task}" — time for a break!`,
  });
}
