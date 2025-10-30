"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./app-shell.module.css";

type IconComponent = () => JSX.Element;

const TaskIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 12.5l2.5 2.5L17 7.5M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 3v3m10-3v3M5 8h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm3 6h2v2H9v-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm8.5-3.5a1 1 0 01.78.36l1.07 1.32a1 1 0 01-.08 1.32l-1.32 1.32a1 1 0 01-1.1.2l-1.56-.64a6.68 6.68 0 01-1.45.84l-.23 1.7a1 1 0 01-.99.88h-1.88a1 1 0 01-.99-.88l-.23-1.7a6.68 6.68 0 01-1.45-.84l-1.56.64a1 1 0 01-1.1-.2l-1.32-1.32a1 1 0 01-.08-1.32l1.07-1.32a6.7 6.7 0 010-1.68L4.1 9.32a1 1 0 01.08-1.32l1.32-1.32a1 1 0 011.1-.2l1.56.64a6.68 6.68 0 011.45-.84l.23-1.7A1 1 0 0110.83 4h1.88a1 1 0 01.99.88l.23 1.7a6.68 6.68 0 011.45.84l1.56-.64a1 1 0 011.1.2l1.32 1.32a1 1 0 01.08 1.32l-1.07 1.32c.06.28.09.56.09.84z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NAVIGATION: { href: string; label: string; Icon: IconComponent }[] = [
  { href: "/tasks", label: "Tâches", Icon: TaskIcon },
  { href: "/calendar", label: "Calendrier", Icon: CalendarIcon },
  { href: "/settings", label: "Réglages", Icon: SettingsIcon },
];

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    isAuthenticated,
    loadingSession,
    requestSignIn,
    requestSignOut,
    syncing,
    syncNow,
    lastSync,
    syncError,
  } = useDashboard();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const active = useMemo(() => pathname?.replace(/\/$/, "") || "/overview", [pathname]);

  useEffect(() => {
    setSettingsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [settingsOpen]);

  return (
    <div className={styles.viewport}>
      <header className={styles.topbar}>
        <Link href="/overview" className={styles.brand}>
          <span className={styles.brandDot} />
          <span className={styles.brandText}>
            <strong>Family Connect</strong>
            <span>Pilotage familial</span>
          </span>
        </Link>
        <div className={styles.topbarActions}>
          <SyncBadge
            syncing={syncing}
            lastSync={lastSync}
            error={syncError}
            onSync={() => syncNow()}
            disabled={syncing || !isAuthenticated}
          />
          <div className={styles.accountCluster}>
            {isAuthenticated ? (
              <button type="button" className={styles.secondaryButton} onClick={() => requestSignOut()}>
                Se déconnecter
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => requestSignIn()}
                disabled={loadingSession}
              >
                {loadingSession ? "Connexion…" : "Connexion Google"}
              </button>
            )}
            <button
              type="button"
              className={styles.settingsToggle}
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-controls="app-shell-settings"
              aria-label="Ouvrir le menu paramètres"
            >
              <SettingsIcon />
            </button>
            <div
              id="app-shell-settings"
              className={settingsOpen ? styles.settingsSheetOpen : styles.settingsSheet}
              role="menu"
            >
              <Link href="/settings" role="menuitem" onClick={() => setSettingsOpen(false)}>
                Tableau de personnalisation
              </Link>
              <Link href="/settings#family" role="menuitem" onClick={() => setSettingsOpen(false)}>
                Famille & accès
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSettingsOpen(false);
                  syncNow({ silent: true });
                }}
              >
                Relancer la synchro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.actionDock} aria-label="Navigation principale">
        {NAVIGATION.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={active === href ? styles.dockItemActive : styles.dockItem}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {settingsOpen ? <div className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)} /> : null}

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
