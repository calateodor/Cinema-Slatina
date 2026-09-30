import { DisplayBoard } from "@/components/display/display-board";
import { getDisplayProgram } from "@/server/queries";

// programul se citește din bază la fiecare cerere (televizorul reîncarcă singur)
export const dynamic = "force-dynamic";

/** Televizorul de la casierie: programul de azi din ambele săli. */
export default async function DisplayPage() {
  const program = await getDisplayProgram();
  return <DisplayBoard program={program} />;
}
