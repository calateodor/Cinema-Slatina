import "server-only";
import { db } from "@/lib/db";
import { buildCapacity, seatsTakenByScreening, type Capacity } from "@/lib/capacity";
import { addDays, formatTime, nextWeekStartOf, todayStart, weekStartOf } from "@/lib/dates";
import { SETTING_KEYS } from "@/lib/constants";
import { unstable_cache } from "next/cache";

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

/**
 * Ce se vede pe „ecranul” din prima pagină: următoarea proiecție a fiecărui
 * film din programul publicat, în ordinea orelor. Primul element este filmul
 * care urmează cel mai curând — el rulează pe ecran la deschiderea paginii.
 */
export type HeroItem = {
  screeningId: string;
  startsAt: Date;
  is3D: boolean;
  isDubbed: boolean;
  hall: { name: string; colorHex: string };
  movie: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string | null;
    backdropUrl: string | null;
    trailerUrl: string | null;
    genres: string | null;
    ageRating: string | null;
    runtimeMin: number | null;
  };
  canReserve: boolean;
  soldOut: boolean;
};

export async function getHeroItems(limit = 8): Promise<HeroItem[]> {
  const now = new Date();
  const rows = await db.screening.findMany({
    where: {
      isCancelled: false,
      startsAt: { gte: now },
      week: { isPublished: true },
      movie: { isArchived: false },
    },
    include: {
      hall: true,
      movie: {
        select: {
          id: true,
          slug: true,
          title: true,
          posterUrl: true,
          backdropUrl: true,
          trailerUrl: true,
          genres: true,
          ageRating: true,
          runtimeMin: true,
        },
      },
    },
    orderBy: [{ startsAt: "asc" }, { hall: { sortOrder: "asc" } }],
    take: 120,
  });

  const picked: typeof rows = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.movieId)) continue;
    seen.add(row.movieId);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  const taken = await seatsTakenByScreening(picked.map((r) => r.id));
  return picked.map((r) => {
    const capacity = buildCapacity(
      r.capacityOverride ?? r.hall.baseCapacity,
      r.allowExtraSeats ? r.hall.extraCapacity : 0,
      taken.get(r.id) ?? 0,
    );
    return {
      screeningId: r.id,
      startsAt: r.startsAt,
      is3D: r.is3D,
      isDubbed: r.isDubbed,
      hall: { name: r.hall.name, colorHex: r.hall.colorHex },
      movie: r.movie,
      soldOut: capacity.soldOut,
      canReserve: r.reservationsOpen && !capacity.soldOut,
    };
  });
}

/**
 * Grila de afiș a săptămânii: un film apare o singură dată, cu toate orele la
 * care rulează (de regulă aceeași oră în fiecare zi), ca pe afișul tipărit.
 */
export type GridEntry = {
  movie: ScreeningView["movie"];
  /** Orele distincte, "HH:mm", sortate. */
  times: string[];
  is3D: boolean;
  isDubbed: boolean;
  halls: { name: string; colorHex: string }[];
  /** Prima proiecție viitoare la care se mai pot face rezervări. */
  nextScreeningId: string | null;
};

