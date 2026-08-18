import type { Metadata } from "next";
import { StaffShell } from "@/components/staff/staff-shell";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Casierie",
  robots: { index: false, follow: false },
};


export default async function CashierLayout({
  children,
}: LayoutProps<"/casierie">) {
  const user = await requireUser([ROLES.CASHIER, ROLES.ADMIN]);

  return (
    <StaffShell
      variant="cashier"
      title="Casierie"
      user={{ fullName: user.fullName, role: user.role }}
    >
      {children}
    </StaffShell>
  );
}
