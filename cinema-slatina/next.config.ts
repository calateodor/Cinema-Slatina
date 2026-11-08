import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Versiunea cu care s-a construit pagina, scrisă în codul televizoarelor
  // (aceeași valoare o dă /api/versiune). Vezi `watchNewVersion`.
  env: {
    PAGE_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local",
  },
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
  // Trailerele televizoarelor: numele fișierului conține id-ul YouTube, deci
  // conținutul nu se schimbă niciodată; cutiile și CDN-ul le pot păstra.
  async headers() {
    return [
      {
        source: "/trailere/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
