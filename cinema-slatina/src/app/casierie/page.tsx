import {
  CashierDesk,
  type DeskScreening,
  type DeskTicket,
} from "@/components/cashier/desk";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";
import { seatsTakenByScreening } from "@/lib/capacity";
import { addDays, formatLongDate, startOfDay } from "@/lib/dates";
import { CINEMA } from "@/lib/constants";

export default async function CashierDeskPage() {
  const from = startOfDay(new Date());
  const to = addDays(from, 1);

  const rows = await db.screening.findMany({
    where: { startsAt: { gte: from, lt: to }, isCancelled: false },
    include: {
      movie: { select: { title: true, ageRating: true } },
      hall: { select: { name: true, colorHex: true, baseCapacity: true, extraCapacity: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const taken = await seatsTakenByScreening(rows.map((r) => r.id));

  const screenings: DeskScreening[] = rows.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    movieTitle: s.movie.title,
    hallName: s.hall.name,
    hallColor: s.hall.colorHex,
    is3D: s.is3D,
    isDubbed: s.isDubbed,
    ageRating: s.movie.ageRating,
    taken: taken.get(s.id) ?? 0,
    base: s.capacityOverride ?? s.hall.baseCapacity,
    extra: s.allowExtraSeats ? s.hall.extraCapacity : 0,
  }));

  const ticketRows = await db.callTicket.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const tickets: DeskTicket[] = ticketRows.map((t) => ({
    id: t.id,
    label: t.label,
    customerName: t.customerName,
    phone: t.phone,
    age: t.age,
    isAdult: t.isAdult,
    seats: t.seats,
    screeningId: t.screeningId,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Ghișeu"
        description={`Rezervări telefonice · ${CINEMA.phone}`}
      />
      <div className="mt-6">
        <CashierDesk
          screenings={screenings}
          tickets={tickets}
          dayLabel={formatLongDate(from)}
        />
      </div>
    </div>
  );
}