export async function getWeekGrid() {
  const { current, currentPublished, thisWeekStart } = await getPublicSchedule();

  const byMovie = new Map<string, GridEntry>();
  // Prima proiecție a fiecărui film, ca ordinea din grilă să fie cea a orelor.
  const firstStart = new Map<string, number>();
  for (const s of current.screenings) {
    const time = formatTime(new Date(s.startsAt));
    const entry = byMovie.get(s.movie.id) ?? {
      movie: s.movie,
      times: [],
      is3D: false,
      isDubbed: s.isDubbed,
      halls: [],
      nextScreeningId: null,
    };
    if (!entry.times.includes(time)) entry.times.push(time);
    if (!entry.halls.some((h) => h.name === s.hall.name)) {
      entry.halls.push({ name: s.hall.name, colorHex: s.hall.colorHex });
    }
    entry.is3D = entry.is3D || s.is3D;
    firstStart.set(
      s.movie.id,
      Math.min(firstStart.get(s.movie.id) ?? Number.POSITIVE_INFINITY, s.startsAt.getTime()),
    );
    if (
      !entry.nextScreeningId &&
      !s.hasStarted &&
      s.reservationsOpen &&
      !s.capacity.soldOut
    ) {
      entry.nextScreeningId = s.id;
    }
    byMovie.set(s.movie.id, entry);
  }

  const entries = [...byMovie.values()]
    .map((entry) => ({ ...entry, times: [...entry.times].sort() }))
    .sort(
      (a, b) =>
        a.times[0].localeCompare(b.times[0]) ||
        (firstStart.get(a.movie.id) ?? 0) - (firstStart.get(b.movie.id) ?? 0),
    );

  return { entries, published: currentPublished, weekStart: thisWeekStart };
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

/* ---------------------------------------------------------------------------
   Afișajul de pe televizoarele din cinematograf (/afisaj): programul de azi și
   de mâine, fără capacitate (nu se arată locuri pe televizor). Datele sunt
   text simplu, ca să treacă neschimbate către componenta din browser.
--------------------------------------------------------------------------- */
export type DisplayScreening = {
  id: string;
  /** ISO, ca să nu depindă de fusul orar al cutiei de pe televizor. */
  startsAt: string;
  is3D: boolean;
  isDubbed: boolean;
  hall: { slug: string; name: string; colorHex: string };
  movie: {
    title: string;
    posterUrl: string | null;
    backdropUrl: string | null;
    genres: string | null;
    runtimeMin: number | null;
    ageRating: string | null;
    trailerUrl: string | null;
    /**
     * Calea MP4-ului trailerului pe site (/trailere/…), doar dacă fișierul încă
     * corespunde linkului YouTube; altfel `null`.
     */
    trailerFileUrl: string | null;
    /** Identificator stabil al fișierului. */
    trailerFileKey: string | null;
  };
};

export type DisplayProgram = {
  halls: { slug: string; name: string; colorHex: string }[];
  screenings: DisplayScreening[];
  /** Momentul interogării: prima „oră” a afișajului, aceeași pe server și în browser. */
  generatedAt: string;
};

/** Eticheta cache-ului cu programul televizoarelor (vezi `revalidateProgram`). */
export const PROGRAM_TAG = "program";

/**
 * Programul televizoarelor, citit din bază cel mult o dată la jumătate de oră
 * pentru toate televizoarele (copie păstrată de Vercel). Orice modificare din
 * administrare golește copia pe loc, prin eticheta `program`. Fără ea, fiecare
 * televizor întreba baza în fiecare minut, zi și noapte, iar baza gratuită nu
 * mai apuca să se oprească.
 */
const loadDisplayRows = unstable_cache(
  async (fromIso: string) => {
    const from = new Date(fromIso);
    const [halls, rows] = await Promise.all([
      db.hall.findMany({
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true, colorHex: true },
      }),
      db.screening.findMany({
        where: {
          startsAt: { gte: from, lt: addDays(from, 2) },
          isCancelled: false,
          week: { isPublished: true },
        },
        orderBy: [{ startsAt: "asc" }, { hall: { sortOrder: "asc" } }],
        select: {
          id: true,
          startsAt: true,
          is3D: true,
          isDubbed: true,
          hall: { select: { slug: true, name: true, colorHex: true } },
          movie: {
            select: {
              title: true,
              posterUrl: true,
              backdropUrl: true,
              genres: true,
              runtimeMin: true,
              ageRating: true,
              trailerUrl: true,
              trailerFileUrl: true,
              trailerFileSource: true,
            },
          },
        },
      }),
    ]);
    return { halls, rows: rows.map((r) => ({ ...r, startsAt: r.startsAt.toISOString() })) };
  },
  ["display-program"],
  { revalidate: 1800, tags: [PROGRAM_TAG] },
);

export async function getDisplayProgram(now: Date = new Date()): Promise<DisplayProgram> {
  const { halls, rows } = await loadDisplayRows(todayStart(now).toISOString());
  return {
    halls,
    screenings: rows.map((r) => {
      const { trailerFileSource, trailerFileUrl, ...movie } = r.movie;
      // fișierul (din /trailere, pe site) se folosește doar cât linkul YouTube
      // e cel din care a fost tras
      const file =
        trailerFileUrl?.startsWith("/") && trailerFileSource === movie.trailerUrl ? trailerFileUrl : null;
      return { ...r, movie: { ...movie, trailerFileUrl: file, trailerFileKey: file } };
    }),
    generatedAt: now.toISOString(),
  };
}
