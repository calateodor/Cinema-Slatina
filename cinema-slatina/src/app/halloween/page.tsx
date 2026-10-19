import { DisplayBoard } from "@/components/display/display-board";
import { getDisplayProgram } from "@/server/queries";

export const dynamic = "force-dynamic";

/** Proba temei de Halloween pe televizorul de la casierie (ca /afisaj). */
export default async function HalloweenDisplayPage() {
  const program = await getDisplayProgram();
  return <DisplayBoard program={program} theme="halloween" />;
}
