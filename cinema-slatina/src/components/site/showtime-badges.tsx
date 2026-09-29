import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Ora proiecției. Varianta `poster` este cea de pe afișul din Canva: litere
 * galbene, rotunde, cu contur închis, ușor înclinate, lipite peste marginea
 * posterului. Varianta `pill` (eticheta galbenă cu text închis) rămâne pentru
 * panourile interne, care rulează pe fundal deschis.
 */
export function TimeBadge({
  startsAt,
  size = "md",
  variant = "pill",
  className,
}: {
  startsAt: Date | string;
  size?: "sm" | "md" | "lg";
  variant?: "poster" | "pill";
  className?: string;
}) {
  const time = formatTime(new Date(startsAt));

  if (variant === "poster") {
    return (
      <span
        className={cn(
          "poster-type tilt inline-block",
          size === "sm" && "text-xl",
          size === "md" && "text-3xl sm:text-4xl",
          size === "lg" && "text-4xl sm:text-5xl",
          className,
        )}
      >
        {time}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "ticket tilt inline-block rounded-lg bg-brand-yellow px-3 py-0.5 leading-tight text-brand-ink shadow-[0_6px_16px_-6px_rgba(0,0,0,0.75)]",
        size === "sm" && "px-2 text-lg",
        size === "md" && "text-2xl sm:text-3xl",
        size === "lg" && "text-3xl sm:text-4xl",
        className,
      )}
    >
      {time}
    </span>
  );
}

/** Marcajul 3D din colțul de jos al afișului, ca pe afișul tipărit. */
export function Badge3D({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "poster-type tilt-strong absolute bottom-1.5 right-2 text-[clamp(1.1rem,14cqw,2rem)]",
        className,
      )}
      aria-label="Proiecție 3D"
    >
      3D
    </span>
  );
}

/** Varianta discretă a marcajului 3D, pentru liste și panouri interne. */
export function Badge3DPill({ className }: { className?: string }) {
  return (
    <Badge variant="brand" className={cn("h-auto px-2 py-0.5", className)}>
      3D
    </Badge>
  );
}
