"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  BellIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import styles from "./app-shell.module.css";

type IconComponent = typeof CheckCircleIcon;

const NAVIGATION: { href: string; label: string; Icon: IconComponent }[] = [
  { href: "/calendar", label: "Calendrier", Icon: CalendarDaysIcon },
  { href: "/tasks", label: "Tâches", Icon: CheckCircleIcon },
  { href: "/settings", label: "Réglages", Icon: Cog6ToothIcon },
];

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type CalendarViewMode = "month" | "list";

type CalendarTopbarState = {
  monthLabel: string;
  viewMode: CalendarViewMode;
};

type SyncBadgeProps = {
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
  onSync: () => void;
  disabled: boolean;
};

function formatSyncLabel(syncing: boolean, lastSync: Date | null) {
  if (syncing) {
    return "Synchronisation…";
  }
  if (!lastSync) {
    return "Jamais synchronisé";
  }
  return `À jour · ${lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function SyncBadge({ syncing, lastSync, error, onSync, disabled }: SyncBadgeProps) {
  const title = error
    ? `Erreur de synchronisation : ${error}`
    : lastSync
    ? `Dernière synchronisation le ${lastSync.toLocaleDateString("fr-FR", { dateStyle: "medium" })} à ${lastSync.toLocaleTimeString(
        "fr-FR",
        { hour: "2-digit", minute: "2-digit" }
      )}`
    : "Aucune synchronisation enregistrée";

  return (
    <button
      type="button"
      className={styles.syncChip}
      onClick={onSync}
      disabled={disabled}
      aria-label="Relancer la synchronisation"
      title={title}
      data-error={Boolean(error) || undefined}
    >
      <span className={`${styles.syncDot} ${syncing ? styles.syncDotActive : ""}`} />
      <span>{formatSyncLabel(syncing, lastSync)}</span>
    </button>
  );
}

function GoogleOneTapPrompt() {
  const { isAuthenticated, requestSignIn, loadingSession } = useDashboard();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!GOOGLE_CLIENT_ID || isAuthenticated || loadingSession) {
      return;
    }
    let cancelled = false;

    const attemptInitialization = () => {
      const google = (window as typeof window & { google?: any }).google;
      if (!google?.accounts?.id) {
        if (!cancelled) {
          window.setTimeout(attemptInitialization, 400);
        }
        return;
      }

      if (initialized.current) {
        google.accounts.id.prompt();
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: () => {
          if (!cancelled) {
            requestSignIn();
          }
        },
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
        prompt_parent_id: "one-tap-anchor",
      });
      google.accounts.id.prompt();
      initialized.current = true;
    };

    attemptInitialization();

    return () => {
      cancelled = true;
      const google = (window as typeof window & { google?: any }).google;
      google?.accounts?.id?.cancel?.();
    };
  }, [isAuthenticated, loadingSession, requestSignIn]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return <div id="one-tap-anchor" className={styles.oneTapAnchor} aria-hidden />;
}

type SearchSuggestion = {
  id: string;
  label: string;
  description?: string;
  dateKey: string | null;
  href?: string;
  type: "event" | "task";
};

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    isAuthenticated,
    loadingSession,
    requestSignIn,
    requestSignOut,
    syncing,
    syncNow,
    lastSync,
    syncError,
    events,
    taskLists,
    notifications,
    unreadNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    dismissNotification,
    clearNotifications,
  } = useDashboard();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [desktopCreateOpen, setDesktopCreateOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const desktopCreateRef = useRef<HTMLDivElement | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [calendarTopbar, setCalendarTopbar] = useState<CalendarTopbarState>(() => ({
    monthLabel: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    viewMode: "month",
  }));

  const active = useMemo(() => pathname?.replace(/\/$/, "") || "/calendar", [pathname]);
  const onCalendarPage = active.startsWith("/calendar");

  useEffect(() => {
    setProfileOpen(false);
    setDesktopCreateOpen(false);
    setMobileCreateOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleCalendarTopbar = (event: Event) => {
      const detail = (event as CustomEvent<CalendarTopbarState>).detail;
      if (!detail) {
        return;
      }
      setCalendarTopbar(detail);
    };
    window.addEventListener("fc:calendar-topbar", handleCalendarTopbar);
    return () => window.removeEventListener("fc:calendar-topbar", handleCalendarTopbar);
  }, []);

  useEffect(() => {
    if (!onCalendarPage) {
      setCalendarTopbar((current) => ({
        ...current,
        monthLabel: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        viewMode: "month",
      }));
    }
  }, [onCalendarPage]);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [profileOpen]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    const closeOnClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsPopoverRef.current?.contains(target)) {
        return;
      }
      if (notificationsButtonRef.current?.contains(target)) {
        return;
      }
      setNotificationsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    markAllNotificationsRead();
  }, [markAllNotificationsRead, notificationsOpen]);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    const closeOnClick = (event: MouseEvent) => {
      const menu = profileMenuRef.current;
      if (!menu) {
        return;
      }
      if (menu.contains(event.target as Node)) {
        return;
      }
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeOnClick);
    return () => document.removeEventListener("mousedown", closeOnClick);
  }, [profileOpen]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    const closeOnOutside = (event: MouseEvent) => {
      if (!popoverRef.current) {
        return;
      }
      if (!popoverRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  const searchSource = useMemo<SearchSuggestion[]>(() => {
    const items: SearchSuggestion[] = [];
    events.forEach((event) => {
      const key = event.start?.iso?.split("T")[0] ?? null;
      items.push({
        id: `event:${event.id}`,
        label: event.summary ?? "Sans titre",
        description: event.location ?? event.organizer ?? undefined,
        dateKey: key,
        type: "event",
      });
    });
    taskLists.forEach((list) => {
      list.tasks.forEach((task) => {
        const key = task.due?.iso?.split("T")[0] ?? null;
        items.push({
          id: `task:${list.id}:${task.id}`,
          label: task.title,
          description: list.title,
          dateKey: key,
          type: "task",
        });
      });
    });
    return items;
  }, [events, taskLists]);

  const suggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return searchSource.slice(0, 6);
    }
    return searchSource
      .filter((item) => {
        const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 10);
  }, [searchSource, searchTerm]);

  const handleSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.dateKey) {
      window.dispatchEvent(
        new CustomEvent("fc:search-select", {
          detail: { dateKey: suggestion.dateKey, type: suggestion.type, id: suggestion.id },
        })
      );
    }
    setSearchOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    if (!desktopCreateOpen) {
      return;
    }
    const closeOnOutside = (event: MouseEvent) => {
      if (!desktopCreateRef.current?.contains(event.target as Node)) {
        setDesktopCreateOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [desktopCreateOpen]);

  useEffect(() => {
    if (!mobileCreateOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileCreateOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileCreateOpen]);

  const triggerCreate = (type: "event" | "task") => {
    if (type === "event") {
      window.dispatchEvent(new CustomEvent("fc:create"));
      window.dispatchEvent(new CustomEvent("fc:create-event"));
    } else {
      window.dispatchEvent(new CustomEvent("fc:create-task"));
    }
    setDesktopCreateOpen(false);
    setMobileCreateOpen(false);
  };

  const avatar = session?.user?.image;
  const initials = session?.user?.name?.slice(0, 2).toUpperCase();
  const today = new Date();
  const todayLabel = today.getDate();

  return (
    <div className={styles.viewport}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => window.dispatchEvent(new CustomEvent("fc:toggle-drawer"))}
            aria-label="Ouvrir le menu latéral"
          >
            <Bars3Icon aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setDesktopCreateOpen((value) => !value)}
            aria-label="Créer un évènement ou une tâche"
            aria-haspopup="menu"
            aria-expanded={desktopCreateOpen}
          >
            <PlusIcon aria-hidden="true" />
          </button>
          <div
            ref={desktopCreateRef}
            className={desktopCreateOpen ? styles.createPopoverOpen : styles.createPopover}
            role="menu"
          >
            <button type="button" onClick={() => triggerCreate("event")} role="menuitem">
              Nouvel évènement
            </button>
            <button type="button" onClick={() => triggerCreate("task")} role="menuitem">
              Nouvelle tâche
            </button>
          </div>
          {onCalendarPage ? (
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => window.dispatchEvent(new CustomEvent("fc:focus-today"))}
              aria-label="Mettre en avant la date du jour"
            >
              <span className={styles.todayBadge}>{todayLabel}</span>
            </button>
          ) : null}
          <Link href="/calendar" className={styles.topbarBrand}>
            <span className={styles.brandDot} />
            <span className={styles.brandText}>
              <strong>Family Connect</strong>
              <span>Pilotage familial</span>
            </span>
          </Link>
        </div>
        <div className={styles.topbarCenter}>
          {onCalendarPage ? (
            <div className={styles.calendarCluster}>
              <div className={styles.calendarStepper}>
                <button type="button" onClick={() => changeCalendarMonth("previous")} aria-label="Mois précédent">
                  <ChevronLeftIcon aria-hidden="true" />
                </button>
                <span className={styles.calendarLabel}>{calendarTopbar.monthLabel}</span>
                <button type="button" onClick={() => changeCalendarMonth("next")} aria-label="Mois suivant">
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              </div>
              <div className={styles.calendarViewSwitch} role="tablist" aria-label="Changer la vue du calendrier">
                <button
                  type="button"
                  role="tab"
                  data-active={calendarTopbar.viewMode === "month" || undefined}
                  aria-selected={calendarTopbar.viewMode === "month"}
                  onClick={() => setCalendarView("month")}
                >
                  <Squares2X2Icon aria-hidden="true" />
                  <span>Mois</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  data-active={calendarTopbar.viewMode === "list" || undefined}
                  aria-selected={calendarTopbar.viewMode === "list"}
                  onClick={() => setCalendarView("list")}
                >
                  <ListBulletIcon aria-hidden="true" />
                  <span>Liste</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.topbarRight}>
          <button
            type="button"
            className={styles.searchButton}
            onClick={() => setSearchOpen((value) => !value)}
            aria-expanded={searchOpen}
            aria-haspopup="dialog"
            aria-label={searchOpen ? "Fermer la recherche" : "Rechercher"}
          >
            <MagnifyingGlassIcon aria-hidden="true" />
          </button>
          {searchOpen ? (
            <div className={styles.searchPopover} ref={popoverRef} role="dialog" aria-label="Recherche">
              <label className={styles.searchHeader}>
                <MagnifyingGlassIcon aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher un évènement ou une tâche"
                />
              </label>
              <div className={styles.searchSuggestions}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className={styles.suggestionButton}
                    onClick={() => handleSuggestion(suggestion)}
                  >
                    <span>{suggestion.label}</span>
                    {suggestion.description ? <small>{suggestion.description}</small> : null}
                  </button>
                ))}
                {!suggestions.length ? <small>Aucun résultat</small> : null}
              </div>
            </div>
          ) : null}
          <div className={styles.notificationsWrapper}>
            <button
              type="button"
              className={styles.notificationButton}
              ref={notificationsButtonRef}
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              aria-label={notificationsOpen ? "Fermer les notifications" : "Afficher les notifications"}
              data-open={notificationsOpen || undefined}
              data-has-unread={unreadNotifications > 0 || undefined}
            >
              <BellIcon aria-hidden="true" />
              {unreadNotifications > 0 ? (
                <span className={styles.notificationBadge}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>
            <div
              ref={notificationsPopoverRef}
              className={notificationsOpen ? styles.notificationsPopoverOpen : styles.notificationsPopover}
              role="dialog"
              aria-label="Centre de notifications"
            >
              <NotificationCenter
                notifications={notifications}
                onDismiss={(id) => dismissNotification(id)}
                onClearAll={() => {
                  clearNotifications();
                  setNotificationsOpen(false);
                }}
                onNavigate={(id) => {
                  markNotificationRead(id);
                  setNotificationsOpen(false);
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            aria-controls="app-shell-profile-menu"
            aria-label={isAuthenticated ? "Ouvrir le menu du profil" : "Ouvrir le menu de connexion"}
          >
            <span className={styles.profileAvatar} data-authenticated={isAuthenticated || undefined}>
              {avatar ? (
                <Image src={avatar} alt="Profil" width={36} height={36} />
              ) : initials ? (
                <span>{initials}</span>
              ) : (
                <UserCircleIcon aria-hidden="true" />
              )}
            </span>
          </button>
          <div
            id="app-shell-profile-menu"
            ref={profileMenuRef}
            className={profileOpen ? styles.profileMenuOpen : styles.profileMenu}
            role="menu"
          >
            <div className={styles.menuSection}>
              <span className={styles.menuLabel}>{session?.user?.name ?? "Invité"}</span>
              {syncing || lastSync || syncError ? (
                <SyncBadge
                  syncing={syncing}
                  lastSync={lastSync}
                  error={syncError}
                  onSync={() => syncNow()}
                  disabled={syncing || !isAuthenticated}
                />
              ) : null}
            </div>
            <nav aria-label="Navigation principale" className={styles.menuSection}>
              {NAVIGATION.map(({ href, label, Icon }) => (
                <Link key={href} href={href} role="menuitem" data-active={active === href || undefined}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <div className={styles.menuSection}>
              {isAuthenticated ? (
                <button type="button" role="menuitem" onClick={() => requestSignOut()}>
                  <ArrowRightOnRectangleIcon aria-hidden="true" />
                  <span>Se déconnecter</span>
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => requestSignIn()} disabled={loadingSession}>
                  <ArrowRightOnRectangleIcon aria-hidden="true" />
                  <span>{loadingSession ? "Connexion…" : "Connexion Google"}</span>
                </button>
              )}
            </div>
          </div>
          <nav className={styles.appSwitch} aria-label="Basculer entre calendrier et tâches">
            <Link href="/calendar" data-active={active === "/calendar" || undefined}>
              <CalendarDaysIcon aria-hidden="true" />
              <span>Calendrier</span>
            </Link>
            <Link href="/tasks" data-active={active === "/tasks" || undefined}>
              <CheckCircleIcon aria-hidden="true" />
              <span>Tâches</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <button
        type="button"
        className={styles.mobileCreateButton}
        onClick={() => setMobileCreateOpen((value) => !value)}
        aria-label={mobileCreateOpen ? "Fermer le menu de création" : "Ouvrir le menu de création"}
        aria-expanded={mobileCreateOpen}
      >
        <PlusIcon aria-hidden="true" />
      </button>
      <nav
        className={mobileCreateOpen ? styles.mobileCreateSheetOpen : styles.mobileCreateSheet}
        aria-label="Création rapide"
      >
        <header>
          <span>Créer</span>
          <button type="button" onClick={() => setMobileCreateOpen(false)} aria-label="Fermer">
            ×
          </button>
        </header>
        <div>
          <button type="button" onClick={() => triggerCreate("event")}>Nouvel évènement</button>
          <button type="button" onClick={() => triggerCreate("task")}>Nouvelle tâche</button>
        </div>
      </nav>

      <GoogleOneTapPrompt />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <ShellContent>{children}</ShellContent>
    </DashboardProvider>
  );
}
