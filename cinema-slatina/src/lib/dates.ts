import { ro } from "date-fns/locale";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";

export { addDays, addWeeks, format, isSameDay, startOfDay };

/** Saptamana incepe luni, ca in programul cinematografului. */
export function weekStartOf(date: Date = new Date()): Date {
  return startOfWeek(startOfDay(date), { weekStartsOn: 1 });
}

export function nextWeekStartOf(date: Date = new Date()): Date {
  return addWeeks(weekStartOf(date), 1);
}

export function weekEndOf(date: Date = new Date()): Date {
  return addDays(weekStartOf(date), 7);
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "luni, 18 august" */
export function formatLongDate(date: Date): string {
  return format(date, "EEEE, d MMMM", { locale: ro });
}

/** "18 aug" */
export function formatShortDate(date: Date): string {
  return format(date, "d MMM", { locale: ro });
}

/** "18 august" */
export function formatDayMonth(date: Date): string {
  return format(date, "d MMMM", { locale: ro });
}

/** "15:30" */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/** "luni" */
export function formatWeekday(date: Date): string {
  return format(date, "EEEE", { locale: ro });
}

/** "14:32:07" — eticheta bonului de apel din casierie. */
export function formatClock(date: Date): string {
  return format(date, "HH:mm:ss");
}

/** "18 – 24 august 2026" */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  return sameMonth
    ? `${format(weekStart, "d", { locale: ro })} – ${format(end, "d MMMM yyyy", { locale: ro })}`
    : `${format(weekStart, "d MMM", { locale: ro })} – ${format(end, "d MMM yyyy", { locale: ro })}`;
}

export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

export function isTomorrow(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, addDays(now, 1));
}

/** Eticheta zilei folosita in tab-urile de program: "Azi", "Mâine" sau "luni". */
export function dayTabLabel(date: Date, now: Date = new Date()): string {
  if (isToday(date, now)) return "Azi";
  if (isTomorrow(date, now)) return "Mâine";
  const label = formatWeekday(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** ISO scurt (yyyy-MM-dd) folosit ca identificator de zi in URL-uri. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Adevărat dacă momentul dat este în trecut. */
export function isPast(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime();
}
