import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatTaskDueDate(value?: string): string {
  if (!value) return 'Sans échéance';
  const date = parseISO(value);
  if (isToday(date)) {
    return `Aujourd'hui · ${format(date, 'HH:mm', { locale: fr })}`;
  }
  if (isTomorrow(date)) {
    return `Demain · ${format(date, 'HH:mm', { locale: fr })}`;
  }
  return format(date, "EEEE d MMM '·' HH:mm", { locale: fr });
}
