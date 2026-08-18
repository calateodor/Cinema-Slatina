import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/sections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CINEMA, SETTING_KEYS } from "@/lib/constants";
import { getSettings } from "@/server/queries";

export const metadata: Metadata = {
  title: "Regulament",
  description:
    "Regulile de acces și de comportament în sălile Cinematografului Eugen Ionescu din Slatina.",
};

const DEFAULT_RULES: { title: string; items: string[] }[] = [
  {
    title: "Accesul în sală",
    items: [
      "Intrarea la toate proiecțiile este gratuită, în limita locurilor disponibile.",
      "Accesul se face pe baza rezervării confirmate sau, dacă mai sunt locuri libere, direct de la casierie.",
      "Rezervările se păstrează până cu 10 minute înainte de începerea filmului. După acest interval, locurile pot fi date altor spectatori.",
      "Sala se deschide cu 15 minute înainte de ora afișată în program.",
    ],
  },
  {
    title: "Vârsta spectatorilor",
    items: [
      "Filmele marcate AG pot fi vizionate de orice spectator.",
      "Filmele marcate AP-12 pot fi vizionate de copiii sub 12 ani doar însoțiți de un adult.",
      "Filmele marcate N-15 nu sunt recomandate spectatorilor sub 15 ani.",
      "Filmele marcate IM-18 sunt interzise minorilor. Casieria poate solicita un act de identitate.",
    ],
  },
  {
    title: "În timpul proiecției",
    items: [
      "Mâncarea și băutura din exterior nu sunt permise în sală.",
      "Telefoanele se trec pe modul silențios pe toată durata filmului.",
      "Fotografierea, filmarea și înregistrarea audio a filmului sunt interzise prin lege.",
      "Fumatul, inclusiv țigările electronice, este interzis în toată clădirea.",
    ],
  },
  {
    title: "Ochelarii 3D și scaunele suplimentare",
    items: [
      "La proiecțiile 3D, ochelarii se ridică de la bar și se returnează la ieșirea din sală.",
      "Fiecare sală are 100 de locuri fixe. Când acestea se ocupă complet, se deschid cele 20 de scaune mobile suplimentare.",
      "Scaunele suplimentare se atribuie în ordinea rezervărilor și nu pot fi alese în avans.",
    ],
  },
];

export default async function RulesPage() {
  const settings = await getSettings();
  const custom = settings[SETTING_KEYS.RULES_CONTENT];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <Reveal y={16}>
        <SectionHeading
          title="Regulament"
          description={`Regulile de acces în sălile ${CINEMA.name} din ${CINEMA.city}.`}
        />
      </Reveal>

      {custom ? (
        <Reveal y={16}>
          <Card>
            <CardContent className="whitespace-pre-line text-[0.95rem] leading-relaxed text-muted-foreground">
              {custom}
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal stagger className="flex flex-col gap-4">
          {DEFAULT_RULES.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="ticket text-xl tracking-wide text-brand-yellow">
                  {group.title.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-[0.95rem] leading-relaxed text-muted-foreground"
                    >
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-orange"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}

      <p className="text-sm text-muted-foreground">
        Pentru situații care nu sunt acoperite de regulament, personalul
        cinematografului decide la fața locului. Ne poți suna oricând la{" "}
        <a
          href={`tel:${CINEMA.phone.replace(/\s/g, "")}`}
          className="font-medium text-brand-orange hover:text-brand-yellow"
        >
          {CINEMA.phone}
        </a>
        .
      </p>
    </div>
  );
}
