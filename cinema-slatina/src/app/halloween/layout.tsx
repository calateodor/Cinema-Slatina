import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Afișaj de Halloween (probă)",
  robots: { index: false, follow: false },
};

/** Proba temei de Halloween: aceleași pagini ca /afisaj, pe tot ecranul. */
export default function HalloweenLayout({ children }: LayoutProps<"/halloween">) {
  return (
    <div className="tv-root fixed inset-0 overflow-hidden text-white [scrollbar-width:none]" tabIndex={-1}>
      {children}
    </div>
  );
}
