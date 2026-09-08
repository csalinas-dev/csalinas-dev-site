// The Prisma half of the sync's storage seam.
//
// Deliberately four thin methods and nothing else: sync.js decides what to
// write, this decides how. The verify script substitutes an in-memory object
// with the same four methods, which is what lets the whole pipeline be exercised
// with no database.
//
// There is no delete path here, on purpose. Substack's RSS window shows only the
// most recent ~20 posts, so "not in the feed" means "old", never "removed".

import { prisma } from "@/lib/prisma";

export const prismaStore = {
  // THREE COLUMNS ONLY. `contentHtml` is @db.LongText; pulling every post's
  // article body on every sync just to compare a 64-character hash is the
  // obvious wrong turn here.
  findBySourceIds: (ids) =>
    ids.length === 0
      ? Promise.resolve([])
      : prisma.substackPost.findMany({
          where: { sourceId: { in: ids } },
          select: { sourceId: true, slug: true, contentHash: true },
        }),

  findBySlug: (slug) => prisma.substackPost.findUnique({ where: { slug }, select: { sourceId: true } }),

  create: (record) => prisma.substackPost.create({ data: record }),

  update: (sourceId, patch) => prisma.substackPost.update({ where: { sourceId }, data: patch }),
};
