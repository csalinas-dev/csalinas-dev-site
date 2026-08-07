import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "mdx" is here for the *aliasing*, not for routing. Next builds
  // `aliasCodeConditionTest` as [codeCondition.test, pageExtensionsRegex], and
  // codeCondition.test only covers js/jsx/ts/tsx/cjs/mjs — so without "mdx" a
  // .mdx module in the React Server Components layer never picks up Next's
  // vendored React aliases and resolves the *client* react/jsx-dev-runtime
  // against the react-server build of react. That crashes every post in dev
  // with "Cannot read properties of undefined (reading
  // 'recentlyCreatedOwnerStacks')". No route is created by this: the blog's
  // .mdx files live in src/content/, and only page/layout/route files are
  // routed out of src/app/.
  // (The rest of the list is Next's default, kept verbatim.)
  pageExtensions: ["tsx", "ts", "jsx", "js", "mdx"],
  images: {
    remotePatterns: [
      {
        // Still used by /games/mini-motorways, which reads from Hygraph.
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
    {
      source: "/projects",
      destination: "/blog",
      permanent: true,
    },
    {
      source: "/projects/:slug",
      destination: "/blog/:slug",
      permanent: true,
    },
  ],
};

// If --turbopack is ever added to the dev/build scripts, remarkPlugins must
// become the string form (["remark-gfm"]) — Turbopack cannot serialize a JS
// function across its config boundary.
const withMDX = createMDX({ options: { remarkPlugins: [remarkGfm] } });

export default withMDX(nextConfig);
