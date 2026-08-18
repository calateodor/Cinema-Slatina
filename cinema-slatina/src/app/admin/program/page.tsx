import {
  ScheduleManager,
  type ScheduleMovie,
  type ScheduleScreening,
} from "@/components/admin/schedule-manager";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";
import {
  addWeeks,
  dayKey,
  formatLongDate,
  parseDayKey,
  weekDays,
  weekStartOf,
} from "@/lib/dates";
import { seatsTakenByScreening } from "@/lib/capacity";
import { isTmdbConfigured } from "@/lib/tmdb";

export default async function AdminSchedulePage(
  props: PageProps<"/admin/program">,
) {
  const searchParams = await props.searchParams;
  const raw = searchParams?.saptamana;
  // Săptămâna cerută vine ca yyyy-MM-dd, interpretat în ora României.
  const requested =
    typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? parseDayKey(raw)
      : new Date();
  const weekStart = weekStartOf(requested);
  const days = weekDays(weekStart);

  const [week, movies, halls] = await Promise.all([
    db.weekSchedule.findUnique({
      where: { weekStart },
      include: {
        screenings: {
          include: {
            movie: { select: { title: true, posterUrl: true, ageRating: true } },
            hall: { select: { name: true, colorHex: true, baseCapacity: true } },
          },
          orderBy: { startsAt: "asc" },
        },
      },
    }),
    db.movie.findMany({
      where: { isArchived: false },
      orderBy: { title: "asc" },
      select: { id: true, title: true, posterUrl: true },
    }),
    db.hall.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, colorHex: true },
    }),
  ]);

  const rows = week?.screenings ?? [];
  const taken = await seatsTakenByScreening(rows.map((r) => r.id));

  const screenings: ScheduleScreening[] = rows.map((s) => ({
    id: s.id,
    movieId: s.movieId,
    hallId: s.hallId,
    startsAt: s.startsAt.toISOString(),
    is3D: s.is3D,
    isDubbed: s.isDubbed,
    reservationsOpen: s.reservationsOpen,
    allowExtraSeats: s.allowExtraSeats,
    capacityOverride: s.capacityOverride,
    isCancelled: s.isCancelled,
    note: s.note,
    movieTitle: s.movie.title,
    posterUrl: s.movie.posterUrl,
    ageRating: s.movie.ageRating,
    hallName: s.hall.name,
    hallColor: s.hall.colorHex,
    baseCapacity: s.capacityOverride ?? s.hall.baseCapacity,
    reservedSeats: taken.get(s.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Program"
        description="Vezi programul exact cum îl vede publicul. Apasă pe un card ca să îl modifici, sau pe „+” ca să adaugi un film."
      />

      <ScheduleManager
        weekStartKey={dayKey(weekStart)}
        prevWeekKey={dayKey(addWeeks(weekStart, -1))}
        nextWeekKey={dayKey(addWeeks(weekStart, 1))}
        thisWeekKey={dayKey(weekStartOf())}
        isPublished={Boolean(week?.isPublished)}
        screenings={screenings}
        movies={movies as ScheduleMovie[]}
        halls={halls}
        days={days.map((d) => ({ key: dayKey(d), label: formatLongDate(d) }))}
        tmdbConfigured={isTmdbConfigured()}
      />
    </div>
  );
}
