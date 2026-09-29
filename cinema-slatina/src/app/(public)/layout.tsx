import { BorderGlowTracker } from "@/components/motion/border-glow";
import { CredFloat } from "@/components/motion/cred-float";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ClosureBanner } from "@/components/site/closure-banner";
import { getCurrentUser } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/constants";
import { getActiveClosure, getSettings } from "@/server/queries";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [user, closure, settings] = await Promise.all([
    getCurrentUser(),
    getActiveClosure(),
    getSettings(),
  ]);
  const announcement = settings[SETTING_KEYS.ANNOUNCEMENT]?.trim();

  return (
    <>
      <div className="glow-backdrop" aria-hidden="true" />
      <BorderGlowTracker />
      <CredFloat />
      <SiteHeader />
      {closure ? <ClosureBanner closure={closure} /> : null}
      {announcement ? (
        <div className="border-b border-brand-orange/25 bg-brand-orange/10">
          <p className="mx-auto w-full max-w-6xl px-4 py-2.5 text-sm text-brand-orange sm:px-6">
            {announcement}
          </p>
        </div>
      ) : null}
      <main className="flex-1">{children}</main>
      <SiteFooter
        user={user ? { role: user.role } : null}
      />
    </>
  );
}
