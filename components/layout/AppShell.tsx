"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDaysIcon, CheckCircleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./app-shell.module.css";

type IconComponent = typeof CheckCircleIcon;

const NAVIGATION: { href: string; label: string; Icon: IconComponent }[] = [
  { href: "/tasks", label: "Tâches", Icon: CheckCircleIcon },
  { href: "/calendar", label: "Calendrier", Icon: CalendarDaysIcon },
  { href: "/settings", label: "Réglages", Icon: Cog6ToothIcon },
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

  const active = useMemo(() => pathname?.replace(/\/$/, "") || "/calendar", [pathname]);

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
        <Link href="/calendar" className={styles.brand}>
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
              <Cog6ToothIcon aria-hidden="true" />
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
            <Icon aria-hidden="true" className={styles.dockIcon} />
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
