import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Film,
  Ticket,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatWeekRange, nextWeekStartOf, weekStartOf } from "@/lib/dates";
import { areReservationsEnabled } from "@/server/queries";
import { PageTitle, StatCard } from "@/components/staff/ui";

export default async function AdminDashboard() {
  const thisWeek = weekStartOf();
  const nextWeek = nextWeekStartOf();

  const [
    currentWeek,
    upcomingWeek,
    movieCount,
    screeningCount,
    reservationCount,
    pendingCount,
    userCount,
    reservationsOn,
    activeClosures,
  ] = await Promise.all([
    db.weekSchedule.findUnique({ where: { weekStart: thisWeek } }),
    db.weekSchedule.findUnique({
      where: { weekStart: nextWeek },
      include: { _count: { select: { screenings: true } } },
    }),
    db.movie.count({ where: { isArchived: false } }),
    db.screening.count({
      where: { startsAt: { gte: new Date() }, isCancelled: false },
    }),
    db.reservation.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } },
    }),
    db.reservation.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { isActive: true } }),
    areReservationsEnabled(),
    db.closureNotice.count({ where: { isActive: true, endDate: { gte: new Date() } } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Panou de administrare"
        description={`Săptămâna curentă: ${formatWeekRange(thisWeek)}`}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Film}
          label="Filme active"
          value={String(movieCount)}
          href="/admin/filme"
        />
        <StatCard
          icon={CalendarDays}
          label="Proiecții viitoare"
          value={String(screeningCount)}
          href="/admin/program"
        />
        <StatCard
          icon={Ticket}
          label="Rezervări active"
          value={String(reservationCount)}
          hint={pendingCount > 0 ? `${pendingCount} în așteptare` : undefined}
          href="/admin/rezervari"
        />
        <StatCard
          icon={Users}
          label="Conturi personal"
          value={String(userCount)}
          href="/admin/setari"
        />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <StatusPanel
          title="Programul acestei săptămâni"
          published={Boolean(currentWeek?.isPublished)}
          publishedText="Este publicat și vizibil pe site."
          draftText="Nu este publicat. Vizitatorii nu văd orele."
          href="/admin/program"
        />
        <StatusPanel
          title="Programul săptămânii viitoare"
          published={Boolean(upcomingWeek?.isPublished)}
          publishedText={`Publicat · ${formatWeekRange(nextWeek)}`}
          draftText={
            upcomingWeek?._count.screenings
              ? `${upcomingWeek._count.screenings} proiecții pregătite, dar nepublicate.`
              : 'Nicio proiecție adăugată. Pe site scrie „programul nu este încă stabilit”.'
          }
          href="/admin/program"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Rezervări online</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reservationsOn
              ? "Sunt pornite. Vizitatorii pot rezerva de pe site."
              : "Sunt oprite. Pe site apare mesajul că rezervările se fac doar telefonic."}
          </p>
          <Link
            href="/admin/setari"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Schimbă în setări →
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Anunțuri de închidere</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeClosures > 0
              ? `${activeClosures} anunț(uri) active, afișate în capul site-ului.`
              : "Niciun anunț activ."}
          </p>
          <Link
            href="/admin/anunturi"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Gestionează anunțurile →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  title,
  published,
  publishedText,
  draftText,
  href,
}: {
  title: string;
  published: boolean;
  publishedText: string;
  draftText: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        {published ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        )}
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {published ? publishedText : draftText}
          </p>
          <Link
            href={href}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Deschide programul →
          </Link>
        </div>
      </div>
    </div>
  );
}
