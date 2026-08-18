"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Menu, Ticket, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/program", label: "Program" },
  { href: "/filme", label: "Filme" },
  { href: "/bar", label: "Bar" },
  { href: "/regulament", label: "Regulament" },
  { href: "/contact", label: "Contact" },
];

export type HeaderUser = { fullName: string; role: string } | null;

export function SiteHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accountHref = user
    ? user.role === "ADMIN"
      ? "/admin"
      : "/casierie"
    : "/autentificare";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-xl"
          : "border-transparent bg-background/40 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-4 px-4 sm:h-26 sm:px-6">
        <BrandLogo />

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-brand-yellow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-brand-yellow" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Button
            asChild
            className="rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_var(--brand-orange)] hover:bg-brand-orange-deep sm:px-5"
          >
            <Link href="/program">
              <Ticket data-icon="inline-start" />
              <span className="hidden sm:inline">Rezervă gratuit</span>
              <span className="sm:hidden">Rezervă</span>
            </Link>
          </Button>

          <Link
            href={accountHref}
            className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-left transition-colors hover:border-brand-yellow/40 hover:bg-secondary md:flex"
          >
            <UserRound className="size-4 text-muted-foreground" />
            <span className="leading-tight">
              <span className="block text-xs font-semibold">
                {user ? user.fullName : "Autentificare"}
              </span>
              <span className="block text-[0.68rem] text-muted-foreground">
                {user
                  ? user.role === "ADMIN"
                    ? "Administrare"
                    : "Casierie"
                  : "Personal cinema"}
              </span>
            </span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full lg:hidden"
                aria-label="Deschide meniul"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm">
              <SheetHeader>
                <SheetTitle asChild>
                  <BrandLogo href={null} size="sm" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium transition-colors hover:bg-secondary"
                  >
                    {item.label}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
                <Link
                  href={accountHref}
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center justify-between rounded-xl border border-border px-3 py-3 text-base font-medium"
                >
                  {user ? user.fullName : "Autentificare personal"}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
