import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pictograma de proiector din sigla oficială, desenată ca SVG ca să rămână clară la orice dimensiune. */
export function ProjectorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-9", className)}
    >
      <circle cx="14" cy="9" r="8" fill="currentColor" />
      <circle cx="14" cy="9" r="2.4" fill="var(--brand-ink)" />
      <circle cx="27" cy="10.5" r="6.5" fill="currentColor" />
      <circle cx="27" cy="10.5" r="1.9" fill="var(--brand-ink)" />
      <path
        d="M6 17h26v11H10a4 4 0 0 1-4-4v-7Z"
        fill="currentColor"
      />
      <path d="M32 21.5 44 15v14l-12-6.5v-1Z" fill="currentColor" />
      <path d="M2 19h4v7H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z" fill="currentColor" />
    </svg>
  );
}

type LogoProps = {
  /** Varianta compactă folosită în bara de sus. */
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string | null;
};

/** Lockup-ul „CINEMA SLATINA” din bara de navigare. */
export function BrandLogo({ size = "md", className, href = "/" }: LogoProps) {
  const content = (
    <span
      className={cn(
        "group inline-flex items-center gap-2.5 whitespace-nowrap",
        className,
      )}
    >
      <ProjectorMark
        className={cn(
          "text-brand-yellow transition-transform duration-300 group-hover:-rotate-6",
          size === "sm" && "h-5 w-7",
          size === "lg" && "h-8 w-12",
        )}
      />
      <span
        className={cn(
          "ticket font-normal italic tracking-wide",
          size === "sm" && "text-lg",
          size === "md" && "text-xl sm:text-2xl",
          size === "lg" && "text-3xl",
        )}
      >
        <span className="text-brand-yellow">CINEMA</span>{" "}
        <span className="text-foreground">SLATINA</span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Cinema Eugen Ionescu Slatina — prima pagină">
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
        width={44}
        height={64}
        className="h-11 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
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
