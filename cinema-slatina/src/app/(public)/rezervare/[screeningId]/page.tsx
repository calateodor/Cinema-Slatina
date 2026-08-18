import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { SeatMeter } from "@/components/site/seat-meter";
import { HallBadge } from "@/components/site/showtime-card";
import { ReservationForm } from "@/components/site/reservation-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLongDate, formatTime, isPast } from "@/lib/dates";
import { areReservationsEnabled, getScreeningView } from "@/server/queries";

export const metadata: Metadata = { title: "Rezervare" };

export default async function ReservationPage(
  props: PageProps<"/rezervare/[screeningId]">,
) {
  const { screeningId } = await props.params;
  const [screening, reservationsEnabled] = await Promise.all([
    getScreeningView(screeningId),
    areReservationsEnabled(),
  ]);

  if (!screening) notFound();

  const { movie, capacity } = screening;
  const free = capacity.freeBase + capacity.freeExtra;
  const closed =
    !reservationsEnabled ||
    !screening.reservationsOpen ||
    screening.isCancelled ||
    free === 0 ||
    isPast(new Date(screening.startsAt));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/program"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Înapoi la program
      </Link>

      <h1 className="display text-[clamp(1.6rem,4.5vw,2.6rem)]">
        Rezervă gratuit
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="w-20 shrink-0">
                <MoviePoster
                  title={movie.title}
                  posterUrl={movie.posterUrl}
                  sizes="80px"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-pretty text-base font-semibold leading-snug">
                  {movie.title}
                </h2>
                {movie.genres ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {movie.genres}
                  </p>
                ) : null}
                <p className="ticket mt-2 text-2xl leading-none text-brand-orange">
                  {formatTime(screening.startsAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground first-letter:uppercase">
                  {formatLongDate(new Date(screening.startsAt))}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HallBadge hall={screening.hall} />
              <Badge variant="outline">{screening.is3D ? "3D" : "2D"}</Badge>
              <Badge variant="outline">
                {screening.isDubbed ? "Dublat" : "Subtitrat"}
              </Badge>
              {movie.ageRating ? (
                <Badge variant="outline">{movie.ageRating}</Badge>
              ) : null}
            </div>

            <SeatMeter capacity={capacity} />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Locurile nu sunt numerotate. Rezervarea îți garantează accesul în
              sală până cu 10 minute înainte de începerea filmului.
            </p>
          </CardContent>
        </Card>

        {closed ? (
          <Card>
            <CardHeader>
              <CardTitle className="display text-2xl">
                Rezervările sunt indisponibile
              </CardTitle>
              <CardDescription>
                {free === 0
                  ? "Toate locurile, inclusiv cele 20 de scaune suplimentare, sunt ocupate."
                  : "Rezervările pentru această proiecție sunt închise momentan."}{" "}
                Poți alege o altă oră din program sau ne poți suna la casierie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/program"
                className="text-sm font-medium text-brand-orange hover:text-brand-yellow"
              >
                Vezi restul programului →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ReservationForm
            screeningId={screening.id}
            maxSeats={free}
            usesExtraSeats={capacity.freeBase === 0 && capacity.freeExtra > 0}
          />
        )}
      </div>
    </div>
  );
}
