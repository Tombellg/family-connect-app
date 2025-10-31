import { FormattedCalendarEvent, FormattedTaskList } from "@/lib/google";

export type NotificationCategory = "event" | "task" | "system";

export type NotificationAction = {
  label: string;
  href: string;
};

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  source: "auto" | "manual";
  action?: NotificationAction;
};

export type CreateNotificationPayload = {
  id?: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  action?: NotificationAction;
  timestamp?: string;
};

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function formatRelativeTime(target: Date, base: Date): string {
  const diffMs = target.getTime() - base.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < hour) {
    const minutes = Math.round(diffMs / minute);
    return RELATIVE_FORMATTER.format(minutes, "minute");
  }

  if (absMs < day) {
    const hours = Math.round(diffMs / hour);
    return RELATIVE_FORMATTER.format(hours, "hour");
  }

  const days = Math.round(diffMs / day);
  return RELATIVE_FORMATTER.format(days, "day");
}

export function formatRelativeToNow(timestamp: string, now = new Date()): string {
  const target = new Date(timestamp);
  if (Number.isNaN(target.getTime())) {
    return "maintenant";
  }
  return formatRelativeTime(target, now);
}

function buildEventNotification(event: FormattedCalendarEvent, now: Date): DashboardNotification | null {
  const startIso = event.start?.iso;
  if (!startIso) {
    return null;
  }
  const startDate = new Date(startIso);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const diffHours = (startDate.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (diffHours < 0 || diffHours > 48) {
    return null;
  }

  const relative = formatRelativeTime(startDate, now);
  const location = event.location ? ` à ${event.location}` : "";

  return {
    id: `event:${event.id}`,
    title: event.summary || "Évènement à venir",
    message: `Préparez-vous pour "${event.summary || "Évènement"}" (${relative})${location}.`,
    timestamp: startDate.toISOString(),
    category: "event",
    read: false,
    source: "auto",
    action: { label: "Voir dans le calendrier", href: "/calendar" },
  } satisfies DashboardNotification;
}

function buildTaskNotifications(list: FormattedTaskList, now: Date): DashboardNotification[] {
  return list.tasks.reduce<DashboardNotification[]>((accumulator, task) => {
    const dueIso = task.due?.iso;
    if (!dueIso || task.status === "completed") {
      return accumulator;
    }
    const dueDate = new Date(dueIso);
    if (Number.isNaN(dueDate.getTime())) {
      return accumulator;
    }
    const diffHours = (dueDate.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (diffHours > 48) {
      return accumulator;
    }

    const relative = formatRelativeTime(dueDate, now);
    const title = task.title || "Tâche";
    const overdue = diffHours < 0;
    const message = overdue
      ? `La tâche "${title}" est en retard (${relative}).`
      : `La tâche "${title}" est à rendre (${relative}).`;

    accumulator.push({
      id: `task:${task.id}`,
      title,
      message,
      timestamp: dueDate.toISOString(),
      category: "task",
      read: false,
      source: "auto",
      action: { label: "Ouvrir les tâches", href: "/tasks" },
    });

    return accumulator;
  }, []);
}

export function deriveNotificationsFromData(
  events: FormattedCalendarEvent[],
  taskLists: FormattedTaskList[]
): DashboardNotification[] {
  const now = new Date();
  const notifications: DashboardNotification[] = [];

  events.forEach((event) => {
    const notification = buildEventNotification(event, now);
    if (notification) {
      notifications.push(notification);
    }
  });

  taskLists.forEach((list) => {
    notifications.push(...buildTaskNotifications(list, now));
  });

  return notifications;
}
