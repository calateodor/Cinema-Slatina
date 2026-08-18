import { PageTitle } from "@/components/staff/ui";
import {
  ReservationList,
  type ReservationRow,
} from "@/components/staff/reservation-list";
import { db } from "@/lib/db";
import { addDays, formatLongDate, formatTime, todayStart } from "@/lib/dates";

export default async function CashierReservationsPage() {
  const from = todayStart();
  const to = addDays(from, 1);

  const rows = await db.reservation.findMany({
    where: {
      screening: { startsAt: { gte: from, lt: to } },
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
    },
    include: {
      screening: {
        include: {
          movie: { select: { title: true, ageRating: true } },
          hall: { select: { name: true, colorHex: true } },
        },
      },
    },
    orderBy: [{ screening: { startsAt: "asc" } }, { customerName: "asc" }],
  });

  const grouped = new Map<string, ReservationRow[]>();
  for (const r of rows) {
    const key = `${formatTime(r.screening.startsAt)} · ${r.screening.movie.title} · ${r.screening.hall.name}`;
    const list = grouped.get(key) ?? [];
    list.push({
      id: r.id,
      code: r.code,
      customerName: r.customerName,
      phone: r.phone,
      age: r.age,
      isAdult: r.isAdult,
      seats: r.seats,
      extraSeats: r.extraSeats,
      status: r.status,
      source: r.source,
      movieTitle: r.screening.movie.title,
      hallName: r.screening.hall.name,
      hallColor: r.screening.hall.colorHex,
      startsAt: r.screening.startsAt.toISOString(),
      is3D: r.screening.is3D,
      isDubbed: r.screening.isDubbed,
      ageRating: r.screening.movie.ageRating,
    });
    grouped.set(key, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Rezervările zilei"
        description={`${formatLongDate(from)} · ${rows.length} rezervări active`}
      />

      {grouped.size === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          Nu există rezervări pentru ziua de azi.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {[...grouped.entries()].map(([label, list]) => (
            <section key={label}>
              <h2 className="text-sm font-semibold text-muted-foreground">
                {label}
              </h2>
              <div className="mt-2">
                <ReservationList reservations={list} compact />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
