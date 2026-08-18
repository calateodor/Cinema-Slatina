import { CashierDesk, type DeskScreening } from "@/components/cashier/desk";
import { PageTitle } from "@/components/staff/ui";
import type { ReservationRow } from "@/components/staff/reservation-list";
import { db } from "@/lib/db";
import { seatsTakenByScreening } from "@/lib/capacity";
import { addDays, formatLongDate, todayStart } from "@/lib/dates";
import { CINEMA } from "@/lib/constants";

export default async function CashierDeskPage() {
  const from = todayStart();
  const to = addDays(from, 1);

  const rows = await db.screening.findMany({
    where: { startsAt: { gte: from, lt: to }, isCancelled: false },
    include: {
      movie: { select: { title: true, posterUrl: true, ageRating: true } },
      hall: {
        select: { name: true, colorHex: true, baseCapacity: true, extraCapacity: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const taken = await seatsTakenByScreening(rows.map((r) => r.id));

  const screenings: DeskScreening[] = rows.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    movieTitle: s.movie.title,
    posterUrl: s.movie.posterUrl,
    ageRating: s.movie.ageRating,
    hallName: s.hall.name,
    hallColor: s.hall.colorHex,
    is3D: s.is3D,
    isDubbed: s.isDubbed,
    taken: taken.get(s.id) ?? 0,
    base: s.capacityOverride ?? s.hall.baseCapacity,
    extra: s.allowExtraSeats ? s.hall.extraCapacity : 0,
    reservationsOpen: s.reservationsOpen,
  }));

  const reservationRows = await db.reservation.findMany({
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
    orderBy: [{ createdAt: "desc" }],
  });

  const reservations: ReservationRow[] = reservationRows.map((r) => ({
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
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Ghișeu"
        description={`${formatLongDate(from)} · rezervări telefonice la ${CINEMA.phone}`}
      />
      <CashierDesk screenings={screenings} reservations={reservations} />
    </div>
  );
}
