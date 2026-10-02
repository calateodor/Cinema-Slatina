import { notFound } from "next/navigation";
import { DisplayBoard } from "@/components/display/display-board";
import { getDisplayProgram } from "@/server/queries";

export const dynamic = "force-dynamic";

/**
 * Televizorul de la intrarea unei săli (/afisaj/rosie, /afisaj/albastra):
 * indicatorul sălii cu săgeată, trailerul filmului care rulează acum (sau al
 * celui care urmează) și programul sălii.
 *
 * Parametri în link:
 * - `?sunet=1` pornește sunetul trailerului;
 * - `?model=1|2|3` alege aranjamentul (bandă sus, coloană laterală, trailer
 *   pe tot ecranul — cel implicit);
 * - `?dir=stanga|dreapta` schimbă direcția săgeții; fără el, Sala Roșie arată
 *   spre stânga, iar Sala Albastră spre dreapta.
 */
export default async function HallDisplayPage(props: PageProps<"/afisaj/[hall]">) {
  const [{ hall }, search] = await Promise.all([props.params, props.searchParams]);
  const program = await getDisplayProgram();
  if (!program.halls.some((h) => h.slug === hall)) notFound();

  // implicit modelul 3 (trailer pe tot ecranul), ales de Teo
  const model = search.model === "1" ? 1 : search.model === "2" ? 2 : 3;
  const direction =
    search.dir === "dreapta"
      ? "right"
      : search.dir === "stanga"
        ? "left"
        : hall === "albastra"
          ? "right"
          : "left";

  return (
    <DisplayBoard
      program={program}
      hallSlug={hall}
      sound={search.sunet === "1"}
      model={model}
      direction={direction}
    />
  );
}
