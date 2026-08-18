import Link from "next/link";
import { PageTitle } from "@/components/staff/ui";
import {
  ReservationList,
  type ReservationRow,
} from "@/components/staff/reservation-list";
import { db } from "@/lib/db";
import { RESERVATION_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "PENDING", label: RESERVATION_STATUS_LABEL.PENDING },
  { key: "CONFIRMED", label: RESERVATION_STATUS_LABEL.CONFIRMED },
  { key: "CHECKED_IN", label: RESERVATION_STATUS_LABEL.CHECKED_IN },
  { key: "CANCELLED", label: RESERVATION_STATUS_LABEL.CANCELLED },
  { key: "all", label: "Toate" },
];

export default async function AdminReservationsPage(
  props: PageProps<"/admin/rezervari">,
) {
  const searchParams = await props.searchParams;
  const filter = typeof searchParams?.stare === "string" ? searchParams.stare : "active";

  const where =
    filter === "all"
      ? {}
      : filter === "active"
        ? { status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } }
        : { status: filter };

  const rows = await db.reservation.findMany({
    where,
    include: {
      screening: {
        include: {
          movie: { select: { title: true, ageRating: true } },
          hall: { select: { name: true, colorHex: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const reservations: ReservationRow[] = rows.map((r) => ({
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
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Rezervări"
        description={`${reservations.length} rezervări afișate.`}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/rezervari?stare=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        <ReservationList reservations={reservations} />
      </div>
    </div>
  );
}
