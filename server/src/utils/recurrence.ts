import { Frequency, Options, RRule, Weekday as RRuleWeekday } from 'rrule';
import { Recurrence, Weekday } from '../types';

const weekdayMap: Record<Weekday, RRuleWeekday> = {
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
  sunday: RRule.SU,
};

function mapWeekdays(days: Weekday[] | undefined): RRuleWeekday[] | undefined {
  if (!days || days.length === 0) {
    return undefined;
  }
  return days.map((day) => weekdayMap[day]);
}

function buildRule(recurrence: Recurrence): RRule {
  const dtstart = new Date(recurrence.anchorDate);
  const options: Partial<Options> = { dtstart };

  switch (recurrence.type) {
    case 'daily':
      options.freq = Frequency.DAILY;
      options.interval = recurrence.daily.interval;
      break;
    case 'weekly':
      options.freq = Frequency.WEEKLY;
      options.interval = recurrence.weekly.interval;
      options.byweekday = mapWeekdays(recurrence.weekly.days);
      break;
    case 'monthly':
      options.freq = Frequency.MONTHLY;
      options.interval = recurrence.monthly.interval;
      if (recurrence.monthly.mode === 'dayOfMonth' && recurrence.monthly.day) {
        options.bymonthday = [recurrence.monthly.day];
      }
      if (recurrence.monthly.mode === 'nthWeekday' && recurrence.monthly.nth && recurrence.monthly.weekday) {
        options.bysetpos = [recurrence.monthly.nth];
        options.byweekday = [weekdayMap[recurrence.monthly.weekday]];
      }
      break;
    case 'yearly':
      options.freq = Frequency.YEARLY;
      options.interval = recurrence.yearly.interval;
      options.bymonth = [recurrence.yearly.month];
      if (recurrence.yearly.mode === 'specificDate' && recurrence.yearly.day) {
        options.bymonthday = [recurrence.yearly.day];
      }
      if (recurrence.yearly.mode === 'nthWeekdayOfMonth' && recurrence.yearly.nth && recurrence.yearly.weekday) {
        options.bysetpos = [recurrence.yearly.nth];
        options.byweekday = [weekdayMap[recurrence.yearly.weekday]];
      }
      break;
  }

  if (!options.freq) {
    throw new Error('Recurrence frequency is not defined');
  }

  if (recurrence.end?.type === 'onDate') {
    options.until = new Date(recurrence.end.date);
  } else if (recurrence.end?.type === 'afterOccurrences') {
    options.count = recurrence.end.occurrences;
  }

  return new RRule(options as Options);
}

export function getNextOccurrence(recurrence: Recurrence, from?: string): string | null {
  const rule = buildRule(recurrence);
  const base = from ? new Date(from) : undefined;
  const next = rule.after(base ?? new Date(recurrence.anchorDate), from ? false : true);
  return next ? next.toISOString() : null;
}

export function advanceRecurrence(
  recurrence: Recurrence,
  completedOccurrence: string
): {
  updatedRecurrence: Recurrence;
  nextOccurrence: string | null;
} {
  const updated: Recurrence = {
    ...recurrence,
    lastOccurrence: completedOccurrence,
    occurrenceCount: recurrence.occurrenceCount + 1,
  };

  if (updated.end?.type === 'afterOccurrences' && updated.occurrenceCount >= updated.end.occurrences) {
    return { updatedRecurrence: updated, nextOccurrence: null };
  }

  const next = getNextOccurrence(updated, completedOccurrence);

  if (updated.end?.type === 'onDate' && next) {
    const until = new Date(updated.end.date).toISOString();
    if (next > until) {
      return { updatedRecurrence: updated, nextOccurrence: null };
    }
  }

  return { updatedRecurrence: updated, nextOccurrence: next };
}
