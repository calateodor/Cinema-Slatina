import type { Metadata } from "next";
import { StaffShell } from "@/components/staff/staff-shell";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administrare",
  robots: { index: false, follow: false },
};


export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <StaffShell
      variant="admin"
      title="Administrare"
      user={{ fullName: user.fullName, role: user.role }}
    >
      {children}
    </StaffShell>
  );
}
