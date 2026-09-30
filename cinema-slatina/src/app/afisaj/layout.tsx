import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Afișaj",
  // pagina e pentru televizoarele din cinematograf, nu pentru Google
  robots: { index: false, follow: false },
};

/** Pagina de afișaj ocupă tot ecranul: fără antet, subsol sau insigne. */
export default function DisplayLayout({ children }: LayoutProps<"/afisaj">) {
  return (
    <div className="tv-root fixed inset-0 overflow-hidden text-white [scrollbar-width:none]">
      {children}
    </div>
  );
}
