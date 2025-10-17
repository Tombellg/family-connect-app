import type { ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RecurrenceFormState, Weekday } from '../../types';

interface TaskRecurrenceEditorProps {
  value: RecurrenceFormState | null;
  onChange: (value: RecurrenceFormState | null) => void;
}

const weekdayOptions: Array<{ value: Weekday; label: string }> = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const defaultRecurrence: RecurrenceFormState = {
  type: 'weekly',
  interval: 1,
  days: ['sunday'],
  endType: 'never',
};

const todayLocalDate = () => new Date().toISOString().slice(0, 10);

export default function TaskRecurrenceEditor({ value, onChange }: TaskRecurrenceEditorProps) {
  const activate = () => onChange(value ?? defaultRecurrence);

  const handleIntervalChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!value) return;
    const parsed = Number(event.target.value);
    const interval = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    onChange({ ...value, interval } as RecurrenceFormState);
  };

  const handleEndTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!value) return;
    const endType = event.target.value as RecurrenceFormState['endType'];
    const next: RecurrenceFormState = { ...value, endType } as RecurrenceFormState;

    if (endType === 'afterOccurrences') {
      (next as any).occurrences = value.occurrences ?? 5;
      delete (next as any).untilDate;
    } else if (endType === 'onDate') {
      (next as any).untilDate = value.untilDate ?? todayLocalDate();
      delete (next as any).occurrences;
    } else {
      delete (next as any).occurrences;
      delete (next as any).untilDate;
    }

    onChange(next);
  };

  const handleOccurrencesChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!value || value.endType !== 'afterOccurrences') return;
    const parsed = Number(event.target.value);
    const occurrences = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    onChange({ ...value, occurrences } as RecurrenceFormState);
  };

  const handleUntilDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!value || value.endType !== 'onDate') return;
    onChange({ ...value, untilDate: event.target.value } as RecurrenceFormState);
  };

  const handleWeeklyDayToggle = (day: Weekday) => {
    if (!value || value.type !== 'weekly') return;
    const active = value.days.includes(day);
    if (active && value.days.length === 1) {
      return;
    }
    const days = active ? value.days.filter((item) => item !== day) : [...value.days, day];
    onChange({ ...value, days } as RecurrenceFormState);
  };

  const handleMonthlyModeChange = (mode: 'dayOfMonth' | 'nthWeekday') => {
    if (!value || value.type !== 'monthly') return;

    const currentDay = value.mode === 'dayOfMonth' && value.day ? value.day : 1;
    const currentNth = value.mode === 'nthWeekday' && value.nth ? value.nth : 1;
    const currentWeekday = value.mode === 'nthWeekday' && value.weekday ? value.weekday : 'monday';

    if (mode === 'dayOfMonth') {
      onChange({
        type: 'monthly',
        interval: value.interval,
        mode: 'dayOfMonth',
        day: currentDay,
        endType: value.endType,
        occurrences: value.occurrences,
        untilDate: value.untilDate,
      });
    } else {
      onChange({
        type: 'monthly',
        interval: value.interval,
        mode: 'nthWeekday',
        nth: currentNth,
        weekday: currentWeekday,
        endType: value.endType,
        occurrences: value.occurrences,
        untilDate: value.untilDate,
      });
    }
  };

  const handleYearlyModeChange = (mode: 'specificDate' | 'nthWeekdayOfMonth') => {
    if (!value || value.type !== 'yearly') return;

    const currentDay = value.mode === 'specificDate' && value.day ? value.day : 1;
    const currentMonth = value.month ?? 1;
    const currentNth = value.mode === 'nthWeekdayOfMonth' && value.nth ? value.nth : 1;
    const currentWeekday = value.mode === 'nthWeekdayOfMonth' && value.weekday ? value.weekday : 'monday';

    if (mode === 'specificDate') {
      onChange({
        type: 'yearly',
        interval: value.interval,
        mode: 'specificDate',
        month: currentMonth,
        day: currentDay,
        endType: value.endType,
        occurrences: value.occurrences,
        untilDate: value.untilDate,
      });
    } else {
      onChange({
        type: 'yearly',
        interval: value.interval,
        mode: 'nthWeekdayOfMonth',
        month: currentMonth,
        nth: currentNth,
        weekday: currentWeekday,
        endType: value.endType,
        occurrences: value.occurrences,
        untilDate: value.untilDate,
      });
    }
  };

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as RecurrenceFormState['type'];
    switch (nextType) {
      case 'daily':
        onChange({ type: 'daily', interval: 1, endType: 'never' });
        break;
      case 'weekly':
        onChange({ ...defaultRecurrence });
        break;
      case 'monthly':
        onChange({ type: 'monthly', interval: 1, mode: 'dayOfMonth', day: 1, endType: 'never' });
        break;
      case 'yearly':
        onChange({ type: 'yearly', interval: 1, mode: 'specificDate', month: 1, day: 1, endType: 'never' });
        break;
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Récurrence</p>
          <p className="text-xs text-slate-300">Activez et personnalisez une répétition ultra flexible.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => (value ? onChange(null) : activate())}
          className={`rounded-full px-4 py-1 text-xs font-semibold ${
            value ? 'bg-rose-500/20 text-rose-200' : 'bg-brand text-white shadow-glow'
          }`}
        >
          {value ? 'Désactiver' : 'Activer'}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {value && (
          <motion.div
            key="recurrence-editor"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Type</label>
                <select value={value.type} onChange={handleTypeChange} className="w-full rounded-xl px-3 py-2 text-sm">
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="yearly">Annuelle</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Intervalle</label>
                <input
                  type="number"
                  min={1}
                  value={value.interval}
                  onChange={handleIntervalChange}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Fin</label>
                <select value={value.endType} onChange={handleEndTypeChange} className="w-full rounded-xl px-3 py-2 text-sm">
                  <option value="never">Jamais</option>
                  <option value="afterOccurrences">Après X occurrences</option>
                  <option value="onDate">À une date précise</option>
                </select>
              </div>
            </div>

            {value.type === 'weekly' && (
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => {
                  const active = value.days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleWeeklyDayToggle(day.value)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        active ? 'bg-brand text-white shadow-glow' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}

            {value.type === 'monthly' && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Jour du mois', mode: 'dayOfMonth' as const },
                    { label: 'En fonction de la semaine', mode: 'nthWeekday' as const },
                  ].map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => handleMonthlyModeChange(option.mode)}
                      className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                        value.mode === option.mode
                          ? 'bg-brand text-white shadow-glow'
                          : 'bg-white/10 text-slate-300 hover:bg-white/15'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {value.mode === 'dayOfMonth' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Jour du mois</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={value.day ?? 1}
                      onChange={(event) =>
                        onChange({ ...value, day: Math.min(31, Math.max(1, Number(event.target.value) || 1)) })
                      }
                      className="w-full rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {value.mode === 'nthWeekday' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Rang</label>
                      <input
                        type="number"
                        min={-5}
                        max={5}
                        value={value.nth ?? 1}
                        onChange={(event) =>
                          onChange({ ...value, nth: Math.min(5, Math.max(-5, Number(event.target.value) || 1)) })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Jour</label>
                      <select
                        value={value.weekday ?? 'monday'}
                        onChange={(event) => onChange({ ...value, weekday: event.target.value as Weekday })}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      >
                        {weekdayOptions.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {value.type === 'yearly' && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Date précise', mode: 'specificDate' as const },
                    { label: 'En fonction de la semaine', mode: 'nthWeekdayOfMonth' as const },
                  ].map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => handleYearlyModeChange(option.mode)}
                      className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                        value.mode === option.mode
                          ? 'bg-brand text-white shadow-glow'
                          : 'bg-white/10 text-slate-300 hover:bg-white/15'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {value.mode === 'specificDate' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Mois</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={value.month}
                        onChange={(event) =>
                          onChange({ ...value, month: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Jour</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={value.day ?? 1}
                        onChange={(event) =>
                          onChange({ ...value, day: Math.min(31, Math.max(1, Number(event.target.value) || 1)) })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {value.mode === 'nthWeekdayOfMonth' && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Mois</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={value.month}
                        onChange={(event) =>
                          onChange({ ...value, month: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Rang</label>
                      <input
                        type="number"
                        min={-5}
                        max={5}
                        value={value.nth ?? 1}
                        onChange={(event) =>
                          onChange({ ...value, nth: Math.min(5, Math.max(-5, Number(event.target.value) || 1)) })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Jour</label>
                      <select
                        value={value.weekday ?? 'monday'}
                        onChange={(event) => onChange({ ...value, weekday: event.target.value as Weekday })}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                      >
                        {weekdayOptions.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {value.endType === 'afterOccurrences' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre d'occurrences</label>
                <input
                  type="number"
                  min={1}
                  value={value.occurrences ?? 1}
                  onChange={handleOccurrencesChange}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}

            {value.endType === 'onDate' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Se termine le</label>
                <input
                  type="date"
                  value={value.untilDate ?? todayLocalDate()}
                  onChange={handleUntilDateChange}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
