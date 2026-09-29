"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Clock3 } from "lucide-react";
import { ShowtimePosterCard } from "@/components/site/showtime-poster-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { dayKey, dayTabLabel, formatShortDate, formatWeekRange } from "@/lib/dates";
import type { ScreeningView } from "@/server/queries";

type Props = {
  /** Proiecțiile din săptămâna curentă (deja filtrate: doar dacă e publicată). */
  screenings: ScreeningView[];
  currentPublished: boolean;
  nextScreenings: ScreeningView[];
  nextPublished: boolean;
  nextWeekStart: string;
  days: string[];
  reservationsEnabled: boolean;
};

const NEXT_WEEK_KEY = "__saptamana-viitoare";

export function WeekSchedule({
  screenings,
  currentPublished,
  nextScreenings,
  nextPublished,
  nextWeekStart,
  days,
  reservationsEnabled,
}: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, ScreeningView[]>();
    for (const s of screenings) {
      const key = dayKey(new Date(s.startsAt));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [screenings]);

  const tabs = useMemo(() => {
    const now = new Date();
    const list = days.map((d) => {
      const date = new Date(`${d}T12:00:00`);
      return {
        key: d,
        label: dayTabLabel(date, now),
        sub: formatShortDate(date),
      };
    });
    list.push({
      key: NEXT_WEEK_KEY,
      label: "Va urma",
      sub: nextPublished ? formatWeekRange(new Date(nextWeekStart)) : "în curând",
    });
    return list;
  }, [days, nextPublished, nextWeekStart]);

  const [active, setActive] = useState(() => tabs[0]?.key ?? NEXT_WEEK_KEY);

  const isNextWeek = active === NEXT_WEEK_KEY;
  const visible = isNextWeek ? nextScreenings : (byDay.get(active) ?? []);

  return (
    <div className="flex flex-col gap-5">
      <ToggleGroup
        type="single"
        value={active}
        onValueChange={(value) => value && setActive(value)}
        variant="outline"
        className="-mx-4 max-w-full snap-x flex-nowrap overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        aria-label="Zilele din program"
      >
        {tabs.map((tab) => (
          <ToggleGroupItem
            key={tab.key}
            value={tab.key}
            aria-label={`${tab.label}, ${tab.sub}`}
            className="h-auto shrink-0 snap-start flex-col items-start gap-0 rounded-xl border-white/10 bg-white/[0.03] px-4 py-2 transition-all duration-300 hover:border-brand-yellow/40 hover:bg-white/[0.06] data-[state=on]:border-brand-yellow data-[state=on]:bg-brand-yellow data-[state=on]:text-brand-ink data-[state=on]:shadow-[0_10px_30px_-10px_rgba(255,222,89,0.75)] motion-reduce:transition-none"
          >
            <span className="text-sm font-semibold leading-tight">
              {tab.label}
            </span>
            <span className="text-xs leading-tight opacity-75">{tab.sub}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {isNextWeek && !nextPublished ? (
        <ScheduleEmpty
          icon={CalendarClock}
          title="Programul nu este încă stabilit"
          description="Programul pentru săptămâna viitoare se anunță în curând. Revino peste câteva zile sau sună la casierie pentru detalii."
        />
      ) : !currentPublished && !isNextWeek ? (
        <ScheduleEmpty
          icon={CalendarClock}
          title="Programul nu este încă stabilit"
          description="Programul acestei săptămâni va fi publicat în curând."
        />
      ) : visible.length === 0 ? (
        <ScheduleEmpty
          icon={Clock3}
          title="Nicio proiecție în această zi"
          description="Alege o altă zi din program sau vezi toate proiecțiile săptămânii."
        />
      ) : (
        // cheia repornește intrarea cardurilor la fiecare zi aleasă
        <div
          key={active}
          className="grid grid-cols-2 gap-x-3 gap-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 motion-reduce:animate-none"
        >
          {visible.map((screening) => (
            <ShowtimePosterCard
              key={screening.id}
              screening={screening}
              reservationsEnabled={reservationsEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType;
  title: string;
  description: string;
}) {
  return (
    <Empty className="border bg-card/50">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-brand-yellow/15 text-brand-yellow">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
