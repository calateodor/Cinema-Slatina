import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo, CityCrest } from "@/components/site/brand";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Autentificare personal",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));

  return (
    <div className="screen-grain flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Înapoi pe site
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
        <BrandLogo href={null} size="lg" />
        <h1 className="display mt-5 text-2xl">Acces personal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Zona de administrare și casierie a cinematografului.
        </p>

        <LoginForm />
      </div>

      <CityCrest className="mt-10 opacity-60" />
    </div>
  );
}
