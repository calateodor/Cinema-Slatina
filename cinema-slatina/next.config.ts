import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 e pentru imaginile mari de pe afișajul televizoarelor
    qualities: [75, 90],
    remotePatterns: [
      // Postere și imagini de fundal preluate automat după link-ul de IMDb.
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // Lista separată de filme dubla programul; fișele filmelor (/filme/[slug])
  // rămân, iar vechiul link duce la program.
  async redirects() {
    return [
      { source: "/filme", destination: "/program", permanent: false },
      // adrese scurte pentru televizoare, ușor de tastat cu telecomanda
      { source: "/tv", destination: "/afisaj", permanent: false },
      { source: "/tv/:hall", destination: "/afisaj/:hall", permanent: false },
    ];
  },
};

export default nextConfig;
