import Image from "next/image";
import Link from "next/link";
import { CINEMA } from "@/lib/constants";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string | null;
  /** Varianta pentru fundal deschis (panourile interne). */
  onLight?: boolean;
};

const SIZES = {
  sm: "h-12",
  md: "h-16 sm:h-24",
  lg: "h-32",
} as const;

/**
 * Sigla oficială a cinematografului. Pe fundal închis folosim varianta cu
 * aparatul de filmat deschis la culoare, altfel ar dispărea în negru.
 */
export function BrandLogo({
  size = "md",
  className,
  href = "/",
  onLight = false,
}: LogoProps) {
  const content = (
    <Image
      src={onLight ? "/brand/cinema-logo-trimmed.png" : "/brand/cinema-logo-dark.png"}
      alt={`${CINEMA.name} ${CINEMA.city}`}
      width={1550}
      height={1700}
      priority
      className={cn(
        "w-auto transition-transform duration-300 hover:scale-[1.03] motion-reduce:transition-none",
        SIZES[size],
        className,
      )}
    />
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label={`${CINEMA.name} ${CINEMA.city} — prima pagină`}>
      {content}
    </Link>
  );
}

/**
 * Semnătura orașului, sub sala din prima pagină: sloganul „Cinema la tine în
 * oraș”, stema Primăriei și „Cred în Slatina”, pe paralelogramul galben din
 * sigla cinematografului.
 */
export function CityBrandBand() {
  return (
    <section
      aria-label="Cinema la tine în oraș"
      className="relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#0b0b0e] px-5 py-8 sm:rounded-[2.25rem] sm:px-10 sm:py-12"
    >
      {/* Paralelogramul galben din siglă, înclinat, ca fundal al stemei. */}
      <div
        aria-hidden="true"
        className="absolute -right-24 top-0 hidden h-full w-[46%] -skew-x-[14deg] bg-brand-yellow/95 md:block"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-0 hidden h-full w-[46%] translate-x-[-3.25rem] -skew-x-[14deg] border-l-[10px] border-brand-ink/90 md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand-orange/20 blur-3xl"
      />

      <div className="relative grid items-center gap-8 md:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col gap-5">
          <Image
            src="/brand/slogan-cinema-la-tine.png"
            alt="Cinema la tine în oraș"
            width={1013}
            height={570}
            className="h-auto w-full max-w-[34rem] drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          />
          <p className="max-w-md text-[0.95rem] leading-relaxed text-white/75">
            {CINEMA.name} este cinematograful orașului, administrat de Primăria
            Municipiului Slatina. Două săli, filme noi în fiecare săptămână și
            intrare gratuită la toate proiecțiile.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 md:justify-end md:pr-6">
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/brand/primaria-slatina.png"
              alt="Stema Municipiului Slatina"
              width={404}
              height={600}
              className="h-36 w-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)] sm:h-44"
            />
            <span className="ticket text-center text-sm leading-tight tracking-[0.16em] text-white md:text-brand-ink">
              PRIMĂRIA MUNICIPIULUI
              <br />
              SLATINA
            </span>
          </div>
          <Image
            src="/brand/cred-in-slatina.png"
            alt="Cred în Slatina"
            width={462}
            height={503}
            className="h-28 w-auto drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] sm:h-36 md:[filter:drop-shadow(0_0_0_#0a0a0b)_drop-shadow(0_2px_0_#0a0a0b)_drop-shadow(0_10px_24px_rgba(0,0,0,0.45))]"
          />
        </div>
      </div>
    </section>
  );
}

/** Stema Primăriei Municipiului Slatina + sigla „Cred în Slatina”. */
export function CityCrest({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/primaria-slatina.png"
        alt="Stema Municipiului Slatina"
        width={88}
        height={128}
        className="h-16 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:h-20"
      />
      {withWordmark ? (
        <Image
          src="/brand/cred-in-slatina.png"
          alt="Cred în Slatina"
          width={72}
          height={76}
          className="h-11 w-auto opacity-90"
        />
      ) : null}
    </div>
  );
}
