export type RecurrenceFrequency = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurrenceState = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: string[];
  monthDay: number | null;
  end: { type: "never" | "after" | "on"; value?: number | string };
};

export const WEEKDAY_OPTIONS = [
  { value: "MO", label: "Lun" },
  { value: "TU", label: "Mar" },
  { value: "WE", label: "Mer" },
  { value: "TH", label: "Jeu" },
  { value: "FR", label: "Ven" },
  { value: "SA", label: "Sam" },
  { value: "SU", label: "Dim" },
];

export function buildRecurrenceRule(state: RecurrenceState | null): string[] | null {
  if (!state || state.frequency === "NONE") {
    return null;
  }

  const parts = [`FREQ=${state.frequency}`];

  if (state.interval > 1) {
    parts.push(`INTERVAL=${state.interval}`);
  }

  if (state.frequency === "WEEKLY" && state.weekdays.length) {
    parts.push(`BYDAY=${state.weekdays.join(",")}`);
  }

  if (state.frequency === "MONTHLY" && state.monthDay) {
    parts.push(`BYMONTHDAY=${state.monthDay}`);
  }

  if (state.end.type === "after" && typeof state.end.value === "number" && state.end.value > 0) {
    parts.push(`COUNT=${state.end.value}`);
  }

  if (state.end.type === "on" && typeof state.end.value === "string" && state.end.value) {
    parts.push(`UNTIL=${state.end.value.replace(/[-:]/g, "")}`);
  }

  return [`RRULE:${parts.join(";")}`];
}

export function describeRecurrence(state: RecurrenceState | null) {
  if (!state || state.frequency === "NONE") {
    return "Aucune répétition";
  }

  const base = {
    DAILY: "Chaque jour",
    WEEKLY: "Chaque semaine",
    MONTHLY: "Chaque mois",
    YEARLY: "Chaque année",
  }[state.frequency];

  const details: string[] = [];

  if (state.interval > 1) {
    const unit = {
      DAILY: "jours",
      WEEKLY: "semaines",
      MONTHLY: "mois",
      YEARLY: "années",
    }[state.frequency];
    details.push(`toutes les ${state.interval} ${unit}`);
  }

  if (state.frequency === "WEEKLY" && state.weekdays.length) {
    const formatted = state.weekdays
      .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? day)
      .join(", ");
    details.push(`les ${formatted}`);
  }

  if (state.frequency === "MONTHLY" && state.monthDay) {
    details.push(`le ${state.monthDay}`);
  }

  if (state.end.type === "after" && typeof state.end.value === "number") {
    details.push(`${state.end.value} occurrences`);
  }

  if (state.end.type === "on" && typeof state.end.value === "string") {
    details.push(`jusqu’au ${new Date(state.end.value).toLocaleDateString("fr-FR")}`);
  }

  return [base, ...details].join(" · ");
}
