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
