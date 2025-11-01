"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./settings.module.css";

const DENSITY_OPTIONS = [
  { value: "air", label: "Aérée" },
  { value: "balance", label: "Équilibrée" },
  { value: "tight", label: "Compacte" },
];

export default function SettingsPage() {
  const { settings, updateSettings, family, addFamilyMember, removeFamilyMember, saveFamilyMember } = useDashboard();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.label}>Personnalisation & accès</span>
        <p>
          Les teintes indigo sont désormais partagées par l’ensemble du tableau de bord. Ajustez la densité,
          l’effet de transparence et la composition de votre foyer pour adapter l’expérience à votre quotidien.
        </p>
      </header>
      <section className={styles.grid}>
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
          <p className={styles.hint}>La densité influe sur l’espacement et la rondeur de l’interface.</p>
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
          <p className={styles.hint}>Désactivez cette option pour un rendu plus contrasté.</p>
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

      <section id="family" className={styles.familySection}>
        <div className={styles.familyHeader}>
          <span>Famille connectée</span>
          <p>Invitez les membres du foyer et ajustez leurs rôles pour partager tâches et calendriers.</p>
        </div>
        <div className={styles.familyGrid}>
          <form
            className={styles.familyForm}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const name = String(formData.get("name") ?? "").trim();
              const email = String(formData.get("email") ?? "").trim();
              const role = (formData.get("role") as "parent" | "enfant" | "tuteur") ?? "parent";
              if (!name || !email) {
                return;
              }
              addFamilyMember({ displayName: name, email, role });
              event.currentTarget.reset();
            }}
          >
            <label>
              Nom complet
              <input name="name" type="text" placeholder="Ex: Camille Dupont" required />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="Ex: camille@example.com" required />
            </label>
            <label>
              Rôle
              <select name="role" defaultValue="parent">
                <option value="parent">Parent</option>
                <option value="enfant">Enfant</option>
                <option value="tuteur">Tuteur</option>
              </select>
            </label>
            <button type="submit">Ajouter</button>
          </form>

          <div className={styles.familyList}>
            <ul>
              {family.map((member) => (
                <li key={member.id}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <span>{member.email}</span>
                  </div>
                  <div className={styles.familyActions}>
                    <select
                      value={member.role}
                      onChange={(event) =>
                        saveFamilyMember({ ...member, role: event.target.value as typeof member.role })
                      }
                    >
                      <option value="parent">Parent</option>
                      <option value="enfant">Enfant</option>
                      <option value="tuteur">Tuteur</option>
                    </select>
                    <button type="button" onClick={() => removeFamilyMember(member.id)}>
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
              {!family.length ? <li className={styles.empty}>Aucun membre enregistré pour le moment.</li> : null}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
