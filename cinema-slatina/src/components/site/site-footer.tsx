import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/site/brand";
import { CINEMA } from "@/lib/constants";

const INFO_LINKS = [
  { href: "/regulament", label: "Regulament" },
  { href: "/bar", label: "Meniul barului" },
  { href: "/program", label: "Programul săptămânii" },
  { href: "/contact", label: "Întrebări frecvente" },
];

export function SiteFooter({ user }: { user: { role: string } | null }) {
  // Accesul personalului stă discret, jos de tot (ca la site-ul Olimpiadei);
  // cine e deja autentificat ajunge direct în panoul lui.
  const adminHref = user ? (user.role === "ADMIN" ? "/admin" : "/casierie") : "/autentificare";

  return (
    <footer className="mt-20 border-t border-border bg-surface-sunken">
      {/* Semnătura tipărită: sigla, sloganul, stema și „Cred în Slatina”. */}
      <div className="border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-6 px-4 py-10 sm:justify-between sm:px-6">
          <BrandLogo size="lg" />
          <Image
            src="/brand/slogan-cinema-la-tine.png"
            alt="Cinema la tine în oraș"
            width={1013}
            height={570}
            className="h-24 w-auto sm:h-28"
          />
          <div className="flex items-center gap-4">
            <Image
              src="/brand/primaria-slatina.png"
              alt="Stema Municipiului Slatina"
              width={404}
              height={600}
              className="h-24 w-auto sm:h-28"
            />
            <Image
              src="/brand/cred-in-slatina.png"
              alt="Cred în Slatina"
              width={462}
              height={503}
              className="h-20 w-auto sm:h-24"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="ticket text-base tracking-widest text-brand-yellow">
              PRIMĂRIA MUNICIPIULUI SLATINA
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {CINEMA.name} · {CINEMA.address}. {CINEMA.owner}
            </p>
          </div>

          <div>
            <h2 className="ticket text-base tracking-widest text-brand-yellow">
              CONTACT
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`tel:${CINEMA.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-foreground"
                >
                  {CINEMA.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CINEMA.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {CINEMA.email}
                </a>
              </li>
              <li>{CINEMA.hours}</li>
            </ul>
          </div>

          <div>
            <h2 className="ticket text-base tracking-widest text-brand-yellow">
              INFORMAȚII
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="film-strip mt-10 h-1 w-full rounded-full opacity-30" />

        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {CINEMA.name} {CINEMA.city}. Toate
            drepturile rezervate.
          </p>
          <Link
            href={adminHref}
            className="opacity-60 transition-[opacity,color] hover:text-brand-yellow hover:opacity-100"
          >
            Administrare
          </Link>
        </div>
      </div>
    </footer>
  );
}
