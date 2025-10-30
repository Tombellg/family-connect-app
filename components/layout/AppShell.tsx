"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./app-shell.module.css";

type IconComponent = typeof CheckCircleIcon;

const NAVIGATION: { href: string; label: string; Icon: IconComponent }[] = [
  { href: "/calendar", label: "Calendrier", Icon: CalendarDaysIcon },
  { href: "/tasks", label: "Tâches", Icon: CheckCircleIcon },
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
  } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);

  const active = useMemo(() => pathname?.replace(/\/$/, "") || "/calendar", [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  const avatar = session?.user?.image;
  const initials = session?.user?.name?.slice(0, 2).toUpperCase();

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
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
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
            className={menuOpen ? styles.profileMenuOpen : styles.profileMenu}
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
              <Link href="/settings" role="menuitem">
                <Cog6ToothIcon aria-hidden="true" />
                <span>Paramètres</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
      {menuOpen ? <div className={styles.settingsBackdrop} onClick={() => setMenuOpen(false)} /> : null}

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
