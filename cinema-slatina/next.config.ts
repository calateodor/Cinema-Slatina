import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Postere și imagini de fundal preluate automat după link-ul de IMDb.
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
