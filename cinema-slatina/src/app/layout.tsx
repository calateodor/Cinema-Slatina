import type { Metadata, Viewport } from "next";
import { Sora, Bebas_Neue, Alfa_Slab_One } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/** Fontul de afis din materialele tiparite ale cinematografului (CHESTII.png). */
const alfa = Alfa_Slab_One({
  variable: "--font-alfa",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: 'Cinema "Eugen Ionescu" Slatina — Program și rezervări',
    template: '%s — Cinema "Eugen Ionescu" Slatina',
  },
  description:
    'Programul săptămânii, filmele și rezervările gratuite la Cinema "Eugen Ionescu" din Slatina. Intrare liberă, zilnic 14:00 – 22:00.',
  openGraph: {
    type: "website",
    locale: "ro_RO",
    siteName: 'Cinema "Eugen Ionescu" Slatina',
  },
  icons: { icon: "/brand/cinema-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className={`${sora.variable} ${bebas.variable} ${alfa.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
