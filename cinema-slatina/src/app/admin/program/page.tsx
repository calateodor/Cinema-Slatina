import {
  ScheduleManager,
  type ScheduleScreening,
} from "@/components/admin/schedule-manager";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";
import {
  addDays,
  addWeeks,
  dayKey,
  formatLongDate,
  weekDays,
  weekStartOf,
} from "@/lib/dates";
import { seatsTakenByScreening } from "@/lib/capacity";

export default async function AdminSchedulePage(
  props: PageProps<"/admin/program">,
) {
  const searchParams = await props.searchParams;
  const raw = searchParams?.saptamana;
  const requested = typeof raw === "string" ? new Date(`${raw}T12:00:00`) : new Date();
  const weekStart = weekStartOf(
    Number.isNaN(requested.getTime()) ? new Date() : requested,
  );

  const [week, movies, halls] = await Promise.all([
    db.weekSchedule.findUnique({
      where: { weekStart },
      include: {
        screenings: {
          include: {
            movie: { select: { title: true } },
            hall: { select: { name: true, colorHex: true } },
          },
          orderBy: { startsAt: "asc" },
        },
      },
    }),
    db.movie.findMany({
      where: { isArchived: false },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.hall.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
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
    hallName: s.hall.name,
    hallColor: s.hall.colorHex,
    reservedSeats: taken.get(s.id) ?? 0,
  }));

  const days = weekDays(weekStart).map((d) => ({
    key: dayKey(d),
    label: formatLongDate(d),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Program"
        description="Construiește programul pe zile și publică-l când e gata. Săptămâna viitoare rămâne ascunsă până o publici."
      />

      <ScheduleManager
        weekStartIso={weekStart.toISOString()}
        prevWeekIso={addWeeks(weekStart, -1).toISOString()}
        nextWeekIso={addWeeks(weekStart, 1).toISOString()}
        thisWeekIso={weekStartOf().toISOString()}
        isPublished={Boolean(week?.isPublished)}
        screenings={screenings}
        movies={movies}
        halls={halls}
        days={days}
      />

      <p className="mt-6 text-xs text-muted-foreground">
        Ultima zi din săptămână este{" "}
        {formatLongDate(addDays(weekStart, 6))}.
      </p>
    </div>
  );
}
