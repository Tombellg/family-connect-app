"use client";

import { FormEvent, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { FamilyMember } from "@/components/dashboard/dashboard-context";
import styles from "./family.module.css";

export default function FamilyPage() {
  const { family, addFamilyMember, removeFamilyMember, saveFamilyMember } = useDashboard();
  const [draft, setDraft] = useState<{ name: string; email: string; role: FamilyMember["role"] }>({
    name: "",
    email: "",
    role: "parent",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) {
      setError("Nom et email sont requis");
      return;
    }
    addFamilyMember({ displayName: draft.name.trim(), email: draft.email.trim(), role: draft.role });
    setDraft({ name: "", email: "", role: "parent" });
    setError(null);
  };

  return (
    <div className={styles.container}>
      <header>
        <div>
          <h1>Gestion de la famille</h1>
          <p>Centralisez les membres qui auront accès aux tâches et agendas partagés.</p>
        </div>
      </header>

      <section className={styles.grid}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2>Ajouter un membre</h2>
          <label>
            Nom complet
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex: Camille Dupont"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="Ex: camille@example.com"
              required
            />
          </label>
          <label>
            Rôle
            <select
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value as FamilyMember["role"] }))
              }
            >
              <option value="parent">Parent</option>
              <option value="enfant">Enfant</option>
              <option value="tuteur">Tuteur</option>
            </select>
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit">Ajouter</button>
        </form>

        <div className={styles.list}>
          <h2>Membres existants</h2>
          <ul>
            {family.map((member) => (
              <li key={member.id}>
                <div className={styles.memberHeader}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <span>{member.email}</span>
                  </div>
                  <select
                    value={member.role}
                    onChange={(event) =>
                      saveFamilyMember({ ...member, role: event.target.value as FamilyMember["role"] })
                    }
                  >
                    <option value="parent">Parent</option>
                    <option value="enfant">Enfant</option>
                    <option value="tuteur">Tuteur</option>
                  </select>
                </div>
                <button type="button" onClick={() => removeFamilyMember(member.id)}>
                  Retirer
                </button>
              </li>
            ))}
            {!family.length ? <li className={styles.empty}>Aucun membre enregistré.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
