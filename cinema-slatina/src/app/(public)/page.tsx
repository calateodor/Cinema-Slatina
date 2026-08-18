import Link from "next/link";
import { HeroCarousel, type HeroSlide } from "@/components/site/hero-carousel";
import { WeekSchedule } from "@/components/site/week-schedule";
import { MovieRail } from "@/components/site/movie-rail";
import { ComingSoonList } from "@/components/site/coming-soon-list";
import { Section, SectionHeading, VisitInfo } from "@/components/site/sections";
import { Reveal } from "@/components/motion/reveal";
import { CityCrest } from "@/components/site/brand";
import { dayKey, startOfDay, weekDays } from "@/lib/dates";
import {
  areReservationsEnabled,
  getComingSoon,
  getMoviesThisWeek,
  getPublicSchedule,
} from "@/server/queries";
import { CINEMA } from "@/lib/constants";

export default async function HomePage() {
  const [schedule, moviesThisWeek, comingSoon, reservationsEnabled] =
    await Promise.all([
      getPublicSchedule(),
      getMoviesThisWeek(),
      getComingSoon(),
      areReservationsEnabled(),
    ]);

  const today = startOfDay(new Date());
  const days = weekDays(schedule.thisWeekStart)
    .filter((d) => d >= today)
    .map(dayKey);

  const slides: HeroSlide[] = [
    ...comingSoon.map((m) => ({
      slug: m.slug,
      eyebrow: "ÎN CURÂND",
      title: m.title,
      synopsis: m.synopsis,
      posterUrl: m.posterUrl,
      backdropUrl: m.backdropUrl,
      genres: m.genres,
    })),
    ...moviesThisWeek.slice(0, 3).map((m) => ({
      slug: m.slug,
      eyebrow: "ACUM ÎN PROGRAM",
      title: m.title,
      synopsis: null,
      posterUrl: m.posterUrl,
      backdropUrl: null,
      genres: m.genres,
    })),
  ].slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
      <Reveal y={16}>
        <HeroCarousel slides={slides} />
      </Reveal>

      <Section id="program">
        <Reveal y={16}>
          <SectionHeading
            title="Programul săptămânii"
            action={{ href: "/program", label: "Toate proiecțiile" }}
          />
        </Reveal>
        <div className="mt-5">
          <WeekSchedule
            screenings={schedule.current.screenings}
            currentPublished={schedule.currentPublished}
            nextScreenings={schedule.next.screenings}
            nextPublished={schedule.nextPublished}
            nextWeekStart={schedule.nextWeekStart.toISOString()}
            days={days}
            reservationsEnabled={reservationsEnabled}
          />
        </div>
      </Section>

      <Section>
        <Reveal y={16}>
          <SectionHeading
            title="Filmele săptămânii"
            action={{ href: "/filme", label: "Vezi toate" }}
          />
        </Reveal>
        <MovieRail movies={moviesThisWeek} />
      </Section>

      <Section>
        <Reveal y={16}>
          <SectionHeading title={`În curând la ${CINEMA.shortName}`} />
        </Reveal>
        <ComingSoonList movies={comingSoon} />
      </Section>

      <Section id="vizita">
        <Reveal y={16}>
          <SectionHeading title="Vizitează-ne" />
        </Reveal>
        <Reveal className="mt-5" stagger>
          <VisitInfo />
        </Reveal>
        <p className="mt-4 text-sm text-muted-foreground">
          Mâncarea și băutura din exterior nu sunt permise în sală. Regulile
          complete sunt în{" "}
          <Link
            href="/regulament"
            className="font-medium text-brand-orange hover:text-brand-yellow"
          >
            regulamentul cinematografului
          </Link>
          .
        </p>
      </Section>

      <Section>
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-8 text-center">
          <CityCrest />
          <p className="max-w-md text-sm text-muted-foreground">
            {CINEMA.name} este administrat de Primăria Municipiului Slatina.
            Intrarea la toate proiecțiile este gratuită.
          </p>
        </div>
      </Section>
    </div>
  );
}
