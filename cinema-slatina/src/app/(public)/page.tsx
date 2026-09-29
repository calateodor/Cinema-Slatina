import Link from "next/link";
import { CinemaHallHero } from "@/components/site/cinema-hall-hero";
import { PosterGrid } from "@/components/site/poster-grid";
import { ComingSoonList } from "@/components/site/coming-soon-list";
import { Section, SectionHeading, VisitInfo } from "@/components/site/sections";
import { Reveal } from "@/components/motion/reveal";
import { CityBrandBand } from "@/components/site/brand";
import { HALL_SCENE } from "@/lib/hall-scene";
import {
  areReservationsEnabled,
  getComingSoon,
  getHeroItems,
  getWeekGrid,
} from "@/server/queries";
import { CINEMA } from "@/lib/constants";

export default async function HomePage() {
  const [heroItems, grid, comingSoon, reservationsEnabled] = await Promise.all([
    getHeroItems(),
    getWeekGrid(),
    getComingSoon(),
    areReservationsEnabled(),
  ]);

  return (
    <>
      <CinemaHallHero
        items={heroItems}
        scene={HALL_SCENE}
        reservationsEnabled={reservationsEnabled}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <Section id="program" className="relative z-10 mt-0 sm:mt-0 lg:-mt-[11vw]">
          <Reveal y={20}>
            <PosterGrid
              entries={grid.entries}
              published={grid.published}
              weekStart={grid.weekStart}
              reservationsEnabled={reservationsEnabled}
            />
          </Reveal>
        </Section>

        <Reveal y={20} className="mt-10 sm:mt-14">
          <CityBrandBand />
        </Reveal>

        {comingSoon.length > 0 ? (
          <Section>
            <Reveal y={16}>
              <SectionHeading title={`În curând la ${CINEMA.shortName}`} />
            </Reveal>
            <ComingSoonList movies={comingSoon} />
          </Section>
        ) : null}

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
      </div>
    </>
  );
}
