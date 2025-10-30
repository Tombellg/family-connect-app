"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./app-shell.module.css";

const NAVIGATION = [
  { href: "/overview", label: "Accueil", icon: "🏠" },
  { href: "/tasks", label: "Tâches", icon: "✅" },
  { href: "/calendar", label: "Calendrier", icon: "🗓️" },
  { href: "/family", label: "Famille", icon: "👨‍👩‍👧" },
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
    return "Aucune synchro";
  }
  return `À jour · ${lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function SyncBadge({ syncing, lastSync, error, onSync, disabled }: SyncBadgeProps) {
  const title = error
    ? `Erreur de synchronisation : ${error}`
    : lastSync
    ? `Dernière synchronisation le ${lastSync.toLocaleDateString("fr-FR", { dateStyle: "medium" })} à ${lastSync.toLocaleTimeString(
        "fr-FR",
        { hour: "2-digit", minute: "2-digit" },
      )}`
    : "Aucune synchronisation enregistrée";

  return (
    <div className={styles.syncCluster} title={title}>
      <span className={`${styles.syncDot} ${syncing ? styles.syncDotActive : ""} ${error ? styles.syncDotError : ""}`} />
      <span className={styles.syncLabel}>{formatSyncLabel(syncing, lastSync)}</span>
      <button
        type="button"
        className={styles.syncButton}
        onClick={onSync}
        disabled={disabled}
        aria-label="Relancer la synchronisation"
      >
        ↻
      </button>
    </div>
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

  const active = useMemo(() => pathname?.replace(/\/$/, "") || "/overview", [pathname]);

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
        <nav className={styles.desktopNav} aria-label="Navigation principale">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active === item.href ? styles.navItemActive : styles.navItem}
            >
              <span aria-hidden="true" className={styles.navEmoji}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.topbarActions}>
          <SyncBadge
            syncing={syncing}
            lastSync={lastSync}
            error={syncError}
            onSync={() => syncNow()}
            disabled={syncing || !isAuthenticated}
          />
          {isAuthenticated ? (
            <button type="button" className={styles.ghostButton} onClick={() => requestSignOut()}>
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
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.mobileNav} aria-label="Navigation mobile">
        {NAVIGATION.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active === item.href ? styles.mobileNavActive : styles.mobileNavItem}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <Link href="/settings" className={styles.settingsFab} aria-label="Paramètres">
        <span aria-hidden="true">⚙️</span>
      </Link>
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
