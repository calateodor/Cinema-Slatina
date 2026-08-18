import "server-only";
import { db } from "@/lib/db";
import { buildCapacity, seatsTakenByScreening, type Capacity } from "@/lib/capacity";
import { addDays, nextWeekStartOf, weekStartOf } from "@/lib/dates";
import { SETTING_KEYS } from "@/lib/constants";

export type ScreeningView = {
  id: string;
  startsAt: Date;
  is3D: boolean;
  isDubbed: boolean;
  reservationsOpen: boolean;
  isCancelled: boolean;
  note: string | null;
  hall: { id: string; slug: string; name: string; colorHex: string };
  movie: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string | null;
    genres: string | null;
    runtimeMin: number | null;
    ageRating: string | null;
  };
  capacity: Capacity;
  /** Calculat pe server, ca să nu difere între server și browser. */
  hasStarted: boolean;
};

const screeningInclude = {
  hall: true,
  movie: {
    select: {
      id: true,
      slug: true,
      title: true,
      posterUrl: true,
      genres: true,
      runtimeMin: true,
      ageRating: true,
    },
  },
} as const;

function toView(
  s: {
    id: string;
    startsAt: Date;
    is3D: boolean;
    isDubbed: boolean;
    reservationsOpen: boolean;
    isCancelled: boolean;
    note: string | null;
    capacityOverride: number | null;
    allowExtraSeats: boolean;
    hall: { id: string; slug: string; name: string; colorHex: string; baseCapacity: number; extraCapacity: number };
    movie: ScreeningView["movie"];
  },
  taken: number,
): ScreeningView {
  return {
    id: s.id,
    startsAt: s.startsAt,
    is3D: s.is3D,
    isDubbed: s.isDubbed,
    reservationsOpen: s.reservationsOpen,
    isCancelled: s.isCancelled,
    note: s.note,
    hall: {
      id: s.hall.id,
      slug: s.hall.slug,
      name: s.hall.name,
      colorHex: s.hall.colorHex,
    },
    movie: s.movie,
    hasStarted: s.startsAt.getTime() <= Date.now(),
    capacity: buildCapacity(
      s.capacityOverride ?? s.hall.baseCapacity,
      s.allowExtraSeats ? s.hall.extraCapacity : 0,
      taken,
    ),
  };
}

async function attachCapacity(
  rows: Parameters<typeof toView>[0][],
): Promise<ScreeningView[]> {
  const taken = await seatsTakenByScreening(rows.map((r) => r.id));
  return rows.map((r) => toView(r, taken.get(r.id) ?? 0));
}

/** Toate proiecțiile dintr-un interval, indiferent de starea de publicare. */
export async function getScreeningsBetween(
  from: Date,
  to: Date,
): Promise<ScreeningView[]> {
  const rows = await db.screening.findMany({
    where: { startsAt: { gte: from, lt: to }, isCancelled: false },
    include: screeningInclude,
    orderBy: [{ startsAt: "asc" }, { hall: { sortOrder: "asc" } }],
  });
  return attachCapacity(rows);
}

export type WeekView = {
  weekStart: Date;
  isPublished: boolean;
  note: string | null;
  screenings: ScreeningView[];
};

export async function getWeek(weekStart: Date): Promise<WeekView> {
  const week = await db.weekSchedule.findUnique({
    where: { weekStart },
    include: {
      screenings: {
        where: { isCancelled: false },
        include: screeningInclude,
        orderBy: [{ startsAt: "asc" }, { hall: { sortOrder: "asc" } }],
      },
    },
  });

  if (!week) {
    return { weekStart, isPublished: false, note: null, screenings: [] };
  }

  return {
    weekStart: week.weekStart,
    isPublished: week.isPublished,
    note: week.note,
    screenings: await attachCapacity(week.screenings),
  };
}

/** Datele de program pentru pagina publică: săptămâna curentă + starea celei viitoare. */
export async function getPublicSchedule() {
  const thisWeekStart = weekStartOf();
  const nextStart = nextWeekStartOf();

  const [current, next] = await Promise.all([
    getWeek(thisWeekStart),
    getWeek(nextStart),
  ]);

  return {
    current: current.isPublished
      ? current
      : { ...current, screenings: [] as ScreeningView[] },
    currentPublished: current.isPublished,
    next: next.isPublished ? next : { ...next, screenings: [] as ScreeningView[] },
    nextPublished: next.isPublished,
    thisWeekStart,
    nextWeekStart: nextStart,
  };
}

/** Filmele care rulează în săptămâna publicată curent. */
export async function getMoviesThisWeek() {
  const { current } = await getPublicSchedule();
  const seen = new Map<string, ScreeningView["movie"] & { is3D: boolean }>();
  for (const s of current.screenings) {
    if (!seen.has(s.movie.id)) seen.set(s.movie.id, { ...s.movie, is3D: s.is3D });
  }
  return [...seen.values()];
}

export async function getComingSoon() {
  return db.movie.findMany({
    where: { comingSoon: true, isArchived: false },
    orderBy: [{ comingSoonFrom: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      posterUrl: true,
      backdropUrl: true,
      genres: true,
      synopsis: true,
      comingSoonFrom: true,
      runtimeMin: true,
      ageRating: true,
    },
  });
}

export async function getMovieBySlug(slug: string) {
  return db.movie.findUnique({ where: { slug } });
}

/** Proiecțiile viitoare ale unui film (folosite pe pagina filmului). */
export async function getUpcomingScreeningsForMovie(
  movieId: string,
): Promise<ScreeningView[]> {
  const rows = await db.screening.findMany({
    where: {
      movieId,
      isCancelled: false,
      startsAt: { gte: new Date() },
      week: { isPublished: true },
    },
    include: screeningInclude,
    orderBy: { startsAt: "asc" },
    take: 30,
  });
  return attachCapacity(rows);
}

export async function getScreeningView(id: string): Promise<ScreeningView | null> {
  const row = await db.screening.findUnique({
    where: { id },
    include: screeningInclude,
  });
  if (!row) return null;
  const [view] = await attachCapacity([row]);
  return view;
}

/** Anunțul de închidere activ pentru ziua curentă (dacă există). */
export async function getActiveClosure(now: Date = new Date()) {
  return db.closureNotice.findFirst({
    where: {
      isActive: true,
      startDate: { lte: addDays(now, 14) },
      endDate: { gte: now },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function areReservationsEnabled(): Promise<boolean> {
  const setting = await db.setting.findUnique({
    where: { key: SETTING_KEYS.RESERVATIONS_ENABLED },
  });
  return setting?.value !== "false";
}

export async function getMenu() {
  const items = await db.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }
  return [...grouped.entries()].map(([category, list]) => ({ category, items: list }));
}
