import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Phone, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CINEMA } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mt-14 sm:mt-20", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  action,
  description,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="display text-[clamp(1.5rem,4vw,2.4rem)] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-orange transition-colors hover:text-brand-yellow motion-reduce:transition-none"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      ) : null}
    </div>
  );
}

const VISIT_CARDS = [
  {
    icon: Ticket,
    title: "Intrare gratuită",
    body: "La toate filmele, în fiecare zi.",
  },
  {
    icon: Clock3,
    title: CINEMA.hours,
    body: `Casieria. ${CINEMA.firstScreening}.`,
  },
  {
    icon: MapPin,
    title: "Cum ajungi",
    body: CINEMA.address,
    link: { href: CINEMA.mapsUrl, label: "Vezi indicații pe hartă", external: true },
  },
  {
    icon: Phone,
    title: "Rezervări",
    body: `${CINEMA.phone}, ${CINEMA.reservationHours.toLowerCase()}.`,
    link: { href: "/program", label: "Sau apasă pe ora dorită" },
  },
];

export function VisitInfo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {VISIT_CARDS.map((card) => (
        <Card
          key={card.title}
          className="transition-shadow duration-300 hover:ring-brand-yellow/30 motion-reduce:transition-none"
        >
          <CardContent className="flex flex-col gap-1">
            <card.icon className="size-5 text-brand-orange" aria-hidden="true" />
            <h3 className="mt-2 text-base font-semibold">{card.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {card.body}
            </p>
            {card.link ? (
              card.link.external ? (
                <a
                  href={card.link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-yellow"
                >
                  {card.link.label}
                  <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <Link
                  href={card.link.href}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-yellow"
                >
                  {card.link.label}
                  <ArrowRight className="size-3.5" />
                </Link>
              )
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
