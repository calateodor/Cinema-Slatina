import { notFound } from "next/navigation";
import { DisplayBoard } from "@/components/display/display-board";
import { getDisplayProgram } from "@/server/queries";

export const dynamic = "force-dynamic";

/** Proba temei de Halloween pe televizoarele sălilor (ca /afisaj/rosie, /afisaj/albastra). */
export default async function HalloweenHallPage(props: PageProps<"/halloween/[hall]">) {
  const [{ hall }, search] = await Promise.all([props.params, props.searchParams]);
  const program = await getDisplayProgram();
  if (!program.halls.some((h) => h.slug === hall)) notFound();
  return (
    <DisplayBoard
      program={program}
      hallSlug={hall}
      sound={search.sunet === "1"}
      direction={hall === "albastra" ? "right" : "left"}
      theme="halloween"
    />
  );
}
