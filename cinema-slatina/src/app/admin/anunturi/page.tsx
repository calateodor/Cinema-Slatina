import {
  ClosureManager,
  type ClosureRow,
} from "@/components/admin/closure-manager";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";

export default async function AdminClosuresPage() {
  const rows = await db.closureNotice.findMany({
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
  });

  const closures: ClosureRow[] = rows.map((r) => ({
    id: r.id,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    reason: r.reason,
    message: r.message,
    isActive: r.isActive,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Anunțuri de închidere"
        description="Zilele în care cinematograful este închis, cu mesajul afișat vizitatorilor."
      />
      <ClosureManager closures={closures} />
    </div>
  );
}
