"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  CalendarDays,
  Coffee,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PhoneCall,
  Search,
  Settings,
  Ticket,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

/**
 * Meniurile sunt definite aici, în componenta de client: pictogramele Lucide
 * nu pot fi transmise ca prop dintr-o componentă de server.
 */
const NAVS: Record<StaffVariant, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Panou", icon: LayoutDashboard, exact: true },
    { href: "/admin/program", label: "Program", icon: CalendarDays },
    { href: "/admin/rezervari", label: "Rezervări", icon: Ticket },
    { href: "/admin/meniu", label: "Bar", icon: Coffee },
    { href: "/admin/anunturi", label: "Anunțuri", icon: Megaphone },
    { href: "/admin/setari", label: "Setări", icon: Settings },
  ],
  cashier: [
    { href: "/casierie", label: "Ghișeu", icon: PhoneCall, exact: true },
    { href: "/casierie/cautare", label: "Caută client", icon: Search },
    { href: "/casierie/rezervari", label: "Rezervările zilei", icon: Ticket },
  ],
};

export type StaffVariant = "admin" | "cashier";

type Props = {
  variant: StaffVariant;
  title: string;
  user: { fullName: string; role: string };
  children: React.ReactNode;
};

/** Cadrul comun pentru panourile de administrare și de casierie. */
export function StaffShell({ variant, title, user, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = NAVS[variant];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="light flex min-h-dvh bg-background text-foreground">
      {/* Bara laterală, pe ecrane mari */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-5 py-4">
          <BrandLogo size="sm" onLight />
          <p className="mt-0.5 text-xs text-muted-foreground">{title}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="px-3 text-sm font-medium">{user.fullName}</p>
          <p className="px-3 text-xs text-muted-foreground">
            {user.role === "ADMIN" ? "Administrator" : "Casierie"}
          </p>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="mt-2 w-full justify-start gap-3 text-muted-foreground"
            >
              <LogOut className="size-4" />
              Ieși din cont
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Bara de sus, pe mobil */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label="Meniu"
          >
            {open ? <Menu className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.fullName}
            </p>
          </div>
          <form action={logout} className="ml-auto">
            <Button type="submit" variant="ghost" size="icon" aria-label="Ieși din cont">
              <LogOut className="size-4" />
            </Button>
          </form>
        </header>

        {open ? (
          <div className="border-b border-border bg-sidebar p-3 lg:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <BrandLogo href="/" size="sm" onLight />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Închide meniul"
              >
                <X className="size-4" />
              </Button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive(item)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
