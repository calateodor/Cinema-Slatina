import Image from "next/image";
import { CINEMA } from "@/lib/constants";

/**
 * Bannerul tipărit al cinematografului, pus deasupra programului, ca pe afiș.
 * Este decorativ: informația din el se repetă în antet și în subsol.
 */
export function ProgramBanner() {
  return (
    <div className="flex justify-center">
      <Image
        src="/brand/banner-cinema.png"
        alt={`${CINEMA.name} ${CINEMA.city}`}
        width={1600}
        height={655}
        priority
        className="h-auto w-full max-w-3xl"
      />
    </div>
  );
}
