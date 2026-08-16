// The Prisma half of the blog's read path. Kept apart from shape.js so that
// module stays loadable with no database and no bundler.

import { prisma } from "@/lib/prisma";

// LISTING COLUMNS ONLY. `contentHtml` is @db.LongText and the /blog card renders
// none of it — not even a reading time — so selecting it would drag every
// article body across the wire to render a grid of excerpts.
export const listSyncedPosts = () =>
  prisma.substackPost.findMany({
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      coverImage: true,
      publishedAt: true,
      sourceUrl: true,
    },
  });

export const findSyncedPost = (slug) =>
  prisma.substackPost.findUnique({ where: { slug } });
