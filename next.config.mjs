/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.graphassets.com",
        port: "",
        pathname: "/*",
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
  ],
};

export default nextConfig;
