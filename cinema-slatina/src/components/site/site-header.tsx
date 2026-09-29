"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Menu, Ticket } from "lucide-react";
import { BrandLogo } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CINEMA } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/program", label: "Program" },
  { href: "/filme", label: "Filme" },
  { href: "/bar", label: "Bar" },
  { href: "/regulament", label: "Regulament" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? // pe telefon fundal plin: blur-ul peste pagina care derulează e scump
            "border-border bg-background/95 lg:bg-background/85 lg:backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center gap-3 px-4 sm:h-32 sm:gap-4 sm:px-6">
        <BrandLogo />

        {/* Numele cinematografului lângă siglă, ca la site-ul CSM: rândul mic
            spațiat, dedesubt numele mare. */}
        <Link href="/" className="hidden leading-none sm:block" tabIndex={-1}>
          <span className="block text-[0.68rem] font-semibold tracking-[0.28em] text-brand-yellow">
            CINEMA
          </span>
          <span className="display mt-1 block whitespace-nowrap text-[1.2rem] tracking-[0.04em] text-white">
            EUGEN IONESCU
          </span>
        </Link>

        <div className="ml-auto flex flex-col items-end gap-1">
          <p className="ticket hidden text-sm tracking-[0.2em] text-brand-yellow xl:block">
            INTRARE GRATUITĂ · {CINEMA.hours.toUpperCase()}
          </p>
          <div className="flex items-center gap-2">
        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-brand-yellow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-yellow" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 xl:ml-2">
          <Button
            asChild
            className="glow-yellow rounded-full bg-primary px-3 font-semibold text-primary-foreground hover:bg-brand-yellow-soft sm:px-5"
          >
            <Link href="/program">
              <Ticket data-icon="inline-start" />
              Rezervă gratuit
            </Link>
          </Button>


          {/* „Cred în Slatina” și stema Primăriei, în capătul barei, ca la CSM. */}
          <div className="flex items-center gap-1.5 sm:gap-2 xl:ml-2">
            <Image
              src="/brand/cred-in-slatina.png"
              alt="Cred în Slatina"
              width={462}
              height={503}
              priority
              className="h-9 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-11"
            />
            <Image
              src="/brand/primaria-slatina.png"
              alt="Stema Municipiului Slatina"
              width={404}
              height={600}
              priority
              className="h-9 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-11"
            />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full xl:hidden"
                aria-label="Deschide meniul"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm">
              <SheetHeader>
                <SheetTitle asChild>
                  <BrandLogo href={null} size="sm" className="self-start" />
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
          </div>
        </div>
      </div>
    </header>
  );
}
