import { MenuManager, type MenuRow } from "@/components/admin/menu-manager";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";

export default async function AdminMenuPage() {
  const items: MenuRow[] = await db.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      category: true,
      name: true,
      description: true,
      priceBani: true,
      isAvailable: true,
      sortOrder: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Meniul barului"
        description="Prețurile de aici apar direct pe pagina publică „Bar”."
      />
      <MenuManager items={items} />
    </div>
  );
}
