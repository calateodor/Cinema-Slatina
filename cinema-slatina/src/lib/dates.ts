import { ro } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, addWeeks, startOfDay, startOfWeek } from "date-fns";

export { addDays, addWeeks, startOfDay };

/**
 * Toate datele civile ale cinematografului (zile, săptămâni, ore afișate) sunt
 * calculate în ora României, nu în ora serverului. Fără asta, pe o găzduire care
 * rulează în UTC, programul de la 19:00 ar apărea la 16:00 și săptămânile nu s-ar
 * mai potrivi cu cele salvate în bază.
 */
export const CINEMA_TZ = "Europe/Bucharest";

/** Momentul dat, mutat în „ceasul de perete” românesc, pentru calcule pe zile. */
function wall(date: Date): Date {
  return toZonedTime(date, CINEMA_TZ);
}

/** Inversul: o dată civilă românească devine momentul real corespunzător. */
function instant(wallDate: Date): Date {
  return fromZonedTime(wallDate, CINEMA_TZ);
}

/** Luni, 00:00 ora României, a săptămânii care conține momentul dat. */
export function weekStartOf(date: Date = new Date()): Date {
  return instant(startOfWeek(startOfDay(wall(date)), { weekStartsOn: 1 }));
}

export function nextWeekStartOf(date: Date = new Date()): Date {
  return weekStartOf(addDays(weekStartOf(date), 8));
}

export function weekEndOf(date: Date = new Date()): Date {
  return weekDays(weekStartOf(date))[6];
}

/** Cele șapte zile ale săptămânii, fiecare la 00:00 ora României. */
export function weekDays(weekStart: Date): Date[] {
  const monday = wall(weekStart);
  return Array.from({ length: 7 }, (_, i) =>
    instant(startOfDay(addDays(monday, i))),
  );
}

/** Miezul nopții de azi, ora României. */
export function todayStart(now: Date = new Date()): Date {
  return instant(startOfDay(wall(now)));
}

function fmt(date: Date, pattern: string): string {
  return formatInTimeZone(date, CINEMA_TZ, pattern, { locale: ro });
}

/** "luni, 18 august" */
export function formatLongDate(date: Date): string {
  return fmt(date, "EEEE, d MMMM");
}

/** "18 aug" */
export function formatShortDate(date: Date): string {
  return fmt(date, "d MMM");
}

/** "18 august" */
export function formatDayMonth(date: Date): string {
  return fmt(date, "d MMMM");
}

/** "15:30" */
export function formatTime(date: Date): string {
  return fmt(date, "HH:mm");
}

/** "luni" */
export function formatWeekday(date: Date): string {
  return fmt(date, "EEEE");
}

/** "14:32:07" — eticheta bonului de apel din casierie. */
export function formatClock(date: Date): string {
  return fmt(date, "HH:mm:ss");
}

/** "18/21/45/07" — ziua și ora apelului, pentru rezervările fără nume. */
export function formatDeskLabel(date: Date): string {
  return fmt(date, "dd/HH/mm/ss");
}

/** "marți, 18 aug, 19:00" — pentru listele din panourile interne. */
export function formatDateTimeShort(date: Date): string {
  return fmt(date, "EEE, d MMM, HH:mm");
}

/** "18 – 24 august 2026" */
export function formatWeekRange(weekStart: Date): string {
  const end = weekDays(weekStart)[6];
  const sameMonth = fmt(weekStart, "MM") === fmt(end, "MM");
  return sameMonth
    ? `${fmt(weekStart, "d")} – ${fmt(end, "d MMMM yyyy")}`
    : `${fmt(weekStart, "d MMM")} – ${fmt(end, "d MMM yyyy")}`;
}

/** ISO scurt (yyyy-MM-dd) în ora României, folosit ca identificator de zi. */
export function dayKey(date: Date): string {
  return formatInTimeZone(date, CINEMA_TZ, "yyyy-MM-dd");
}

export function parseDayKey(key: string): Date {
  return fromZonedTime(`${key}T00:00:00`, CINEMA_TZ);
}

/** Combină o zi (yyyy-MM-dd) și o oră (HH:mm) românești într-un moment real. */
export function cinemaDateTime(day: string, time: string): Date {
  return fromZonedTime(`${day}T${time}:00`, CINEMA_TZ);
}

export function isSameCinemaDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameCinemaDay(date, now);
}

export function isTomorrow(date: Date, now: Date = new Date()): boolean {
  return isSameCinemaDay(date, addDays(now, 1));
}

/** Eticheta zilei din tab-urile de program: "Azi", "Mâine" sau "Luni". */
export function dayTabLabel(date: Date, now: Date = new Date()): string {
  if (isToday(date, now)) return "Azi";
  if (isTomorrow(date, now)) return "Mâine";
  const label = formatWeekday(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Adevărat dacă momentul dat este în trecut. */
export function isPast(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime();
}
