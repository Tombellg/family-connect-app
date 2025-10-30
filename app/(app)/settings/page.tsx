"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./settings.module.css";

const ACCENT_OPTIONS = [
  { value: "lagoon", label: "Lagune" },
  { value: "sunset", label: "Coucher de soleil" },
  { value: "forest", label: "Forêt" },
  { value: "midnight", label: "Minuit" },
];

const DENSITY_OPTIONS = [
  { value: "air", label: "Aérée" },
  { value: "balance", label: "Équilibrée" },
  { value: "tight", label: "Compacte" },
];

export default function SettingsPage() {
  const { settings, updateSettings } = useDashboard();

  return (
    <div className={styles.container}>
      <header>
        <h1>Personnalisation</h1>
        <p>Ajustez le thème du tableau de bord pour refléter votre style.</p>
      </header>
      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2>Couleur d’accent</h2>
          <div className={styles.optionGrid}>
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateSettings({ accent: option.value as typeof settings.accent })}
                className={settings.accent === option.value ? styles.optionActive : styles.optionButton}
              >
                <span className={styles.colorPreview} data-accent={option.value} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <h2>Densité</h2>
          <div className={styles.optionGrid}>
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateSettings({ density: option.value as typeof settings.density })}
                className={settings.density === option.value ? styles.optionActive : styles.optionButton}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            La densité influe sur l’espacement et les arrondis des cartes dans toutes les vues.
          </p>
        </div>

        <div className={styles.panel}>
          <h2>Transparence</h2>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.glassEffect}
              onChange={(event) => updateSettings({ glassEffect: event.target.checked })}
            />
            <span>Activer l’effet de verre dépoli</span>
          </label>
          <p className={styles.hint}>
            Désactivez cette option pour une interface plus opaque et contrastée.
          </p>
        </div>

        <div className={styles.preview}>
          <h2>Aperçu</h2>
          <div className={styles.previewBoard}>
            <div className={styles.previewCard}>
              <span>Bloc de tâches</span>
              <strong>Planifier les vacances</strong>
              <small>Échéance vendredi</small>
            </div>
            <div className={styles.previewCard}>
              <span>Bloc agenda</span>
              <strong>Réunion parents d’élèves</strong>
              <small>18h30 · Salle B</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
