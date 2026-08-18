import type { Metadata } from "next";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/sections";
import { CityCrest } from "@/components/site/brand";
import { Card, CardContent } from "@/components/ui/card";
import { CINEMA } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Adresa, programul și datele de contact ale Cinematografului Eugen Ionescu din Slatina.",
};

const FAQ = [
  {
    q: "Cât costă biletul?",
    a: "Intrarea este gratuită la toate proiecțiile. Rezervarea este și ea gratuită și îți garantează locul până cu 10 minute înainte de începerea filmului.",
  },
  {
    q: "Pot alege pe ce scaun stau?",
    a: "Nu. Locurile nu sunt numerotate: pe site vezi doar câte locuri mai sunt libere din cele 100 ale sălii, iar în sală te așezi unde dorești.",
  },
  {
    q: "Ce fac dacă sala este plină?",
    a: "Când cele 100 de locuri se ocupă, se deschid cele 20 de scaune mobile suplimentare. Dacă și acestea se epuizează, poți alege o altă oră din program.",
  },
  {
    q: "Cum rezerv telefonic?",
    a: `Sună la ${CINEMA.phone}, ${CINEMA.reservationHours.toLowerCase()}. Colegii de la casierie îți preiau numele și numărul de telefon și îți confirmă rezervarea pe loc.`,
  },
  {
    q: "Am nevoie de ochelari 3D proprii?",
    a: "Nu, ochelarii se ridică de la barul cinematografului și se returnează la ieșirea din sală.",
  },
];

const CONTACT_CARDS = [
  {
    icon: MapPin,
    title: "Adresă",
    body: CINEMA.address,
    href: CINEMA.mapsUrl,
    external: true,
  },
  {
    icon: Phone,
    title: "Telefon rezervări",
    body: `${CINEMA.phone} · ${CINEMA.reservationHours.toLowerCase()}`,
    href: `tel:${CINEMA.phone.replace(/\s/g, "")}`,
    external: false,
  },
  {
    icon: Mail,
    title: "E-mail",
    body: CINEMA.email,
    href: `mailto:${CINEMA.email}`,
    external: false,
  },
  {
    icon: Clock3,
    title: "Program",
    body: `${CINEMA.hours}. ${CINEMA.firstScreening}.`,
    href: null,
    external: false,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <Reveal y={16}>
        <SectionHeading
          title="Contact"
          description={`${CINEMA.name} · ${CINEMA.city}`}
        />
      </Reveal>

      <Reveal stagger className="grid gap-3 sm:grid-cols-2">
        {CONTACT_CARDS.map((card) => {
          const body = (
            <CardContent className="flex flex-col gap-1">
              <card.icon className="size-5 text-brand-orange" aria-hidden="true" />
              <h2 className="mt-2 font-semibold">{card.title}</h2>
              <p className="text-sm text-muted-foreground">{card.body}</p>
            </CardContent>
          );

          return (
            <Card
              key={card.title}
              className="transition-shadow hover:ring-brand-yellow/30 motion-reduce:transition-none"
            >
              {card.href ? (
                <a
                  href={card.href}
                  target={card.external ? "_blank" : undefined}
                  rel={card.external ? "noreferrer noopener" : undefined}
                >
                  {body}
                </a>
              ) : (
                body
              )}
            </Card>
          );
        })}
      </Reveal>

      <section className="flex flex-col gap-5">
        <h2 className="display text-[clamp(1.35rem,3.5vw,2rem)]">
          Întrebări frecvente
        </h2>
        <dl className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <Card key={item.q}>
              <CardContent>
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </CardContent>
            </Card>
          ))}
        </dl>
      </section>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <CityCrest />
          <p className="max-w-md text-sm text-muted-foreground">{CINEMA.owner}</p>
        </CardContent>
      </Card>
    </div>
  );
}
