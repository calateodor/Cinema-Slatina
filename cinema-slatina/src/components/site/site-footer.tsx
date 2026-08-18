import Link from "next/link";
import { BrandLogo, CityCrest } from "@/components/site/brand";
import { CINEMA } from "@/lib/constants";

const INFO_LINKS = [
  { href: "/regulament", label: "Regulament" },
  { href: "/bar", label: "Meniul barului" },
  { href: "/program", label: "Programul săptămânii" },
  { href: "/contact", label: "Întrebări frecvente" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface-sunken">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {CINEMA.name} · {CINEMA.address}. {CINEMA.owner}
            </p>
            <CityCrest className="mt-6" />
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
              <li>
                <Link
                  href="/autentificare"
                  className="transition-colors hover:text-foreground"
                >
                  Acces personal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="film-strip mt-10 h-1 w-full rounded-full opacity-30" />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {CINEMA.name} {CINEMA.city}. Toate
          drepturile rezervate.
        </p>
      </div>
    </footer>
  );
}
