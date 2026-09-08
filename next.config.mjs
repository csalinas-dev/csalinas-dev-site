/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.graphassets.com",
      },
    ],
  },
  redirects: () => [
    {
      source: "/wordleverse",
      destination: "/games/wordleverse",
      permanent: true,
    },
    {
      source: "/hashtag",
      destination: "/games/hashtag",
      permanent: true,
    },
    // /games/mini-motorways was a Hygraph-backed page that no longer has a
    // CMS to read from. The stats live under /gaming now.
    {
      source: "/games/mini-motorways",
      destination: "/gaming/mini-motorways",
      permanent: true,
    },
  ],
};

export default nextConfig;
