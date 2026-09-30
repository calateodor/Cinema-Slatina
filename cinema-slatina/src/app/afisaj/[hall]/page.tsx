import { notFound } from "next/navigation";
import { DisplayBoard } from "@/components/display/display-board";
import { getDisplayProgram } from "@/server/queries";

export const dynamic = "force-dynamic";

/**
 * Televizorul de la intrarea unei săli (/afisaj/rosie, /afisaj/albastra):
 * trailerul filmului care urmează (sau a început de mai puțin de 10 minute)
 * și lista sălii. `?sunet=1` pornește sunetul trailerului.
 */
export default async function HallDisplayPage(props: PageProps<"/afisaj/[hall]">) {
  const [{ hall }, search] = await Promise.all([props.params, props.searchParams]);
  const program = await getDisplayProgram();
  if (!program.halls.some((h) => h.slug === hall)) notFound();
  return <DisplayBoard program={program} hallSlug={hall} sound={search.sunet === "1"} />;
}
