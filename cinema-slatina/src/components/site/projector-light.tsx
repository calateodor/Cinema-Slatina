import type { CSSProperties } from "react";
import type { HallFrame } from "@/lib/hall-scene";
import { cn } from "@/lib/utils";

/**
 * Lumina filmului care cade în sală: cadrul filmului, foarte estompat, se
 * reflectă pe pereți, pe tavan și pe spătarul scaunelor, centrat pe ecran.
 */
export function ScreenSpill({
  imageUrl,
  frame,
  className,
}: {
  imageUrl: string | null;
  frame: HallFrame;
  className?: string;
}) {
  if (!imageUrl) return null;
  const [tl, , br] = frame.screen;
  const cx = (tl[0] + br[0]) / 2;
  const cy = (tl[1] + br[1]) / 2;
  return (
    <div
      aria-hidden="true"
      key={imageUrl}
      className={cn("screen-spill pointer-events-none absolute inset-0", className)}
      style={
        {
          backgroundImage: `url("${imageUrl}")`,
          maskImage: `radial-gradient(ellipse 75% 85% at ${cx}% ${cy}%, #000 25%, transparent 75%)`,
          WebkitMaskImage: `radial-gradient(ellipse 75% 85% at ${cx}% ${cy}%, #000 25%, transparent 75%)`,
        } as CSSProperties
      }
    />
  );
}
