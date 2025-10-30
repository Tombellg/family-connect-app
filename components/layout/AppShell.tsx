"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./app-shell.module.css";

const NAVIGATION = [
  { href: "/overview", label: "Aperçu" },
  { href: "/tasks", label: "Tâches" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/family", label: "Famille" },
  { href: "/settings", label: "Personnalisation" },
];

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
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          <div>
            <span className={styles.brandTitle}>Family Connect</span>
            <span className={styles.brandSubtitle}>Pilotage familial</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAVIGATION.map((item) => {
            const current = active === item.href;
            return (
              <Link key={item.href} href={item.href} className={current ? styles.navActive : styles.navLink}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sessionCard}>
          {isAuthenticated ? (
            <>
              <p>Vous êtes connecté à Google.</p>
              <button type="button" onClick={() => requestSignOut()} className={styles.secondaryButton}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <p>Connectez-vous pour synchroniser votre agenda et vos tâches.</p>
              <button
                type="button"
                onClick={() => requestSignIn()}
                disabled={loadingSession}
                className={styles.primaryButton}
              >
                {loadingSession ? "Connexion…" : "Se connecter"}
              </button>
            </>
          )}
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.header}>
          <div>
            <strong>Synchronisation</strong>
            <span className={styles.statusLine}>
              {syncing
                ? "Synchronisation en cours…"
                : lastSync
                ? `Mis à jour le ${lastSync.toLocaleDateString("fr-FR", { dateStyle: "medium" })} à ${lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : "Aucune synchronisation pour le moment"}
            </span>
            {syncError ? <span className={styles.statusError}>{syncError}</span> : null}
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => syncNow()}
              disabled={syncing || !isAuthenticated}
            >
              {syncing ? "Synchronisation…" : "Relancer la synchro"}
            </button>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
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
