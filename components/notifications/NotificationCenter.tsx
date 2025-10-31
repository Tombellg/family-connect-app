"use client";

import Link from "next/link";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { DashboardNotification } from "@/lib/notifications";
import { formatRelativeToNow } from "@/lib/notifications";
import styles from "./notification-center.module.css";

type NotificationCenterProps = {
  notifications: DashboardNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onNavigate: (id: string) => void;
};

const CATEGORY_ICONS: Record<DashboardNotification["category"], typeof CalendarDaysIcon> = {
  event: CalendarDaysIcon,
  task: CheckCircleIcon,
  system: InformationCircleIcon,
};

export function NotificationCenter({
  notifications,
  onDismiss,
  onClearAll,
  onNavigate,
}: NotificationCenterProps) {
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <h3>Notifications</h3>
          <p>{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}</p>
        </div>
        {notifications.length ? (
          <button type="button" className={styles.clearButton} onClick={onClearAll}>
            Tout effacer
          </button>
        ) : null}
      </header>
      <div className={styles.content}>
        {notifications.length ? (
          <ul className={styles.list} role="list">
            {notifications.map((notification) => {
              const Icon = CATEGORY_ICONS[notification.category] ?? InformationCircleIcon;
              return (
                <li
                  key={notification.id}
                  className={styles.item}
                  data-unread={!notification.read || undefined}
                >
                  <span className={styles.icon} data-category={notification.category}>
                    <Icon aria-hidden="true" />
                  </span>
                  <div className={styles.details}>
                    <div className={styles.titleRow}>
                      <p className={styles.title}>{notification.title}</p>
                      <time
                        className={styles.timestamp}
                        dateTime={notification.timestamp}
                        title={new Date(notification.timestamp).toLocaleString("fr-FR")}
                      >
                        {formatRelativeToNow(notification.timestamp)}
                      </time>
                    </div>
                    <p className={styles.message}>{notification.message}</p>
                    {notification.action ? (
                      <Link
                        href={notification.action.href}
                        className={styles.action}
                        onClick={() => onNavigate(notification.id)}
                      >
                        {notification.action.label}
                      </Link>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.dismiss}
                    onClick={() => onDismiss(notification.id)}
                    aria-label="Ignorer la notification"
                  >
                    <XMarkIcon aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty}>
            <p>Vous êtes à jour ✨</p>
            <p>Aucune notification pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
