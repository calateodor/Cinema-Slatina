import type { Metadata } from "next";
import { WeekSchedule } from "@/components/site/week-schedule";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/sections";
import { ProgramBanner } from "@/components/site/program-banner";
import { dayKey, formatWeekRange, todayStart, weekDays } from "@/lib/dates";
import { areReservationsEnabled, getPublicSchedule } from "@/server/queries";

export const metadata: Metadata = {
  title: "Program",
  description:
    "Programul complet al proiecțiilor din această săptămână, pe săli și pe ore.",
};

export default async function ProgramPage() {
  const [schedule, reservationsEnabled] = await Promise.all([
    getPublicSchedule(),
    areReservationsEnabled(),
  ]);

  const today = todayStart();
  const days = weekDays(schedule.thisWeekStart)
    .filter((d) => d >= today)
    .map(dayKey);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Reveal y={16} className="mb-8">
        <ProgramBanner />
      </Reveal>
      <Reveal y={16}>
        <SectionHeading
          title="Programul săptămânii"
          description={`Săptămâna ${formatWeekRange(schedule.thisWeekStart)}. Intrarea este gratuită la toate proiecțiile.`}
        />
      </Reveal>

      <div className="mt-6">
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
    </div>
  );
}
