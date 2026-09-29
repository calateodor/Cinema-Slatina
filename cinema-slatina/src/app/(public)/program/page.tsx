import type { Metadata } from "next";
import { WeekSchedule } from "@/components/site/week-schedule";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
      <div className="grid items-center gap-2 lg:grid-cols-[1.15fr_1fr]">
        <PageHeader
          title="Programul săptămânii"
          description={`Săptămâna ${formatWeekRange(schedule.thisWeekStart)}. Intrarea este gratuită la toate proiecțiile.`}
        />
        <Reveal y={16} className="-mt-4 mb-4 lg:mt-0 lg:mb-0">
          <ProgramBanner />
        </Reveal>
      </div>

      <div className="mt-2">
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
